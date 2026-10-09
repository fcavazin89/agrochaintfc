/**
 * Módulo Web3 AgroChain
 * 
 * Integração com MetaMask e blockchain Sepolia para emissão de certificações.
 * Fornece:
 * - Detecção de MetaMask e conexão de wallet
 * - Comunicação com contrato AgroChainCertificacoes
 * - Geração de provas ZK
 * - Emissão de certificações (NFT + Token)
 */

export const Web3 = {
  // Estado
  provider: null,
  signer: null,
  contractAddress: null,
  contractAbi: null,
  contract: null,
  currentAccount: null,
  currentNetwork: null,
  
  /**
   * Inicializa web3 (detecta MetaMask)
   */
  async init() {
    if (typeof window === "undefined" || !window.ethereum) {
      console.warn("MetaMask não detectado");
      return false;
    }
    
    try {
      // Usar ethers.js se disponível, senão usar API simples
      if (typeof ethers !== "undefined") {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        return true;
      } else {
        console.warn("ethers.js não carregado");
        return false;
      }
    } catch (error) {
      console.error("Erro ao inicializar Web3:", error);
      return false;
    }
  },
  
  /**
   * Conecta à wallet MetaMask
   */
  async conectar() {
    try {
      if (!window.ethereum) {
        throw new Error("MetaMask não está instalado");
      }
      
      // Solicitar acesso às contas
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      
      this.currentAccount = accounts[0];
      this.signer = await this.provider.getSigner(accounts[0]);
      
      // Detectar rede
      await this.detectarRede();
      
      console.log(`Conectado à wallet: ${this.currentAccount}`);
      console.log(`Rede: ${this.currentNetwork}`);
      
      // Emitir evento
      window.dispatchEvent(new CustomEvent("web3:connected", {
        detail: { account: this.currentAccount, network: this.currentNetwork }
      }));
      
      return this.currentAccount;
    } catch (error) {
      console.error("Erro ao conectar:", error);
      throw error;
    }
  },
  
  /**
   * Desconecta da wallet
   */
  desconectar() {
    this.currentAccount = null;
    this.signer = null;
    window.dispatchEvent(new CustomEvent("web3:disconnected"));
    console.log("Desconectado");
  },
  
  /**
   * Detecta a rede atual
   */
  async detectarRede() {
    try {
      const network = await this.provider.getNetwork();
      this.currentNetwork = network;
      
      // Validar se é Sepolia
      if (network.chainId !== 11155111n) {
        console.warn(`⚠ Rede atual: ${network.name} (${network.chainId})`);
        console.warn("Use Sepolia testnet (chainId: 11155111)");
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Erro ao detectar rede:", error);
      return false;
    }
  },
  
  /**
   * Muda para a rede Sepolia
   */
  async mudarParaSepolia() {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }], // 11155111 em hex
      });
      
      await this.detectarRede();
      return true;
    } catch (error) {
      if (error.code === 4902) {
        // Rede não adicionada, adicionar
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: "0xaa36a7",
              chainName: "Sepolia Testnet",
              rpcUrls: ["https://sepolia.infura.io/v3/"],
              nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            }],
          });
          return true;
        } catch (addError) {
          console.error("Erro ao adicionar rede:", addError);
          return false;
        }
      }
      console.error("Erro ao mudar rede:", error);
      return false;
    }
  },
  
  /**
   * Carrega o contrato AgroChainCertificacoes
   */
  async carregarContrato(enderecoContrato, abiJson) {
    try {
      this.contractAddress = enderecoContrato;
      
      if (typeof abiJson === "string") {
        this.contractAbi = JSON.parse(abiJson);
      } else {
        this.contractAbi = abiJson;
      }
      
      if (!this.signer) {
        throw new Error("Wallet não conectada");
      }
      
      this.contract = new ethers.Contract(
        this.contractAddress,
        this.contractAbi,
        this.signer
      );
      
      console.log(`Contrato carregado: ${this.contractAddress}`);
      return this.contract;
    } catch (error) {
      console.error("Erro ao carregar contrato:", error);
      throw error;
    }
  },
  
  /**
   * Verifica se uma certificação é válida
   */
  async verificarCertificacao(certificacaoId) {
    try {
      if (!this.contract) throw new Error("Contrato não carregado");
      
      const valida = await this.contract.certificacaoValida(certificacaoId);
      return valida;
    } catch (error) {
      console.error("Erro ao verificar certificação:", error);
      return false;
    }
  },
  
  /**
   * Emite uma certificação
   */
  async emitirCertificacao(pedidoCertificacao, prova) {
    try {
      if (!this.contract) throw new Error("Contrato não carregado");
      
      console.log("Enviando certificação...");
      
      // Formatar prova para o contrato
      const provaFormatada = {
        a: prova.a,
        b: prova.b,
        c: prova.c,
      };
      
      // Enviar transação
      const tx = await this.contract.emitirCertificacao(
        pedidoCertificacao,
        provaFormatada
      );
      
      console.log(`TX enviada: ${tx.hash}`);
      
      // Aguardar confirmação
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        console.log("✓ Certificação emitida com sucesso!");
        
        // Extrair ID do NFT dos logs
        const nftId = this.extrairNftIdDosLogs(receipt.logs);
        
        return {
          txHash: tx.hash,
          blockNumber: receipt.blockNumber,
          nftId,
          gasUsed: receipt.gasUsed.toString(),
        };
      } else {
        throw new Error("Transação falhou");
      }
    } catch (error) {
      console.error("Erro ao emitir certificação:", error);
      throw error;
    }
  },
  
  /**
   * Extrai ID do NFT dos logs da transação
   */
  extrairNftIdDosLogs(logs) {
    // Procurar por evento Transfer do ERC721
    // event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
    const transferTopic = ethers.id("Transfer(address,address,uint256)");
    
    for (const log of logs) {
      if (log.topics[0] === transferTopic) {
        // O ID do token está no terceiro tópico
        return BigInt(log.topics[3]).toString();
      }
    }
    
    return null;
  },
  
  /**
   * Obtém o saldo de tokens AGRO
   */
  async obterSaldoAgro() {
    try {
      if (!this.contract) throw new Error("Contrato não carregado");
      
      const tokenAddress = await this.contract.tokenAgro();
      
      // ABI simplificado de ERC20
      const erc20Abi = [
        "function balanceOf(address account) public view returns (uint256)"
      ];
      
      const tokenContract = new ethers.Contract(
        tokenAddress,
        erc20Abi,
        this.provider
      );
      
      const balance = await tokenContract.balanceOf(this.currentAccount);
      return ethers.formatUnits(balance, 18); // 18 decimals
    } catch (error) {
      console.error("Erro ao obter saldo:", error);
      return "0";
    }
  },
  
  /**
   * Obtém metadados de um NFT de certificação
   */
  async obterMetadadosNft(nftId) {
    try {
      if (!this.contract) throw new Error("Contrato não carregado");
      
      const tokenUri = await this.contract.tokenURI(nftId);
      
      // Se for IPFS, resolver para HTTP
      let metadataUrl = tokenUri;
      if (tokenUri.startsWith("ipfs://")) {
        const hash = tokenUri.replace("ipfs://", "");
        metadataUrl = `https://ipfs.io/ipfs/${hash}`;
      }
      
      const response = await fetch(metadataUrl);
      return await response.json();
    } catch (error) {
      console.error("Erro ao obter metadados:", error);
      return null;
    }
  },
  
  /**
   * Monitora eventos de certificação
   */
  monitorarCertificacoes(callback) {
    try {
      if (!this.contract) throw new Error("Contrato não carregado");
      
      const filter = this.contract.filters.CertificacaoEmitida();
      
      this.contract.on(filter, (id, loteId, padraoHash, compromissoScore, 
                                hashLaudo, notaMinima, validoAte, titular, 
                                emissor, nftId, recompensaAgro, event) => {
        callback({
          id,
          loteId,
          padraoHash,
          compromissoScore,
          hashLaudo,
          notaMinima,
          validoAte: Number(validoAte),
          titular,
          emissor,
          nftId: Number(nftId),
          recompensaAgro: ethers.formatUnits(recompensaAgro, 18),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
        });
      });
      
      return () => {
        this.contract.off(filter);
      };
    } catch (error) {
      console.error("Erro ao monitorar certificações:", error);
      return null;
    }
  },
  
  /**
   * Obtém a taxa de gás estimada
   */
  async estimarGas(pedidoCertificacao, prova) {
    try {
      if (!this.contract) throw new Error("Contrato não carregado");
      
      const provaFormatada = {
        a: prova.a,
        b: prova.b,
        c: prova.c,
      };
      
      const gasEstimate = await this.contract.emitirCertificacao.estimateGas(
        pedidoCertificacao,
        provaFormatada
      );
      
      const gasPrice = await this.provider.getGasPrice();
      const custo = ethers.formatEther(gasEstimate * gasPrice);
      
      return {
        gas: gasEstimate.toString(),
        gasPrice: ethers.formatUnits(gasPrice, "gwei"),
        custoEstimado: custo + " ETH",
      };
    } catch (error) {
      console.error("Erro ao estimar gás:", error);
      return null;
    }
  },
};

// Auto-inicializar se window está disponível
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    Web3.init().catch(console.error);
  });
}

export default Web3;
