from fastapi import FastAPI, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
from pathlib import Path

app = FastAPI(title="AgroChain Dashboard", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for DEX endpoints
class SwapRequest(BaseModel):
    tokenIn: str
    tokenOut: str
    amountIn: str

# Caminho correto para prototipo-agrochain
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "..", "prototipo-agrochain")
BLOCKCHAIN_DIR = os.path.join(BASE_DIR, "..", "blockchain")

@app.get("/", response_class=HTMLResponse)
async def dashboard():
    """Página principal - AgroChain Dashboard com sidebar"""
    html_path = os.path.join(STATIC_DIR, "AgroChain.html")
    
    try:
        with open(html_path, "r", encoding="utf-8") as f:
            content = f.read()
    except FileNotFoundError:
        return HTMLResponse(content=f"""
        <html><body style="background:#0b1d12;color:#f3f7f2;font-family:sans-serif;padding:40px;">
        <h1>AgroChain Dashboard</h1>
        <p>Arquivo não encontrado: {html_path}</p>
        <p>Tentando caminho: {os.path.abspath(html_path)}</p>
        </body></html>
        """)
    
    # Sidebar HTML
    sidebar_html = '''
    <style>
        .agrochain-sidebar {
            position: fixed;
            left: 0;
            top: 60px;
            bottom: 0;
            width: 280px;
            background: linear-gradient(180deg, #10301f, #0b2216);
            padding: 24px 16px;
            overflow-y: auto;
            border-right: 1px solid rgba(184,145,42,.35);
            z-index: 40;
            box-shadow: 4px 0 12px rgba(0,0,0,0.3);
        }
        .agrochain-sidebar-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 16px;
            margin-bottom: 8px;
            color: #ccdbd1;
            text-decoration: none;
            border-radius: 10px;
            transition: all 0.2s;
            font-size: 14px;
            cursor: pointer;
        }
        .agrochain-sidebar-item:hover {
            background: rgba(47,143,82,.18);
            color: #f3f7f2;
            transform: translateX(4px);
        }
        .agrochain-sidebar-item.active {
            background: rgba(184,145,42,.22);
            color: #e8c95a;
            font-weight: 600;
        }
        .agrochain-sidebar-icon {
            font-size: 20px;
            width: 24px;
            text-align: center;
        }
        .agrochain-sidebar-section {
            color: #9db2a4;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            font-weight: 600;
            margin: 24px 0 12px 16px;
        }
        #app {
            margin-left: 280px !important;
        }
        @media (max-width: 1024px) {
            .agrochain-sidebar { 
                transform: translateX(-100%); 
                transition: transform 0.3s;
            }
            #app { margin-left: 0 !important; }
            .agrochain-sidebar.open { transform: translateX(0); }
        }
    </style>
    <div class="agrochain-sidebar">
        <div class="agrochain-sidebar-section">🏠 Principal</div>
        <a href="/" class="agrochain-sidebar-item active">
            <span class="agrochain-sidebar-icon">📊</span>
            <span>Dashboard</span>
        </a>
        
        <div class="agrochain-sidebar-section">☕🍫 Coffee & Cacao</div>
        <a href="http://localhost:8000/certificador.html" target="_blank" class="agrochain-sidebar-item">
            <span class="agrochain-sidebar-icon">🔐</span>
            <span>Certificador ZK</span>
        </a>
        <a href="http://localhost:8000/dashboard.html" target="_blank" class="agrochain-sidebar-item">
            <span class="agrochain-sidebar-icon">📈</span>
            <span>Analytics</span>
        </a>
        
        <div class="agrochain-sidebar-section">📚 APIs & Docs</div>
        <a href="/docs" class="agrochain-sidebar-item">
            <span class="agrochain-sidebar-icon">📖</span>
            <span>API Documentation</span>
        </a>
        <a href="/health" target="_blank" class="agrochain-sidebar-item">
            <span class="agrochain-sidebar-icon">❤️</span>
            <span>Health Check</span>
        </a>
        <a href="/api/coffee" target="_blank" class="agrochain-sidebar-item">
            <span class="agrochain-sidebar-icon">☕</span>
            <span>Coffee API</span>
        </a>
        <a href="/api/cacao" target="_blank" class="agrochain-sidebar-item">
            <span class="agrochain-sidebar-icon">🍫</span>
            <span>Cacao API</span>
        </a>
        
        <div class="agrochain-sidebar-section">💱 DeFi</div>
        <a href="http://localhost:8000/dex.html" target="_blank" class="agrochain-sidebar-item">
            <span class="agrochain-sidebar-icon">💱</span>
            <span>CoffeeCacaoSwap</span>
        </a>
        <a href="/workflow-status" target="_blank" class="agrochain-sidebar-item">
            <span class="agrochain-sidebar-icon">🚀</span>
            <span>Workflow Status</span>
        </a>
        
        <div class="agrochain-sidebar-section">🔗 Links Externos</div>
        <a href="http://localhost:8000/" target="_blank" class="agrochain-sidebar-item">
            <span class="agrochain-sidebar-icon">🌐</span>
            <span>Frontend (8000)</span>
        </a>
    </div>
    '''
    
    # Insert sidebar after <body> tag
    if '<body>' in content:
        content = content.replace('<body>', '<body>' + sidebar_html, 1)
    else:
        content = sidebar_html + content
    
    return HTMLResponse(content=content)

@app.get("/health")
async def health():
    return {
        "status": "healthy", 
        "service": "AgroChain Dashboard", 
        "port": 8001,
        "features": ["Coffee", "Cacao", "ZK Certification", "AI Compliance"]
    }

@app.get("/api/coffee")
async def coffee_info():
    return {
        "service": "Coffee Compliance Analysis",
        "varieties": ["ARABICA", "ROBUSTA_CONILON"],
        "min_sca_score": 80,
        "endpoint": "POST /api/coffee/analyze (porta 8001)",
        "features": ["SCA Scoring", "EUDR Validation", "Mass Balance", "Quality Metrics"]
    }

@app.get("/api/cacao")
async def cacao_info():
    return {
        "service": "Cacao Compliance Analysis", 
        "varieties": ["CRIOLLO", "FORASTERO", "TRINITARIO", "NACIONAL"],
        "min_quality_score": 75,
        "endpoint": "POST /api/cacao/analyze (porta 8001)",
        "features": ["Quality Scoring", "EUDR Validation", "Fermentation Tracking", "Premium Grade"]
    }

@app.get("/workflow-status")
async def workflow_status():
    return {
        "workflow": "CoffeeCacaoSwap DEX Implementation",
        "id": "wf_bcf20f9e719a69b5",
        "status": "build-loop",
        "progress": {
            "phase": "Implementation",
            "completed": ["Planning"],
            "current": "Building 6 Contracts",
            "pending": ["Code Review", "Testing", "Deployment"]
        },
        "contracts": [
            "CafeToken.sol",
            "CoffeeCacaoSwapFactory.sol",
            "CoffeeCacaoSwapPool.sol",
            "CoffeeCacaoSwapRouter.sol",
            "CoffeeCacaoFarm.sol",
            "CafeGovernance.sol"
        ],
        "features": ["Coffee tokens only", "Cacao tokens only", "AMM x*y=k", "Liquidity Mining", "DAO Governance"]
    }

@app.get("/api/dex/status")
async def dex_status():
    """Returns DEX status with contract addresses and pool information"""
    # Try to read deployment addresses if they exist
    deployment_file = os.path.join(BLOCKCHAIN_DIR, "deployments", "cafeswap-addresses.json")
    contracts = {}
    
    if os.path.exists(deployment_file):
        try:
            with open(deployment_file, "r") as f:
                deployment_data = json.load(f)
                contracts = deployment_data
        except Exception:
            # Use mock addresses if file read fails
            contracts = {
                "CafeToken": "0x1234567890abcdef1234567890abcdef12345678",
                "Factory": "0x2345678901bcdef0123456789abcdef012345678",
                "Router": "0x3456789012cdef01234567890abcdef0123456789",
                "Farm": "0x4567890123def012345678901abcdef01234567890",
                "Governance": "0x567890123def012345678901abcdef012345678901"
            }
    else:
        # Use mock addresses if no deployment file
        contracts = {
            "CafeToken": "0x1234567890abcdef1234567890abcdef12345678",
            "Factory": "0x2345678901bcdef0123456789abcdef012345678",
            "Router": "0x3456789012cdef01234567890abcdef0123456789",
            "Farm": "0x4567890123def012345678901abcdef01234567890",
            "Governance": "0x567890123def012345678901abcdef012345678901"
        }
    
    return {
        "status": "online",
        "contracts": contracts,
        "tvl_usd": 0,
        "pools_active": 2,
        "farms": [
            {"lpToken": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", "allocPoint": 100, "apyPercent": 15.5},
            {"lpToken": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", "allocPoint": 50, "apyPercent": 12.3}
        ]
    }

@app.get("/api/dex/contracts")
async def dex_contracts():
    """Returns list of DEX contracts with their ABIs"""
    contract_names = [
        "CafeToken",
        "CoffeeCacaoSwapFactory",
        "CoffeeCacaoSwapPool",
        "CoffeeCacaoSwapRouter",
        "CoffeeCacaoFarm",
        "CafeGovernance"
    ]
    
    # Mock addresses for contracts
    mock_addresses = {
        "CafeToken": "0x1234567890abcdef1234567890abcdef12345678",
        "CoffeeCacaoSwapFactory": "0x2345678901bcdef0123456789abcdef012345678",
        "CoffeeCacaoSwapPool": "0x3456789012cdef01234567890abcdef0123456789",
        "CoffeeCacaoSwapRouter": "0x4567890123def012345678901abcdef01234567890",
        "CoffeeCacaoFarm": "0x567890123def012345678901abcdef012345678901",
        "CafeGovernance": "0x67890123def012345678901abcdef0123456789012"
    }
    
    contracts = []
    artifacts_base = os.path.join(BLOCKCHAIN_DIR, "artifacts", "blockchain", "contracts", "cafeswap")
    
    for contract_name in contract_names:
        address = mock_addresses.get(contract_name, "0x0000000000000000000000000000000000000000")
        
        # Try to find the ABI file
        # Handle different naming conventions: look for both exact name and variations
        possible_dirs = [
            os.path.join(artifacts_base, f"{contract_name}.sol"),
            os.path.join(artifacts_base, f"{contract_name.replace('CoffeeCacao', 'CafeSwap')}.sol"),
        ]
        
        abi = []
        abi_found = False
        error_msg = None
        
        for dir_path in possible_dirs:
            abi_file = os.path.join(dir_path, f"{contract_name}.json")
            
            # Also try alternate names for some contracts
            if not os.path.exists(abi_file):
                # Handle CoffeeCacao -> CafeSwap naming differences
                alt_name = contract_name.replace("CoffeeCacao", "CafeSwap")
                abi_file = os.path.join(dir_path, f"{alt_name}.json")
            
            if os.path.exists(abi_file):
                try:
                    with open(abi_file, "r") as f:
                        artifact = json.load(f)
                        abi = artifact.get("abi", [])
                        abi_found = True
                        break
                except Exception as e:
                    error_msg = str(e)
        
        contract_data = {
            "name": contract_name,
            "address": address,
            "abi": abi
        }
        
        if not abi_found:
            contract_data["error"] = "ABI not found"
        
        contracts.append(contract_data)
    
    return contracts

@app.post("/api/dex/simulate-swap")
async def simulate_swap(request: SwapRequest):
    """Simulates a token swap with mock implementation"""
    try:
        # Validate amountIn is a valid positive integer string
        amount_in = int(request.amountIn)
        if amount_in <= 0:
            raise HTTPException(status_code=400, detail="amountIn must be a positive integer")
    except ValueError:
        raise HTTPException(status_code=400, detail="amountIn must be a valid integer string")
    
    # Mock swap: apply 0.3% fee
    fee_rate = 0.003  # 0.3%
    amount_out = int(amount_in * (1 - fee_rate))
    fee = amount_in - amount_out
    price_impact = "0.30"
    
    return {
        "amountIn": request.amountIn,
        "amountOut": str(amount_out),
        "priceImpact": price_impact,
        "fee": str(fee),
        "route": [request.tokenIn, request.tokenOut]
    }

if __name__ == "__main__":
    import uvicorn
    print(f"Starting AgroChain Dashboard on http://localhost:8001")
    print(f"Static files from: {os.path.abspath(STATIC_DIR)}")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
