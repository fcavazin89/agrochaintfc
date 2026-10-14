import { expect } from "chai";
import hre from "hardhat";
import fc from "fast-check";

describe("AgroChainCertNFT", function () {
  let ethers;
  let contract;
  let owner;
  let alice;
  let bob;

  function getMintedTokenId(nft, receipt) {
    for (const log of receipt.logs) {
      try {
        const parsed = nft.interface.parseLog(log);
        if (parsed && parsed.name === "CertificadoMintado") {
          return parsed.args.tokenId;
        }
      } catch {
        // ignore logs from other contracts
      }
    }
    return undefined;
  }

  let nft;

  before(async function () {
    ({ ethers } = await hre.network.create());
  });

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();
    const AgroChainCertNFT = await ethers.getContractFactory("AgroChainCertNFT");
    nft = await AgroChainCertNFT.deploy();
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await nft.name()).to.equal("AgroChain Certificado NFT");
      expect(await nft.symbol()).to.equal("AGCNFT");
    });

    it("Should support ERC721 and ERC721Metadata interfaces", async function () {
      expect(await nft.supportsInterface("0x80ac58cd")).to.equal(true);
      expect(await nft.supportsInterface("0x5b5e139f")).to.equal(true);
    });
  });

  describe("mintCertificado", function () {
    it("Should mint a certificate and store the data", async function () {
      const tx = await nft
        .connect(alice)
        .mintCertificado("BATCH-001", "Coffee", "Arabica", 1000n, "Brasil");
      const receipt = await tx.wait();
      const tokenId = getMintedTokenId(nft, receipt);

      expect(tokenId).to.equal(1n);
      expect(await nft.ownerOf(1n)).to.equal(alice.address);

      const cert = await nft.getCertificado(1n);
      expect(cert.batchId).to.equal("BATCH-001");
      expect(cert.tipo).to.equal("Coffee");
      expect(cert.variedade).to.equal("Arabica");
      expect(cert.pesoKg).to.equal(1000n);
      expect(cert.origem).to.equal("Brasil");
      expect(cert.fazendeiro).to.equal(alice.address);
    });

    it("Should increment token ids across mints", async function () {
      const first = await (
        await nft.connect(alice).mintCertificado("B1", "Coffee", "Arabica", 1n, "BR")
      ).wait();
      const second = await (
        await nft.connect(bob).mintCertificado("B2", "Cacao", "Forastero", 2n, "BR")
      ).wait();
      expect(getMintedTokenId(nft, first)).to.equal(1n);
      expect(getMintedTokenId(nft, second)).to.equal(2n);
      expect(await nft.ownerOf(2n)).to.equal(bob.address);
    });

    it("Should revert when pesoKg is zero", async function () {
      await expect(
        nft.mintCertificado("B1", "Coffee", "Arabica", 0n, "BR")
      ).to.be.revertedWith("AgroChain: pesoKg must be > 0");
    });

    it("Should revert when batchId is empty", async function () {
      await expect(
        nft.mintCertificado("", "Coffee", "Arabica", 1n, "BR")
      ).to.be.revertedWith("AgroChain: batchId required");
    });

    it("Should revert when tipo is not Coffee or Cacao", async function () {
      await expect(
        nft.mintCertificado("B1", "Wheat", "Arabica", 1n, "BR")
      ).to.be.revertedWith("AgroChain: tipo must be Coffee or Cacao");
    });
  });

  describe("tokenURI", function () {
    it("Should return an on-chain base64 metadata URI", async function () {
      const receipt = await (
        await nft.mintCertificado("BATCH-001", "Coffee", "Arabica", 1000n, "Brasil")
      ).wait();
      const tokenId = getMintedTokenId(nft, receipt);

      const uri = await nft.tokenURI(tokenId);
      expect(uri.startsWith("data:application/json;base64,")).to.equal(true);

      const decoded = Buffer.from(
        uri.replace("data:application/json;base64,", ""),
        "base64"
      ).toString("utf-8");
      const metadata = JSON.parse(decoded);
      expect(metadata.name).to.contain("AgroChain Certificado");
      expect(
        metadata.attributes.find((a) => a.trait_type === "Batch ID")?.value
      ).to.equal("BATCH-001");
    });

    it("Should revert for a nonexistent token", async function () {
      await expect(nft.tokenURI(999n)).to.be.revertedWithCustomError(
        nft,
        "ERC721NonexistentToken"
      );
    });
  });

  describe("Properties (fast-check)", function () {
    it("Property 1: round-trip de dados do certificado", async function () {
      const contract = nft;
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            batchId: fc.string({ minLength: 1, maxLength: 64 }),
            tipo: fc.constantFrom("Coffee", "Cacao"),
            variedade: fc.string({ minLength: 1, maxLength: 32 }),
            pesoKg: fc.bigInt({ min: 1n, max: 1_000_000n }),
            origem: fc.string({ minLength: 1, maxLength: 64 }),
          }),
          async ({ batchId, tipo, variedade, pesoKg, origem }) => {
            const tx = await contract.mintCertificado(
              batchId,
              tipo,
              variedade,
              pesoKg,
              origem
            );
            const receipt = await tx.wait();
            const tokenId = getMintedTokenId(nft, receipt);
            const cert = await nft.getCertificado(tokenId);

            expect(cert.batchId).to.equal(batchId);
            expect(cert.tipo).to.equal(tipo);
            expect(cert.variedade).to.equal(variedade);
            expect(cert.pesoKg).to.equal(pesoKg);
            expect(cert.origem).to.equal(origem);
            expect(cert.fazendeiro).to.equal(owner.address);
            expect(cert.timestamp).to.be.greaterThan(0n);
          }
        ),
        { numRuns: 25 }
      );
    });

    it("Should reject invalid tipo for any non-Coffee/Cacao string", async function () {
      await fc.assert(
        fc.asyncProperty(
          fc.string().filter((s) => s !== "Coffee" && s !== "Cacao"),
          async (tipoInvalido) => {
            await expect(
              nft.mintCertificado("B1", tipoInvalido, "Arabica", 1n, "BR")
            ).to.be.revertedWith("AgroChain: tipo must be Coffee or Cacao");
          }
        ),
        { numRuns: 25 }
      );
    });

    it("Should always produce a decodable base64 metadata URI", async function () {
      const jsonSafeString = (maxLength) =>
        fc
          .string({ minLength: 1, maxLength })
          .filter((s) => !/["\\\u0000-\u001f]/.test(s));

      await fc.assert(
        fc.asyncProperty(
          fc.record({
            batchId: jsonSafeString(32),
            tipo: fc.constantFrom("Coffee", "Cacao"),
          }),
          async ({ batchId, tipo }) => {
            const receipt = await (
              await nft.mintCertificado(batchId, tipo, "Arabica", 10n, "BR")
            ).wait();
            const tokenId = getMintedTokenId(nft, receipt);
            const uri = await nft.tokenURI(tokenId);
            expect(uri.startsWith("data:application/json;base64,")).to.equal(true);
            const decoded = Buffer.from(
              uri.replace("data:application/json;base64,", ""),
              "base64"
            ).toString("utf-8");
            const metadata = JSON.parse(decoded);
            expect(
              metadata.attributes.find((a) => a.trait_type === "Batch ID")?.value
            ).to.equal(batchId);
          }
        ),
        { numRuns: 25 }
      );
    });
  });

  describe("getCertificado", function () {
    it("Should revert for a nonexistent token", async function () {
      await expect(nft.getCertificado(999n)).to.be.revertedWith(
        "AgroChain: token does not exist"
      );
    });

    it("Should track ownership across different farmers", async function () {
      await nft.connect(alice).mintCertificado("A1", "Coffee", "Arabica", 1n, "BR");
      await nft.connect(bob).mintCertificado("B1", "Cacao", "Forastero", 1n, "BR");
      expect(await nft.ownerOf(1n)).to.equal(alice.address);
      expect(await nft.ownerOf(2n)).to.equal(bob.address);
    });
  });
});
