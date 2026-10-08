// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Capped} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IAgroChainGroth16Verifier} from "./IAgroChainGroth16Verifier.sol";
import {IAgroChainRegistro} from "./IAgroChainRegistro.sol";

/// @title AgroChainCertificacoes
/// @notice Certificados de lote com prova ZK Groth16, NFT intransferível e
///         recompensa fungível AGRO com emissão e teto imutáveis.
/// @dev A certificadora autorizada continua responsável pela veracidade dos
///      documentos e do score originalmente comprometido. O circuito só prova
///      que o score privado correspondente ao compromisso atinge o limite.
contract AgroChainCertificacoes is ERC721URIStorage, Ownable, ReentrancyGuard {
    struct ProvaGroth16 {
        uint256[2] a;
        uint256[2][2] b;
        uint256[2] c;
    }

    struct PedidoCertificacao {
        bytes32 id;
        bytes32 loteId;
        bytes32 padraoHash;
        bytes32 hashLaudo;
        bytes32 compromissoScore;
        string tipo;
        uint64 validoAte;
        uint8 notaMinima;
        address titular;
        string tokenURI;
    }

    struct RegistroCertificacao {
        bytes32 loteId;
        bytes32 padraoHash;
        bytes32 hashLaudo;
        bytes32 compromissoScore;
        address emissor;
        uint64 validoAte;
        uint8 notaMinima;
        bool ativa;
    }

    IAgroChainGroth16Verifier public immutable verificadorZK;
    IAgroChainRegistro public immutable registroAgroChain;
    AgroChainUtilityToken public immutable tokenAgro;
    uint256 public immutable recompensaPorCertificacao;

    uint256 public proximoNftId = 1;
    mapping(address => bool) public certificadorasAutorizadas;
    mapping(bytes32 => RegistroCertificacao) public certificacoes;
    mapping(bytes32 => uint256) public tokenIdPorCertificacao;
    mapping(bytes32 => bool) public compromissoJaCertificado;

    event CertificadoraAutorizada(address indexed certificadora, bool autorizada);
    event CertificacaoEmitida(
        bytes32 indexed id,
        bytes32 indexed loteId,
        bytes32 indexed padraoHash,
        bytes32 compromissoScore,
        bytes32 hashLaudo,
        uint8 notaMinima,
        uint64 validoAte,
        address titular,
        address emissor,
        uint256 nftId,
        uint256 recompensaAgro
    );
    event CertificacaoRevogada(bytes32 indexed id, address indexed responsavel, bytes32 motivoHash);

    error ApenasCertificadora();
    error PedidoInvalido();
    error CertificadoExistente();
    error ProvaZKNaoConfere();
    error CertificadoInativo();
    error ApenasEmissorOuAdmin();
    error NFTIntransferivel();

    constructor(
        address verificador,
        address registro,
        address certificadoraInicial,
        uint256 recompensa,
        uint256 limiteTotalToken
    ) ERC721("AgroChain Certificacao", "AGCERT") Ownable(msg.sender) {
        if (
            verificador == address(0) ||
            registro == address(0) ||
            certificadoraInicial == address(0) ||
            recompensa == 0 ||
            limiteTotalToken < recompensa
        ) revert PedidoInvalido();

        verificadorZK = IAgroChainGroth16Verifier(verificador);
        registroAgroChain = IAgroChainRegistro(registro);
        recompensaPorCertificacao = recompensa;
        tokenAgro = new AgroChainUtilityToken(limiteTotalToken);
        certificadorasAutorizadas[certificadoraInicial] = true;
        emit CertificadoraAutorizada(certificadoraInicial, true);
    }

    modifier apenasCertificadora() {
        if (!certificadorasAutorizadas[msg.sender]) revert ApenasCertificadora();
        _;
    }

    function autorizarCertificadora(address certificadora, bool autorizada) external onlyOwner {
        if (certificadora == address(0)) revert PedidoInvalido();
        certificadorasAutorizadas[certificadora] = autorizada;
        emit CertificadoraAutorizada(certificadora, autorizada);
    }

    /// @notice Emite a certificação apenas quando o Groth16 valida o score
    ///         privado comprometido e seu atendimento à nota mínima publicada.
    function emitirCertificacao(
        PedidoCertificacao calldata pedido,
        ProvaGroth16 calldata prova
    ) external apenasCertificadora nonReentrant returns (uint256 nftId) {
        if (
            pedido.id == bytes32(0) ||
            pedido.loteId == bytes32(0) ||
            pedido.padraoHash == bytes32(0) ||
            pedido.hashLaudo == bytes32(0) ||
            pedido.compromissoScore == bytes32(0) ||
            bytes(pedido.tipo).length == 0 ||
            pedido.titular == address(0) ||
            bytes(pedido.tokenURI).length == 0 ||
            pedido.validoAte <= block.timestamp ||
            pedido.notaMinima > 100
        ) revert PedidoInvalido();

        if (certificacoes[pedido.id].ativa || certificacoes[pedido.id].emissor != address(0)) {
            revert CertificadoExistente();
        }

        bytes32 nullifier = keccak256(
            abi.encode(pedido.loteId, pedido.padraoHash, pedido.compromissoScore)
        );
        if (compromissoJaCertificado[nullifier]) revert CertificadoExistente();

        uint256[5] memory entradasPublicas = [
            uint256(pedido.compromissoScore),
            uint256(pedido.notaMinima),
            uint256(pedido.loteId) % IAgroChainRegistro.BN254_ESCALAR(),
            uint256(pedido.padraoHash) % IAgroChainRegistro.BN254_ESCALAR(),
            uint256(pedido.hashLaudo) % IAgroChainRegistro.BN254_ESCALAR()
        ];
        if (!verificadorZK.verifyProof(prova.a, prova.b, prova.c, entradasPublicas)) {
            revert ProvaZKNaoConfere();
        }

        registroAgroChain.registrarCertificacaoZK(
            pedido.id,
            pedido.loteId,
            pedido.tipo,
            pedido.hashLaudo,
            pedido.validoAte,
            pedido.compromissoScore,
            pedido.notaMinima,
            pedido.titular,
            msg.sender
        );

        compromissoJaCertificado[nullifier] = true;
        certificacoes[pedido.id] = RegistroCertificacao({
            loteId: pedido.loteId,
            padraoHash: pedido.padraoHash,
            hashLaudo: pedido.hashLaudo,
            compromissoScore: pedido.compromissoScore,
            emissor: msg.sender,
            validoAte: pedido.validoAte,
            notaMinima: pedido.notaMinima,
            ativa: true
        });

        nftId = proximoNftId++;
        _setTokenURI(nftId, pedido.tokenURI);
        _safeMint(pedido.titular, nftId);
        tokenAgro.mint(pedido.titular, recompensaPorCertificacao);
        tokenIdPorCertificacao[pedido.id] = nftId;

        emit CertificacaoEmitida(
            pedido.id,
            pedido.loteId,
            pedido.padraoHash,
            pedido.compromissoScore,
            pedido.hashLaudo,
            pedido.notaMinima,
            pedido.validoAte,
            pedido.titular,
            msg.sender,
            nftId,
            recompensaPorCertificacao
        );
    }

    /// @notice Revoga a validade sem apagar o NFT nem o histórico de emissão.
    function revogarCertificacao(bytes32 id, bytes32 motivoHash) external {
        RegistroCertificacao storage registro = certificacoes[id];
        if (!registro.ativa) revert CertificadoInativo();
        if (msg.sender != registro.emissor && msg.sender != owner()) revert ApenasEmissorOuAdmin();
        registroAgroChain.revogarCertificacaoZK(id, motivoHash, msg.sender);
        registro.ativa = false;
        emit CertificacaoRevogada(id, msg.sender, motivoHash);
    }

    function certificacaoValida(bytes32 id) external view returns (bool) {
        RegistroCertificacao storage registro = certificacoes[id];
        return registro.ativa && registro.validoAte > block.timestamp;
    }

    /// @dev Permite somente o mint inicial; o certificado NFT não pode ser
    ///      transferido nem queimado após emitido.
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address from)
    {
        from = _ownerOf(tokenId);
        if (from != address(0)) revert NFTIntransferivel();
        return super._update(to, tokenId, auth);
    }
}

/// @notice ERC-20 fungível de utilidade, emitido apenas pelo contrato de
///         certificação e protegido por um limite total definido no deploy.
contract AgroChainUtilityToken is ERC20, ERC20Capped, Ownable {
    constructor(uint256 limiteTotal)
        ERC20("AgroChain Utility Token", "AGRO")
        ERC20Capped(limiteTotal)
        Ownable(msg.sender)
    {}

    function mint(address destinatario, uint256 quantidade) external onlyOwner {
        _mint(destinatario, quantidade);
    }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Capped)
    {
        super._update(from, to, value);
    }
}
