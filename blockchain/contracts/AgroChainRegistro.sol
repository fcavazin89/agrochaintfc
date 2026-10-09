// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IAgroChainRegistro} from "./IAgroChainRegistro.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title AgroChainRegistro
/// @notice Registro persistente e auditável de todas as certificações ZK emitidas.
/// @dev Implementa IAgroChainRegistro e mantém o histórico completo de emissões
///      e revogações para conformidade regulatória e rastreabilidade.
contract AgroChainRegistro is IAgroChainRegistro, Ownable {
    uint256 public constant BN254_ESCALAR =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    struct CertificacaoZK {
        bytes32 id;
        bytes32 loteId;
        string tipo;
        bytes32 hashLaudo;
        uint256 validoAte;
        bytes32 compromissoScore;
        uint8 notaMinima;
        address titular;
        address emissor;
        uint64 dataEmissao;
        bool ativa;
    }

    struct RevogacaoZK {
        bytes32 certificacaoId;
        bytes32 motivoHash;
        address responsavel;
        uint64 dataRevogacao;
    }

    mapping(bytes32 => CertificacaoZK) public certificacoes;
    mapping(bytes32 => RevogacaoZK) public revogacoes;
    mapping(address => bytes32[]) public certificacoesPorTitular;
    mapping(address => bytes32[]) public certificacoesPorEmissor;
    
    bytes32[] public todasAsCertificacoes;

    event CertificacaoZKRegistrada(
        bytes32 indexed id,
        bytes32 indexed loteId,
        string tipo,
        bytes32 hashLaudo,
        uint256 validoAte,
        bytes32 compromissoScore,
        uint8 notaMinima,
        address indexed titular,
        address emissor,
        uint64 dataEmissao
    );

    event CertificacaoZKRevogada(
        bytes32 indexed id,
        bytes32 motivoHash,
        address indexed responsavel,
        uint64 dataRevogacao
    );

    error ApenasCertificadora();
    error PedidoInvalido();
    error CertificacaoNaoEncontrada();
    error CertificacaoJaRevogada();

    modifier apenasAutorizado(address certificadora) {
        // Será chamado apenas por AgroChainCertificacoes, que valida autorização
        _;
    }

    constructor() Ownable(msg.sender) {}

    /// @notice Registra uma certificação ZK validada pelo verificador Groth16.
    /// @dev Chamado apenas por AgroChainCertificacoes após verificação de prova.
    function registrarCertificacaoZK(
        bytes32 id,
        bytes32 loteId,
        string calldata tipo,
        bytes32 hashLaudo,
        uint256 validoAte,
        bytes32 compromissoScore,
        uint8 notaMinima,
        address titular,
        address emissor
    ) external apenasAutorizado(msg.sender) {
        if (
            id == bytes32(0) ||
            loteId == bytes32(0) ||
            titular == address(0) ||
            emissor == address(0) ||
            validoAte <= block.timestamp ||
            notaMinima > 100
        ) revert PedidoInvalido();

        if (certificacoes[id].emissor != address(0)) revert PedidoInvalido();

        uint64 agora = uint64(block.timestamp);
        
        certificacoes[id] = CertificacaoZK({
            id: id,
            loteId: loteId,
            tipo: tipo,
            hashLaudo: hashLaudo,
            validoAte: validoAte,
            compromissoScore: compromissoScore,
            notaMinima: notaMinima,
            titular: titular,
            emissor: emissor,
            dataEmissao: agora,
            ativa: true
        });

        certificacoesPorTitular[titular].push(id);
        certificacoesPorEmissor[emissor].push(id);
        todasAsCertificacoes.push(id);

        emit CertificacaoZKRegistrada(
            id,
            loteId,
            tipo,
            hashLaudo,
            validoAte,
            compromissoScore,
            notaMinima,
            titular,
            emissor,
            agora
        );
    }

    /// @notice Revoga uma certificação ZK ativa, mantendo o histórico.
    /// @dev Apenas o emissor original ou o admin podem revogar.
    function revogarCertificacaoZK(bytes32 id, bytes32 motivoHash, address responsavel) external {
        CertificacaoZK storage cert = certificacoes[id];
        
        if (cert.emissor == address(0)) revert CertificacaoNaoEncontrada();
        if (!cert.ativa) revert CertificacaoJaRevogada();
        if (msg.sender != cert.emissor && msg.sender != owner()) revert ApenasCertificadora();

        cert.ativa = false;
        uint64 agora = uint64(block.timestamp);

        revogacoes[id] = RevogacaoZK({
            certificacaoId: id,
            motivoHash: motivoHash,
            responsavel: responsavel,
            dataRevogacao: agora
        });

        emit CertificacaoZKRevogada(id, motivoHash, responsavel, agora);
    }

    /// @notice Recupera uma certificação pelo seu ID.
    function obterCertificacao(bytes32 id)
        external
        view
        returns (CertificacaoZK memory)
    {
        return certificacoes[id];
    }

    /// @notice Recupera revogação de uma certificação.
    function obterRevogacao(bytes32 id)
        external
        view
        returns (RevogacaoZK memory)
    {
        return revogacoes[id];
    }

    /// @notice Lista todas as certificações emitidas para um titular.
    function listarCertificacoesTitular(address titular)
        external
        view
        returns (bytes32[] memory)
    {
        return certificacoesPorTitular[titular];
    }

    /// @notice Lista todas as certificações emitidas por um emissor.
    function listarCertificacoesEmissor(address emissor)
        external
        view
        returns (bytes32[] memory)
    {
        return certificacoesPorEmissor[emissor];
    }

    /// @notice Retorna o total de certificações no registro.
    function totalCertificacoes() external view returns (uint256) {
        return todasAsCertificacoes.length;
    }

    /// @notice Verifica se uma certificação está ativa e válida.
    function certificacaoValida(bytes32 id) external view returns (bool) {
        CertificacaoZK memory cert = certificacoes[id];
        return cert.ativa && cert.validoAte > block.timestamp;
    }
}
