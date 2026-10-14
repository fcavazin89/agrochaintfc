import { expect } from "chai";
import hre from "hardhat";

describe("SmartLot", function () {
  let ethers;
  let smartLot;
  let payments;
  let mockUSDC;
  let owner;
  let producer;
  let buyer;

  const SAFRA = "2025/2026";
  const ORIGEM = "Fazenda Sao Benedito - MG";
  const AREA = 15000n; // m2

  async function registerSampleLot() {
    const tx = await smartLot
      .connect(producer)
      .registerLot(SAFRA, ORIGEM, AREA, 1700000000n);
    const receipt = await tx.wait();
    const parsed = receipt.logs
      .map((log) => {
        try {
          return smartLot.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((log) => log && log.name === "LotRegistered");
    return parsed.args.loteId;
  }

  before(async function () {
    ({ ethers } = await hre.network.create());
  });

  beforeEach(async function () {
    [owner, producer, buyer] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();

    const AgroChainPayments = await ethers.getContractFactory("AgroChainPayments");
    payments = await AgroChainPayments.deploy();

    const SmartLot = await ethers.getContractFactory("SmartLot");
    smartLot = await SmartLot.deploy(await payments.getAddress());
  });

  describe("Deployment", function () {
    it("Should store the AgroChainPayments reference", async function () {
      expect(await smartLot.agroChainPayments()).to.equal(await payments.getAddress());
    });

    it("Should revert when payments address is zero", async function () {
      const SmartLot = await ethers.getContractFactory("SmartLot");
      await expect(SmartLot.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "SmartLot: Endereco invalido para AgroChainPayments"
      );
    });
  });

  describe("registerLot", function () {
    it("Should register a lot and emit LotRegistered", async function () {
      const tx = await smartLot
        .connect(producer)
        .registerLot(SAFRA, ORIGEM, AREA, 1700000000n);
      const receipt = await tx.wait();
      const parsed = receipt.logs
        .map((log) => {
          try {
            return smartLot.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((log) => log && log.name === "LotRegistered");

      expect(parsed).to.not.be.undefined;
      expect(parsed.args.produtor).to.equal(producer.address);
      expect(parsed.args.safra).to.equal(SAFRA);

      const lot = await smartLot.getLot(parsed.args.loteId);
      expect(lot.produtor).to.equal(producer.address);
      expect(lot.origem).to.equal(ORIGEM);
      expect(lot.area).to.equal(AREA);
      expect(lot.status).to.equal(0n); // REGISTERED
    });

    it("Should revert on empty safra", async function () {
      await expect(
        smartLot.connect(producer).registerLot("", ORIGEM, AREA, 1700000000n)
      ).to.be.revertedWith("SmartLot: Safra nao pode estar vazia");
    });

    it("Should revert when area is zero", async function () {
      await expect(
        smartLot.connect(producer).registerLot(SAFRA, ORIGEM, 0n, 1700000000n)
      ).to.be.revertedWith("SmartLot: Area deve ser maior que zero");
    });
  });

  describe("addEvent", function () {
    it("Should allow the producer to add events", async function () {
      const loteId = await registerSampleLot();

      await smartLot
        .connect(producer)
        .addEvent(loteId, "Plantio", "Plantio de mudas", "Talhao A");

      expect(await smartLot.getEventCount(loteId)).to.equal(1n);
      const event = await smartLot.getFunction("getEvent")(loteId, 0);
      expect(event.eventType).to.equal("Plantio");
      expect(event.recorder).to.equal(producer.address);
    });

    it("Should revert when a non-producer adds an event", async function () {
      const loteId = await registerSampleLot();

      await expect(
        smartLot.connect(buyer).addEvent(loteId, "Plantio", "x", "y")
      ).to.be.revertedWith("SmartLot: Apenas o produtor pode executar esta acao");
    });
  });

  describe("addCertification", function () {
    it("Should add a certification and upgrade status to CERTIFIED", async function () {
      const loteId = await registerSampleLot();

      await smartLot
        .connect(producer)
        .addCertification(loteId, "Organico", "ipfs://proof");

      expect(await smartLot.getCertificationCount(loteId)).to.equal(1n);
      const lot = await smartLot.getLot(loteId);
      expect(lot.status).to.equal(1n); // CERTIFIED
    });
  });

  describe("transferLot", function () {
    it("Should revert when the payment order is not ACCEPTED", async function () {
      const loteId = await registerSampleLot();

      const orderId = 1n; // no order created; getOrderStatus will revert
      await expect(
        smartLot.connect(producer).transferLot(loteId, buyer.address, orderId)
      ).to.be.revert(ethers);
    });

    it("Should transfer the lot after payment is ACCEPTED", async function () {
      const loteId = await registerSampleLot();

      const amount = 1500n * 10n ** 18n;
      await mockUSDC.mint(buyer.address, amount);

      await payments
        .connect(buyer)
        .createOrder(producer.address, "LOT-2026-001", amount, await mockUSDC.getAddress());
      const orderId = 1n;

      // Before acceptance the transfer must fail
      await expect(
        smartLot.connect(producer).transferLot(loteId, buyer.address, orderId)
      ).to.be.revertedWith("SmartLot: Pagamento nao foi aceito. Apenas ordens ACCEPTED podem transferir lotes");

      await mockUSDC.connect(buyer).approve(await payments.getAddress(), amount);
      await payments.connect(buyer).depositEscrow(orderId);
      await payments.connect(buyer).acceptOrder(orderId);

      expect(await payments.getOrderStatus(orderId)).to.equal(2n); // ACCEPTED

      await smartLot.connect(producer).transferLot(loteId, buyer.address, orderId);

      const lot = await smartLot.getLot(loteId);
      expect(lot.produtor).to.equal(buyer.address);
      expect(lot.status).to.equal(2n); // TRANSFERRED
    });
  });

  describe("view helpers", function () {
    it("Should revert when reading a non-existent lot", async function () {
      await expect(smartLot.getLot("0x" + "00".repeat(32))).to.be.revertedWith(
        "SmartLot: Lote nao existe"
      );
    });
  });
});
