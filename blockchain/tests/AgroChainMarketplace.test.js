import { expect } from "chai";
import hre from "hardhat";

describe("AgroChainMarketplace", function () {
  let ethers;
  let owner;
  let producer;
  let buyer;
  let other;
  let mockUSDC;
  let payments;
  let smartLot;
  let marketplace;

  const BATCH_COFFEE = 0;
  const STATUS_ACTIVE = 0n;
  const STATUS_SOLD = 1n;
  const OFFER_PENDING = 0n;
  const OFFER_ACCEPTED = 1n;
  const OFFER_CANCELLED = 3n;
  const OFFER_FUNDED = 4n;
  const OFFER_REFUNDED = 6n;
  const WEIGHT_KG = 1000n;
  const PRICE_PER_KG = 500000000000000000n; // 0.5 token / kg
  const BUYER_FUNDS = 100000000000000000000000n; // 100000 tokens
  const OFFER_QUANTITY = 100n;
  const OFFER_TOTAL = OFFER_QUANTITY * PRICE_PER_KG;

  before(async function () {
    ({ ethers } = await hre.network.create());
  });

  beforeEach(async function () {
    [owner, producer, buyer, other] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy();

    const AgroChainPayments = await ethers.getContractFactory("AgroChainPayments");
    payments = await AgroChainPayments.deploy();

    const SmartLot = await ethers.getContractFactory("SmartLot");
    smartLot = await SmartLot.deploy(await payments.getAddress());

    const Marketplace = await ethers.getContractFactory("AgroChainMarketplace");
    marketplace = await Marketplace.deploy(
      await payments.getAddress(),
      await smartLot.getAddress(),
      owner.address
    );

    await mockUSDC.mint(buyer.address, BUYER_FUNDS);
    await mockUSDC
      .connect(buyer)
      .approve(await marketplace.getAddress(), BUYER_FUNDS);
  });

  async function registerLot() {
    const tx = await smartLot
      .connect(producer)
      .registerLot("2025/2026", "Fazenda Sao Benedito - MG", 15000n, 1700000000n);
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

  async function createListing(weight = WEIGHT_KG, price = PRICE_PER_KG) {
    const lotId = await registerLot();
    await marketplace
      .connect(producer)
      .createListing(
        lotId,
        BATCH_COFFEE,
        weight,
        price,
        await mockUSDC.getAddress(),
        "Brasil",
        "2025/2026"
      );
    return await marketplace.listingCounter();
  }

  async function makeOffer(listingId, quantity = OFFER_QUANTITY, price = PRICE_PER_KG) {
    await marketplace.connect(buyer).makeOffer(listingId, quantity, price);
    return await marketplace.offerCounter();
  }

  async function acceptOffer(offerId) {
    await marketplace.connect(producer).acceptOffer(offerId);
  }

  async function advanceTime(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("hardhat_mine", ["0x1"]);
  }

  describe("Deployment", function () {
    it("Should store contract references and feeRecipient", async function () {
      expect(await marketplace.agroChainPayments()).to.equal(await payments.getAddress());
      expect(await marketplace.smartLot()).to.equal(await smartLot.getAddress());
      expect(await marketplace.feeRecipient()).to.equal(owner.address);
    });

    it("Should revert on zero payments address", async function () {
      const Marketplace = await ethers.getContractFactory("AgroChainMarketplace");
      await expect(
        Marketplace.deploy(ethers.ZeroAddress, await smartLot.getAddress(), owner.address)
      ).to.be.revertedWith("AgroChainMarketplace: Endereco AgroChainPayments invalido");
    });

    it("Should revert on zero smartLot address", async function () {
      const Marketplace = await ethers.getContractFactory("AgroChainMarketplace");
      await expect(
        Marketplace.deploy(await payments.getAddress(), ethers.ZeroAddress, owner.address)
      ).to.be.revertedWith("AgroChainMarketplace: Endereco SmartLot invalido");
    });

    it("Should revert on zero feeRecipient address", async function () {
      const Marketplace = await ethers.getContractFactory("AgroChainMarketplace");
      await expect(
        Marketplace.deploy(await payments.getAddress(), await smartLot.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith("AgroChainMarketplace: Endereco feeRecipient invalido");
    });
  });

  describe("createListing", function () {
    it("Should create an ACTIVE listing owned by the producer", async function () {
      const id = await createListing();
      const listing = await marketplace.getListing(id);

      expect(listing.seller).to.equal(producer.address);
      expect(listing.weightKg).to.equal(WEIGHT_KG);
      expect(listing.weightSoldKg).to.equal(0n);
      expect(listing.pricePerKg).to.equal(PRICE_PER_KG);
      expect(listing.status).to.equal(STATUS_ACTIVE);
    });

    it("Should revert when caller is not the lot producer", async function () {
      const lotId = await registerLot();
      await expect(
        marketplace
          .connect(other)
          .createListing(lotId, BATCH_COFFEE, WEIGHT_KG, PRICE_PER_KG, await mockUSDC.getAddress(), "BR", "S")
      ).to.be.revertedWith("AgroChainMarketplace: Apenas o produtor do lote pode criar listagem");
    });

    it("Should revert on zero weight", async function () {
      const lotId = await registerLot();
      await expect(
        marketplace
          .connect(producer)
          .createListing(lotId, BATCH_COFFEE, 0n, PRICE_PER_KG, await mockUSDC.getAddress(), "BR", "S")
      ).to.be.revertedWith("AgroChainMarketplace: Peso deve ser maior que zero");
    });

    it("Should revert when weight exceeds MAX_QUANTITY_KG", async function () {
      const max = await marketplace.MAX_QUANTITY_KG();
      const lotId = await registerLot();
      await expect(
        marketplace
          .connect(producer)
          .createListing(lotId, BATCH_COFFEE, max + 1n, PRICE_PER_KG, await mockUSDC.getAddress(), "BR", "S")
      ).to.be.revertedWith("AgroChainMarketplace: Peso excede o limite maximo");
    });

    it("Should revert when price exceeds MAX_PRICE_PER_KG", async function () {
      const max = await marketplace.MAX_PRICE_PER_KG();
      const lotId = await registerLot();
      await expect(
        marketplace
          .connect(producer)
          .createListing(lotId, BATCH_COFFEE, WEIGHT_KG, max + 1n, await mockUSDC.getAddress(), "BR", "S")
      ).to.be.revertedWith("AgroChainMarketplace: Preco excede o limite maximo");
    });
  });

  describe("makeOffer", function () {
    it("Should create a PENDING offer with total price and expiration", async function () {
      const listingId = await createListing();
      const offerId = await makeOffer(listingId);
      const offer = await marketplace.getOffer(offerId);

      expect(offer.buyer).to.equal(buyer.address);
      expect(offer.quantityKg).to.equal(OFFER_QUANTITY);
      expect(offer.pricePerKg).to.equal(PRICE_PER_KG);
      expect(offer.totalPrice).to.equal(OFFER_TOTAL);
      expect(offer.status).to.equal(OFFER_PENDING);
      expect(offer.expiresAt).to.be.greaterThan(offer.createdAt);
    });

    it("Should revert when the seller bids on their own listing", async function () {
      const listingId = await createListing();
      await expect(
        marketplace.connect(producer).makeOffer(listingId, OFFER_QUANTITY, PRICE_PER_KG)
      ).to.be.revertedWith("AgroChainMarketplace: Vendedor nao pode fazer oferta no seu proprio anuncio");
    });

    it("Should revert when quantity exceeds available weight", async function () {
      const listingId = await createListing(WEIGHT_KG, PRICE_PER_KG);
      await expect(
        marketplace.connect(buyer).makeOffer(listingId, WEIGHT_KG + 1n, PRICE_PER_KG)
      ).to.be.revertedWith("AgroChainMarketplace: Quantidade nao disponivel");
    });

    it("Should revert when quantity exceeds MAX_QUANTITY_KG", async function () {
      const listingId = await createListing(WEIGHT_KG, PRICE_PER_KG);
      const max = await marketplace.MAX_QUANTITY_KG();
      await expect(
        marketplace.connect(buyer).makeOffer(listingId, max + 1n, PRICE_PER_KG)
      ).to.be.revertedWith("AgroChainMarketplace: Quantidade excede o limite maximo");
    });

    it("Should revert when price exceeds MAX_PRICE_PER_KG", async function () {
      const listingId = await createListing(WEIGHT_KG, PRICE_PER_KG);
      const max = await marketplace.MAX_PRICE_PER_KG();
      await expect(
        marketplace.connect(buyer).makeOffer(listingId, OFFER_QUANTITY, max + 1n)
      ).to.be.revertedWith("AgroChainMarketplace: Preco excede o limite maximo");
    });
  });

  describe("acceptOffer", function () {
    it("Should accept a pending offer, reserve weight and create a payment order", async function () {
      const listingId = await createListing();
      const offerId = await makeOffer(listingId);
      await acceptOffer(offerId);

      const offer = await marketplace.getOffer(offerId);
      expect(offer.status).to.equal(OFFER_ACCEPTED);
      expect(offer.orderId).to.equal(1n);

      const listing = await marketplace.getListing(listingId);
      expect(listing.weightSoldKg).to.equal(OFFER_QUANTITY);
    });

    it("Should mark the listing as SOLD when fully committed", async function () {
      const listingId = await createListing(WEIGHT_KG, PRICE_PER_KG);
      const offerId = await makeOffer(listingId, WEIGHT_KG, PRICE_PER_KG);
      await acceptOffer(offerId);

      const listing = await marketplace.getListing(listingId);
      expect(listing.weightSoldKg).to.equal(WEIGHT_KG);
      expect(listing.status).to.equal(STATUS_SOLD);
    });

    it("Should revert when caller is not the seller", async function () {
      const listingId = await createListing();
      const offerId = await makeOffer(listingId);
      await expect(
        marketplace.connect(buyer).acceptOffer(offerId)
      ).to.be.revertedWith("AgroChainMarketplace: Apenas o vendedor pode aceitar ofertas");
    });

    it("Should revert when the offer has expired", async function () {
      const listingId = await createListing();
      const offerId = await makeOffer(listingId);
      await advanceTime(48 * 3600 + 1);
      await expect(
        marketplace.connect(producer).acceptOffer(offerId)
      ).to.be.revertedWith("AgroChainMarketplace: Oferta expirou");
    });

    it("Should revert when the offer is not PENDING", async function () {
      const listingId = await createListing();
      const offerId = await makeOffer(listingId);
      await acceptOffer(offerId);
      await expect(
        marketplace.connect(producer).acceptOffer(offerId)
      ).to.be.revertedWith("AgroChainMarketplace: Oferta nao esta PENDING");
    });
  });

  describe("depositOfferEscrow", function () {
    let offerId;

    beforeEach(async function () {
      const listingId = await createListing();
      offerId = await makeOffer(listingId);
      await acceptOffer(offerId);
    });

    it("Should pull tokens from the buyer into escrow and mark the offer FUNDED", async function () {
      await marketplace.connect(buyer).depositOfferEscrow(offerId);

      const offer = await marketplace.getOffer(offerId);
      expect(offer.status).to.equal(OFFER_FUNDED);
      expect(await mockUSDC.balanceOf(await payments.getAddress())).to.equal(OFFER_TOTAL);
      expect(await mockUSDC.balanceOf(await marketplace.getAddress())).to.equal(0n);
    });

    it("Should revert when caller is not the buyer", async function () {
      await expect(
        marketplace.connect(other).depositOfferEscrow(offerId)
      ).to.be.revertedWith("AgroChainMarketplace: Apenas o comprador pode financiar o escrow");
    });

    it("Should revert when the offer is already funded", async function () {
      await marketplace.connect(buyer).depositOfferEscrow(offerId);
      await expect(
        marketplace.connect(buyer).depositOfferEscrow(offerId)
      ).to.be.revertedWith("AgroChainMarketplace: Oferta nao esta aguardando financiamento");
    });
  });

  describe("releaseOfferEscrow", function () {
    let offerId;

    beforeEach(async function () {
      const listingId = await createListing();
      offerId = await makeOffer(listingId);
      await acceptOffer(offerId);
    });

    it("Should transfer the total price to the seller and complete the offer", async function () {
      await marketplace.connect(buyer).depositOfferEscrow(offerId);
      const before = await mockUSDC.balanceOf(producer.address);

      await marketplace.connect(buyer).releaseOfferEscrow(offerId);

      expect(await mockUSDC.balanceOf(producer.address)).to.equal(before + OFFER_TOTAL);
      expect((await marketplace.getOffer(offerId)).status).to.equal(5n); // COMPLETED
      expect(await payments.getOrderStatus(1n)).to.equal(2n); // ACCEPTED
    });

    it("Should revert when caller is not the buyer", async function () {
      await marketplace.connect(buyer).depositOfferEscrow(offerId);
      await expect(
        marketplace.connect(other).releaseOfferEscrow(offerId)
      ).to.be.revertedWith("AgroChainMarketplace: Apenas o comprador pode liberar o escrow");
    });

    it("Should revert when the offer is not funded", async function () {
      await expect(
        marketplace.connect(buyer).releaseOfferEscrow(offerId)
      ).to.be.revertedWith("AgroChainMarketplace: Oferta nao esta financiada");
    });
  });

  describe("refundOfferEscrow", function () {
    let listingId;
    let offerId;

    beforeEach(async function () {
      listingId = await createListing();
      offerId = await makeOffer(listingId);
      await acceptOffer(offerId);
    });

    it("Should refund the buyer and release the reserved weight", async function () {
      const before = await mockUSDC.balanceOf(buyer.address);
      await marketplace.connect(buyer).depositOfferEscrow(offerId);
      await marketplace.connect(buyer).refundOfferEscrow(offerId);

      expect(await mockUSDC.balanceOf(buyer.address)).to.equal(before);
      expect((await marketplace.getOffer(offerId)).status).to.equal(OFFER_REFUNDED);

      const listing = await marketplace.getListing(listingId);
      expect(listing.weightSoldKg).to.equal(0n);
      expect(listing.status).to.equal(STATUS_ACTIVE);
    });

    it("Should reactivate a listing that had become SOLD", async function () {
      const fullListing = await createListing(WEIGHT_KG, PRICE_PER_KG);
      const fullOffer = await makeOffer(fullListing, WEIGHT_KG, PRICE_PER_KG);
      await acceptOffer(fullOffer);
      expect((await marketplace.getListing(fullListing)).status).to.equal(STATUS_SOLD);

      await marketplace.connect(buyer).depositOfferEscrow(fullOffer);
      await marketplace.connect(buyer).refundOfferEscrow(fullOffer);

      expect((await marketplace.getListing(fullListing)).status).to.equal(STATUS_ACTIVE);
    });

    it("Should revert when caller is not the buyer", async function () {
      await marketplace.connect(buyer).depositOfferEscrow(offerId);
      await expect(
        marketplace.connect(other).refundOfferEscrow(offerId)
      ).to.be.revertedWith("AgroChainMarketplace: Apenas o comprador pode reembolsar o escrow");
    });

    it("Should revert when the offer is not funded", async function () {
      await expect(
        marketplace.connect(buyer).refundOfferEscrow(offerId)
      ).to.be.revertedWith("AgroChainMarketplace: Oferta nao esta financiada");
    });
  });

  describe("cancelAcceptedOffer", function () {
    let listingId;
    let offerId;

    beforeEach(async function () {
      listingId = await createListing();
      offerId = await makeOffer(listingId);
      await acceptOffer(offerId);
    });

    it("Should let the seller release weight on an unfunded accepted offer", async function () {
      await marketplace.connect(producer).cancelAcceptedOffer(offerId);

      expect((await marketplace.getOffer(offerId)).status).to.equal(OFFER_CANCELLED);
      expect((await marketplace.getListing(listingId)).weightSoldKg).to.equal(0n);
    });

    it("Should revert when caller is not the seller", async function () {
      await expect(
        marketplace.connect(buyer).cancelAcceptedOffer(offerId)
      ).to.be.revertedWith("AgroChainMarketplace: Apenas o vendedor pode cancelar a oferta aceita");
    });

    it("Should revert when the offer is already funded", async function () {
      await marketplace.connect(buyer).depositOfferEscrow(offerId);
      await expect(
        marketplace.connect(producer).cancelAcceptedOffer(offerId)
      ).to.be.revertedWith("AgroChainMarketplace: Oferta nao esta aguardando financiamento");
    });
  });

  describe("offer existence guards", function () {
    it("Should revert when operating on a non-existent offer", async function () {
      await expect(
        marketplace.connect(buyer).depositOfferEscrow(999n)
      ).to.be.revertedWith("AgroChainMarketplace: Oferta nao existe");
    });
  });
});
