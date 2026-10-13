// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgroChain Certificado NFT
/// @notice ERC721 para certificados de lote Coffee e Cacao com dados on-chain
contract AgroChainCertNFT is ERC721, ERC721URIStorage, Ownable {

    struct Certificado {
        string  batchId;
        string  tipo;
        string  variedade;
        uint256 pesoKg;
        string  origem;
        address fazendeiro;
        uint256 timestamp;
    }

    uint256 private _tokenIdCounter;
    mapping(uint256 => Certificado) public certificados;

    event CertificadoMintado(
        uint256 indexed tokenId,
        address indexed fazendeiro,
        string  batchId
    );

    constructor() ERC721("AgroChain Certificado NFT", "AGCNFT") Ownable(msg.sender) {}

    /// @notice Minta um certificado NFT para um lote de Coffee ou Cacao
    function mintCertificado(
        string calldata batchId,
        string calldata tipo,
        string calldata variedade,
        uint256 pesoKg,
        string calldata origem
    ) external returns (uint256 tokenId) {
        require(bytes(batchId).length > 0, "AgroChain: batchId required");
        require(pesoKg > 0, "AgroChain: pesoKg must be > 0");
        require(
            keccak256(bytes(tipo)) == keccak256(bytes("Coffee")) ||
            keccak256(bytes(tipo)) == keccak256(bytes("Cacao")),
            "AgroChain: tipo must be Coffee or Cacao"
        );

        tokenId = ++_tokenIdCounter;

        certificados[tokenId] = Certificado({
            batchId:    batchId,
            tipo:       tipo,
            variedade:  variedade,
            pesoKg:     pesoKg,
            origem:     origem,
            fazendeiro: msg.sender,
            timestamp:  block.timestamp
        });

        _safeMint(msg.sender, tokenId);
        // tokenURI can be set later via setTokenURI by owner, or queried via getCertificado
        emit CertificadoMintado(tokenId, msg.sender, batchId);
    }

    /// @notice Permite ao owner configurar o tokenURI (ex: IPFS ou data URI)
    function setTokenURI(uint256 tokenId, string calldata uri) external onlyOwner {
        _setTokenURI(tokenId, uri);
    }

    /// @notice Retorna todos os dados do certificado armazenados on-chain
    function getCertificado(uint256 tokenId) external view returns (Certificado memory) {
        require(_ownerOf(tokenId) != address(0), "AgroChain: token does not exist");
        return certificados[tokenId];
    }

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
