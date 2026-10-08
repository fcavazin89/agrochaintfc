// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title  AgroChainRastreio
 * @notice Rastreabilidade de café e cacau com pagamento em escrow, para a rede
 *         permissionada de consórcio do AgroChain (Hyperledger Besu / Polygon).
 *
 * @dev    Este contrato é a versão de produção do que o protótipo executa
 *         localmente em JavaScript. A estrutura de dados foi mantida idêntica
 *         para que a migração seja direta:
 *           evento da cadeia (JS)  ->  struct Evento / emitirEvento (Solidity)
 *           lote com hash (JS)     ->  struct Lote / registrarLote
 *           certificação (JS)      ->  struct Certificacao / emitirCertificacao
 *           contrato escrow (JS)   ->  struct Contrato / avancarEtapa
 *
 * PRINCÍPIOS DE PROJETO
 * ---------------------
 * 1) Nada de dado pesado on-chain. A cadeia guarda HASHES e ponteiros; fotos,
 *    laudos em PDF e coordenadas ficam em armazenamento off-chain (IPFS/S3) e o
 *    hash do arquivo é o que garante a integridade. Custo por transação cai de
 *    forma decisiva em rede EVM.
 * 2) Permissão por papel. É rede de consórcio, não rede pública: só produtor
 *    registra colheita, só certificadora emite selo, só indústria aceita lote.
 * 3) O pagamento se move por regra, não por confiança. Divergência de peso
 *    acima da tolerância trava o escrow sem que ninguém precise autorizar.
 * 4) Auditável para sempre: todo estado relevante emite evento, para que
 *    qualquer auditor reconstrua a história fora da cadeia.
 */
contract AgroChainRastreio {

    // =====================================================================
    // TIPOS E ESTRUTURAS
    // =====================================================================

    enum Papel { NENHUM, PRODUTOR, COOPERATIVA, INDUSTRIA, CERTIFICADORA, AUDITOR }
    enum StatusLote { REGISTRADO, DISPONIVEL, EM_CONTRATO, VENDIDO, CONSUMIDO_PROPRIO, BLOQUEADO }
    enum EtapaContrato { PROPOSTA, GARANTIA, DESPACHO, RECEBIMENTO, PAGAMENTO, TRAVADO, ENCERRADO }

    struct Evento {
        uint256 id;
        bytes32 loteId;
        string tipo;            // COLHEITA, SECAGEM, FERMENTACAO, CLASSIFICACAO, TRANSPORTE...
        address autor;
        bytes32 hashDocumento;  // hash do comprovante (foto, laudo, tíquete de balança)
        int64 latitude;
        int64 longitude;
        uint256 timestamp;
    }

    struct Lote {
        bytes32 id;
        address produtor;
        string produto;         // "cafe_conilon" | "cafe_arabica" | "cacau"
        uint256 pesoGramas;
        uint16 umidadeBase;     // umidade em pontos-base (1240 = 12,40%)
        bytes32 hashOrigem;     // hash do último evento — amarra a trilha
        StatusLote status;
        bool certificado;
        uint256 totalEventos;
    }

    struct Certificacao {
        bytes32 id;
        bytes32 loteId;
        address certificadora;
        string tipo;
        bytes32 hashLaudo;
        uint256 validoAte;
        bool ativa;
    }

    struct Contrato {
        bytes32 id;
        address vendedor;
        address comprador;
        bytes32 loteId;
        uint256 precoPorGrama;      // preço em wei por grama — evita ponto flutuante
        uint256 garantiaEscrow;
        uint16 toleranciaPesoBps;   // tolerância de divergência em pontos-base (200 = 2%)
        EtapaContrato etapa;
        uint256 pesoDeclarado;
        uint256 pesoConferido;
        uint256 prazoEntrega;
    }

    // =====================================================================
    // ESTADO
    // =====================================================================

    address public admin;
    mapping(address => Papel) public papeis;
    mapping(address => bool) public membroConsorcio;

    mapping(bytes32 => Lote) private lotes;
    mapping(bytes32 => Contrato) private contratos;
    mapping(bytes32 => Certificacao) private certificacoes;
    mapping(bytes32 => Evento[]) private eventosDoLote;
    mapping(bytes32 => bytes32[]) private certificacoesDoLote;
    mapping(bytes32 => bool) public certificacoesComProvaZK;

    address public moduloCertificacaoZK;

    uint256 public totalLotes;
    uint256 public totalEventos;
    uint256 public totalContratos;

    string public versaoModeloIA = "AgroYield-RO 1.0.0";
    uint256 public constant BN254_ESCALAR =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    // =====================================================================
    // EVENTOS
    // =====================================================================

    event MembroAdicionado(address indexed membro, Papel papel);
    event LoteRegistrado(bytes32 indexed loteId, address indexed produtor, string produto, uint256 pesoGramas);
    event EventoCadeiaRegistrado(bytes32 indexed loteId, uint256 id, string tipo, address indexed autor, bytes32 hashDocumento);
    event CertificacaoEmitida(bytes32 indexed certificacaoId, bytes32 indexed loteId, address certificadora, string tipo, bytes32 hashLaudo);
    event CertificacaoRevogada(bytes32 indexed certificacaoId, string motivo);
    event ModuloCertificacaoZKConfigurado(address indexed modulo);
    event CertificacaoZKRegistrada(
        bytes32 indexed certificacaoId,
        bytes32 indexed loteId,
        bytes32 compromissoScore,
        uint8 notaMinima,
        address titular
    );
    event CertificacaoZKRevogada(
        bytes32 indexed certificacaoId,
        address indexed responsavel,
        bytes32 motivoHash
    );
    event ContratoCriado(bytes32 indexed contratoId, bytes32 indexed loteId, address vendedor, address comprador, uint256 valor);
    event GarantiaDepositada(bytes32 indexed contratoId, uint256 valor);
    event EtapaAvancada(bytes32 indexed contratoId, EtapaContrato etapa);
    event DivergenciaDetectada(bytes32 indexed contratoId, uint256 pesoDeclarado, uint256 pesoConferido, uint256 divergenciaBps);
    event PagamentoLiberado(bytes32 indexed contratoId, address indexed vendedor, uint256 valor);
    event DisputaResolvida(bytes32 indexed contratoId, uint256 pesoRecontagem, bytes32 hashLaudo, address certificadora);
    event AnaliseIARegistrada(bytes32 indexed loteId, string modelo, uint16 scoreQualidade, bytes32 hashEntrada, bytes32 hashSaida);

    // =====================================================================
    // MODIFICADORES
    // =====================================================================

    modifier apenasPapel(Papel papel) {
        require(papeis[msg.sender] == papel, "AgroChain: papel sem permissao para esta operacao");
        _;
    }

    modifier apenasMembro() {
        require(membroConsorcio[msg.sender], "AgroChain: remetente nao e membro do consorcio");
        _;
    }

    modifier loteExiste(bytes32 loteId) {
        require(lotes[loteId].produtor != address(0), "AgroChain: lote inexistente");
        _;
    }

    constructor() {
        admin = msg.sender;
        membroConsorcio[msg.sender] = true;
        papeis[msg.sender] = Papel.CERTIFICADORA; // administrador inicial do consórcio
    }

    // =====================================================================
    // GOVERNANÇA DO CONSÓRCIO
    // =====================================================================

    /// @notice Adiciona uma instituição ao consórcio com seu papel.
    function adicionarMembro(address membro, Papel papel) external {
        require(msg.sender == admin, "AgroChain: apenas o admin");
        require(membro != address(0), "AgroChain: endereco invalido");
        membroConsorcio[membro] = true;
        papeis[membro] = papel;
        emit MembroAdicionado(membro, papel);
    }

    /// @notice Remove acesso de um membro (ex.: certificadora descredenciada).
    function removerMembro(address membro) external {
        require(msg.sender == admin, "AgroChain: apenas o admin");
        membroConsorcio[membro] = false;
        papeis[membro] = Papel.NENHUM;
    }

    // =====================================================================
    // LOTES E EVENTOS DA CADEIA
    // =====================================================================

    /**
     * @notice Registra um lote na origem. O hash de origem é a semente de toda
     *         a trilha: cada evento seguinte é encadeado ao anterior, então
     *         alterar um evento antigo invalida todos os hashes seguintes —
     *         exatamente o comportamento demonstrado no protótipo.
     */
    function registrarLote(
        bytes32 loteId,
        string calldata produto,
        uint256 pesoGramas,
        uint16 umidadeBase,
        bytes32 hashPrimeiroEvento,
        bool paraConsumoProprio
    ) external apenasPapel(Papel.PRODUTOR) {
        require(lotes[loteId].produtor == address(0), "AgroChain: lote ja registrado");
        require(pesoGramas > 0, "AgroChain: peso invalido");

        lotes[loteId] = Lote({
            id: loteId,
            produtor: msg.sender,
            produto: produto,
            pesoGramas: pesoGramas,
            umidadeBase: umidadeBase,
            hashOrigem: hashPrimeiroEvento,
            status: paraConsumoProprio ? StatusLote.CONSUMIDO_PROPRIO : StatusLote.DISPONIVEL,
            certificado: false,
            totalEventos: 0
        });
        totalLotes++;

        _adicionarEvento(loteId, "COLHEITA", hashPrimeiroEvento, 0, 0);
        emit LoteRegistrado(loteId, msg.sender, produto, pesoGramas);
    }

    /// @notice Acrescenta um evento à trilha do lote (secagem, fermentação, classificação, transporte).
    function emitirEvento(
        bytes32 loteId,
        string calldata tipo,
        bytes32 hashDocumento,
        int64 latitude,
        int64 longitude
    ) external apenasMembro loteExiste(loteId) {
        Lote storage lote = lotes[loteId];
        require(lote.status != StatusLote.VENDIDO, "AgroChain: lote ja vendido");

        // Reforço de papel por tipo de evento: quem faz o quê, em contrato.
        Papel p = papeis[msg.sender];
        bytes32 t = keccak256(bytes(tipo));
        if (t == keccak256("COLHEITA") || t == keccak256("SECAGEM") || t == keccak256("FERMENTACAO")) {
            require(p == Papel.PRODUTOR, "AgroChain: apenas o produtor registra colheita e pos-colheita");
        } else if (t == keccak256("CLASSIFICACAO") || t == keccak256("RECEBIMENTO")) {
            require(p == Papel.COOPERATIVA || p == Papel.INDUSTRIA, "AgroChain: classificacao e da cooperativa ou industria");
        } else if (t == keccak256("LAUDO")) {
            require(p == Papel.CERTIFICADORA, "AgroChain: laudo e da certificadora");
        } else if (t == keccak256("LEITURA_SENSOR")) {
            // O que entra on-chain é a raiz de Merkle das leituras, nunca a serie
            // bruta: o volume de um sensor por hora inviabilizaria a rede, e a
            // prova de inclusão garante que qualquer leitura individual possa
            // ser conferida contra essa raiz, off-chain.
            require(
                p == Papel.PRODUTOR || p == Papel.COOPERATIVA,
                "AgroChain: ancoragem de sensor e do produtor ou da cooperativa"
            );
        }

        // Encadeamento: o hash de origem passa a ser o do evento mais recente
        // combinado com o anterior — se um evento antigo mudar, a trilha quebra.
        bytes32 novoHash = keccak256(abi.encodePacked(lote.hashOrigem, hashDocumento, msg.sender, block.timestamp, tipo));
        lote.hashOrigem = novoHash;

        _adicionarEvento(loteId, tipo, hashDocumento, latitude, longitude);
    }

    function _adicionarEvento(
        bytes32 loteId,
        string memory tipo,
        bytes32 hashDocumento,
        int64 latitude,
        int64 longitude
    ) private {
        uint256 id = ++totalEventos;
        eventosDoLote[loteId].push(Evento({
            id: id, loteId: loteId, tipo: tipo, autor: msg.sender,
            hashDocumento: hashDocumento, latitude: latitude, longitude: longitude,
            timestamp: block.timestamp
        }));
        lotes[loteId].totalEventos++;
        emit EventoCadeiaRegistrado(loteId, id, tipo, msg.sender, hashDocumento);
    }

    // =====================================================================
    // CERTIFICAÇÃO
    // =====================================================================

    /**
     * @notice Emite selo (Indicação de Procedência Rondônia, Rainforest, orgânico...).
     * @dev    Exige que o lote tenha laudo registrado: sem laudo, não há selo.
     *         É a regra que impede certificação de fachada.
     */
    function emitirCertificacao(
        bytes32 certificacaoId,
        bytes32 loteId,
        string calldata tipo,
        bytes32 hashLaudo,
        uint256 validoAte
    ) external apenasPapel(Papel.CERTIFICADORA) loteExiste(loteId) {
        require(certificacoes[certificacaoId].certificadora == address(0), "AgroChain: certificacao ja registrada");
        require(_temEvento(loteId, "LAUDO") || _temEvento(loteId, "CLASSIFICACAO"), "AgroChain: lote sem laudo registrado");
        require(validoAte > block.timestamp, "AgroChain: validade invalida");

        certificacoes[certificacaoId] = Certificacao({
            id: certificacaoId, loteId: loteId, certificadora: msg.sender,
            tipo: tipo, hashLaudo: hashLaudo, validoAte: validoAte, ativa: true
        });
        certificacoesDoLote[loteId].push(certificacaoId);
        lotes[loteId].certificado = true;

        emit CertificacaoEmitida(certificacaoId, loteId, msg.sender, tipo, hashLaudo);
    }

    /// @notice Liga o módulo de emissão ZK ao cadastro de lotes desta rede.
    ///         O administrador pode substituir o módulo durante uma atualização.
    function configurarModuloCertificacaoZK(address modulo) external {
        require(msg.sender == admin, "AgroChain: apenas o admin");
        require(modulo != address(0), "AgroChain: modulo invalido");
        moduloCertificacaoZK = modulo;
        emit ModuloCertificacaoZKConfigurado(modulo);
    }

    /// @notice Chamado pelo módulo somente após verificar a prova ZK e antes
    ///         de cunhar o NFT; o cadastro do lote e o laudo são revalidados aqui.
    function registrarCertificacaoZK(
        bytes32 certificacaoId,
        bytes32 loteId,
        string calldata tipo,
        bytes32 hashLaudo,
        uint256 validoAte,
        bytes32 compromissoScore,
        uint8 notaMinima,
        address titular,
        address emissor
    ) external {
        require(msg.sender == moduloCertificacaoZK && msg.sender != address(0), "AgroChain: modulo ZK nao autorizado");
        require(papeis[emissor] == Papel.CERTIFICADORA, "AgroChain: emissor sem papel de certificadora");
        require(lotes[loteId].produtor != address(0), "AgroChain: lote inexistente");
        require(certificacoes[certificacaoId].certificadora == address(0), "AgroChain: certificacao ja registrada");
        require(
            _temLaudoComHash(loteId, hashLaudo),
            "AgroChain: hash do laudo nao consta na trilha do lote"
        );
        require(validoAte > block.timestamp && notaMinima <= 100, "AgroChain: parametros de certificacao invalidos");
        require(titular != address(0) && compromissoScore != bytes32(0) && bytes(tipo).length > 0, "AgroChain: dados de certificacao invalidos");

        certificacoes[certificacaoId] = Certificacao({
            id: certificacaoId,
            loteId: loteId,
            certificadora: emissor,
            tipo: tipo,
            hashLaudo: hashLaudo,
            validoAte: validoAte,
            ativa: true
        });
        certificacoesDoLote[loteId].push(certificacaoId);
        certificacoesComProvaZK[certificacaoId] = true;
        lotes[loteId].certificado = true;

        emit CertificacaoEmitida(certificacaoId, loteId, emissor, tipo, hashLaudo);
        emit CertificacaoZKRegistrada(certificacaoId, loteId, compromissoScore, notaMinima, titular);
    }

    /// @notice Mantém a validade do cadastro de lotes sincronizada quando o
    ///         certificado on-chain associado ao NFT é revogado.
    function revogarCertificacaoZK(bytes32 certificacaoId, bytes32 motivoHash, address responsavel) external {
        require(msg.sender == moduloCertificacaoZK && msg.sender != address(0), "AgroChain: modulo ZK nao autorizado");
        Certificacao storage c = certificacoes[certificacaoId];
        require(certificacoesComProvaZK[certificacaoId] && c.ativa, "AgroChain: certificacao ZK inativa");
        require(
            responsavel == c.certificadora || responsavel == admin,
            "AgroChain: apenas emissor ou admin revoga"
        );
        c.ativa = false;
        lotes[c.loteId].certificado = _possuiCertificacaoAtiva(c.loteId);
        emit CertificacaoZKRevogada(certificacaoId, responsavel, motivoHash);
        emit CertificacaoRevogada(certificacaoId, string(abi.encodePacked("motivoHash:", _hex32(motivoHash))));
    }

    function revogarCertificacao(bytes32 certificacaoId, string calldata motivo)
        external apenasPapel(Papel.CERTIFICADORA)
    {
        Certificacao storage c = certificacoes[certificacaoId];
        require(c.ativa, "AgroChain: certificacao ja inativa");
        c.ativa = false;
        lotes[c.loteId].certificado = false;
        emit CertificacaoRevogada(certificacaoId, motivo);
    }

    function _temEvento(bytes32 loteId, string memory tipo) private view returns (bool) {
        Evento[] storage evs = eventosDoLote[loteId];
        for (uint256 i = 0; i < evs.length; i++) {
            if (keccak256(bytes(evs[i].tipo)) == keccak256(bytes(tipo))) return true;
        }
        return false;
    }

    function _temLaudoComHash(bytes32 loteId, bytes32 hashLaudo) private view returns (bool) {
        Evento[] storage evs = eventosDoLote[loteId];
        for (uint256 i = 0; i < evs.length; i++) {
            bytes32 tipo = keccak256(bytes(evs[i].tipo));
            if (
                (tipo == keccak256("LAUDO") || tipo == keccak256("CLASSIFICACAO")) &&
                evs[i].hashDocumento == hashLaudo
            ) return true;
        }
        return false;
    }

    function _possuiCertificacaoAtiva(bytes32 loteId) private view returns (bool) {
        bytes32[] storage ids = certificacoesDoLote[loteId];
        for (uint256 i = 0; i < ids.length; i++) {
            if (certificacoes[ids[i]].ativa) return true;
        }
        return false;
    }

    function _hex32(bytes32 value) private pure returns (string memory) {
        bytes16 alphabet = "0123456789abcdef";
        bytes memory output = new bytes(64);
        for (uint256 i = 0; i < 32; i++) {
            output[i * 2] = alphabet[uint8(value[i] >> 4)];
            output[i * 2 + 1] = alphabet[uint8(value[i] & 0x0f)];
        }
        return string(output);
    }

    // =====================================================================
    // CONTRATO COM PAGAMENTO EM ESCROW
    // =====================================================================

    function criarContrato(
        bytes32 contratoId,
        bytes32 loteId,
        address comprador,
        uint256 precoPorGrama,
        uint16 toleranciaPesoBps,
        uint256 prazoEntrega
    ) external apenasMembro loteExiste(loteId) {
        Lote storage lote = lotes[loteId];
        require(lote.produtor == msg.sender || papeis[msg.sender] == Papel.COOPERATIVA, "AgroChain: so o dono do lote ou a cooperativa");
        require(lote.status == StatusLote.DISPONIVEL, "AgroChain: lote indisponivel para venda");
        require(toleranciaPesoBps <= 1000, "AgroChain: tolerancia maxima de 10%");

        contratos[contratoId] = Contrato({
            id: contratoId, vendedor: lote.produtor, comprador: comprador, loteId: loteId,
            precoPorGrama: precoPorGrama, garantiaEscrow: 0,
            toleranciaPesoBps: toleranciaPesoBps, etapa: EtapaContrato.PROPOSTA,
            pesoDeclarado: lote.pesoGramas, pesoConferido: 0, prazoEntrega: prazoEntrega
        });
        lote.status = StatusLote.EM_CONTRATO;   // trava venda duplicada do mesmo lote
        totalContratos++;

        emit ContratoCriado(contratoId, loteId, lote.produtor, comprador, precoPorGrama * lote.pesoGramas);
    }

    /// @notice Comprador deposita a garantia. O valor fica retido no contrato.
    function depositarGarantia(bytes32 contratoId) external payable {
        Contrato storage c = contratos[contratoId];
        require(msg.sender == c.comprador, "AgroChain: apenas o comprador");
        require(c.etapa == EtapaContrato.PROPOSTA, "AgroChain: etapa incorreta");
        uint256 valorTotal = c.precoPorGrama * c.pesoDeclarado;
        uint256 garantiaMinima = valorTotal / 10;                 // 10% do contrato
        require(msg.value >= garantiaMinima, "AgroChain: garantia inferior a 10% do contrato");

        c.garantiaEscrow = msg.value;
        c.etapa = EtapaContrato.GARANTIA;
        emit GarantiaDepositada(contratoId, msg.value);
        emit EtapaAvancada(contratoId, EtapaContrato.GARANTIA);
    }

    function registrarDespacho(bytes32 contratoId) external {
        Contrato storage c = contratos[contratoId];
        require(msg.sender == c.vendedor || papeis[msg.sender] == Papel.COOPERATIVA, "AgroChain: apenas o vendedor");
        require(c.etapa == EtapaContrato.GARANTIA, "AgroChain: garantia ainda nao depositada");
        c.etapa = EtapaContrato.DESPACHO;
        emit EtapaAvancada(contratoId, EtapaContrato.DESPACHO);
    }

    /**
     * @notice Conferência de recebimento — o coração do escrow.
     * @dev    Se a divergência entre peso declarado e conferido passar da
     *         tolerância, o contrato TRAVA e o pagamento não sai. É a regra que
     *         substitui a negociação por telefone quando alguém tenta entregar
     *         carga a menos.
     */
    function conferirRecebimento(bytes32 contratoId, uint256 pesoConferido) external {
        Contrato storage c = contratos[contratoId];
        require(msg.sender == c.comprador || papeis[msg.sender] == Papel.COOPERATIVA, "AgroChain: apenas o comprador");
        require(c.etapa == EtapaContrato.DESPACHO, "AgroChain: despacho ainda nao registrado");

        c.pesoConferido = pesoConferido;
        uint256 divergenciaBps = _divergenciaBps(c.pesoDeclarado, pesoConferido);

        if (divergenciaBps > c.toleranciaPesoBps) {
            c.etapa = EtapaContrato.TRAVADO;
            lotes[c.loteId].status = StatusLote.BLOQUEADO;
            emit DivergenciaDetectada(contratoId, c.pesoDeclarado, pesoConferido, divergenciaBps);
            emit EtapaAvancada(contratoId, EtapaContrato.TRAVADO);
            return;   // pagamento NÃO é liberado
        }
        c.etapa = EtapaContrato.RECEBIMENTO;
        emit EtapaAvancada(contratoId, EtapaContrato.RECEBIMENTO);
    }

    /// @notice Libera o pagamento ao vendedor e encerra o lote. Exige conferência concluída.
    function liberarPagamento(bytes32 contratoId) external {
        Contrato storage c = contratos[contratoId];
        require(msg.sender == c.comprador, "AgroChain: apenas o comprador");
        require(c.etapa == EtapaContrato.RECEBIMENTO, "AgroChain: conferencia pendente ou travada");
        require(c.garantiaEscrow > 0, "AgroChain: sem garantia em escrow");

        uint256 valor = c.garantiaEscrow;
        c.garantiaEscrow = 0;
        c.etapa = EtapaContrato.ENCERRADO;
        lotes[c.loteId].status = StatusLote.VENDIDO;

        (bool ok, ) = payable(c.vendedor).call{value: valor}("");
        require(ok, "AgroChain: falha na transferencia");
        emit PagamentoLiberado(contratoId, c.vendedor, valor);
        emit EtapaAvancada(contratoId, EtapaContrato.ENCERRADO);
    }

    /// @notice Resolve disputa travada por divergência de peso, com laudo de recontagem.
    function resolverDivergencia(bytes32 contratoId, uint256 pesoRecontagem, bytes32 hashLaudo) external {
        Contrato storage c = contratos[contratoId];
        require(papeis[msg.sender] == Papel.CERTIFICADORA, "AgroChain: apenas a certificadora decide a disputa");
        require(c.etapa == EtapaContrato.TRAVADO, "AgroChain: contrato nao esta travado");

        require(hashLaudo != bytes32(0), "AgroChain: laudo de recontagem obrigatorio");
        c.pesoConferido = pesoRecontagem;
        emit DivergenciaDetectada(contratoId, c.pesoDeclarado, pesoRecontagem, _divergenciaBps(c.pesoDeclarado, pesoRecontagem));
        emit DisputaResolvida(contratoId, pesoRecontagem, hashLaudo, msg.sender);
        c.etapa = EtapaContrato.RECEBIMENTO;
        emit EtapaAvancada(contratoId, EtapaContrato.RECEBIMENTO);
    }

    function _divergenciaBps(uint256 declarado, uint256 conferido) private pure returns (uint256) {
        if (declarado == 0) return 0;
        uint256 dif = declarado > conferido ? declarado - conferido : conferido - declarado;
        return (dif * 10000) / declarado;
    }

    // =====================================================================
    // IA COM RASTREABILIDADE (a recomendação também é auditável)
    // =====================================================================

    /**
     * @notice Grava o parecer da IA junto ao lote.
     * @dev    Guardamos o hash das ENTRADAS e o hash da SAÍDA. Assim o produtor
     *         pode contestar: fica registrado qual versão do modelo, com quais
     *         dados, gerou qual recomendação — e a cooperativa pode auditar
     *         depois se o modelo foi trocado. Inteligência artificial sem essa
     *         trilha não deveria decidir preço de ninguém.
     */
    function registrarAnaliseIA(
        bytes32 loteId,
        string calldata modelo,
        uint16 scoreQualidade,
        bytes32 hashEntrada,
        bytes32 hashSaida
    ) external apenasMembro loteExiste(loteId) {
        require(scoreQualidade <= 10000, "AgroChain: score fora da escala");
        emit AnaliseIARegistrada(loteId, modelo, scoreQualidade, hashEntrada, hashSaida);
    }

    // =====================================================================
    // CONSULTAS PÚBLICAS (o que o comprador externo enxerga)
    // =====================================================================

    /// @notice Verificação completa do lote — é o que o QR Code da saca entrega.
    function verificarLote(bytes32 loteId) external view returns (
        address produtor,
        string memory produto,
        uint256 pesoGramas,
        uint16 umidadeBase,
        bytes32 hashTrilha,
        StatusLote status,
        bool certificado,
        uint256 quantidadeEventos
    ) {
        Lote storage l = lotes[loteId];
        require(l.produtor != address(0), "AgroChain: lote inexistente");
        return (l.produtor, l.produto, l.pesoGramas, l.umidadeBase, l.hashOrigem,
                l.status, l.certificado, l.totalEventos);
    }

    function trilhaDoLote(bytes32 loteId) external view returns (Evento[] memory) {
        return eventosDoLote[loteId];
    }

    function certificacoesAtivas(bytes32 loteId) external view returns (Certificacao[] memory) {
        bytes32[] storage ids = certificacoesDoLote[loteId];
        uint256 ativos = 0;
        for (uint256 i = 0; i < ids.length; i++) if (certificacoes[ids[i]].ativa) ativos++;
        Certificacao[] memory saida = new Certificacao[](ativos);
        uint256 k = 0;
        for (uint256 i = 0; i < ids.length; i++) {
            if (certificacoes[ids[i]].ativa) saida[k++] = certificacoes[ids[i]];
        }
        return saida;
    }

    function consultarContrato(bytes32 contratoId) external view returns (Contrato memory) {
        return contratos[contratoId];
    }

    /// @notice Hash agregado do estado: serve para provar a integridade da base.
    function hashEstado() external view returns (bytes32) {
        return keccak256(abi.encodePacked(totalLotes, totalEventos, totalContratos, versaoModeloIA));
    }
}
