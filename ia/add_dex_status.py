#!/usr/bin/env python3
"""
Script para adicionar endpoints de status do CoffeeCacaoSwap DEX ao dashboard.
Deve ser importado no dashboard_server.py.
"""

def get_dex_status():
    """Retorna o status atual da implementação do CoffeeCacaoSwap DEX"""
    
    # Verificar contratos existentes
    import os
    base_path = "c:/Users/Usuário/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip"
    contracts_path = os.path.join(base_path, "blockchain", "contracts", "cafeswap")
    
    contracts_status = {}
    if os.path.exists(contracts_path):
        for contract in ["CafeToken.sol", "CafeSwapFactory.sol", "CafeSwapRouter.sol", "CafeFarm.sol"]:
            contract_path = os.path.join(contracts_path, contract)
            contracts_status[contract] = os.path.exists(contract_path)
    
    # Verificar workflow status
    workflow_status = {
        "workflow_id": "wf_cf8800b99acb3f71",
        "current_step": "feat001 - CafeToken + CoffeeCacaoSwapFactory",
        "total_features": 4,
        "features_completed": 0,  # Será atualizado conforme workflow progride
        "features": [
            {"id": "FEAT-001", "name": "Core Token Contracts", "status": "in_progress"},
            {"id": "FEAT-002", "name": "CoffeeCacaoSwapPool + Router", "status": "pending"},
            {"id": "FEAT-003", "name": "MasterChef", "status": "pending"},
            {"id": "FEAT-004", "name": "Governance + Timelock", "status": "pending"}
        ]
    }
    
    return {
        "dex_name": "CoffeeCacaoSwap DEX",
        "scope": "Coffee (Arabica, Robusta/Conilon) + Cacao (4 variedades) apenas",
        "status": "implementation_in_progress",
        "contracts_status": contracts_status,
        "workflow_status": workflow_status,
        "timestamp": "2026-10-10T05:45:00Z",
        "dashboard_url": "http://localhost:8001",
        "static_server_url": "http://localhost:8000"
    }

def get_dex_contract_links():
    """Retorna links para visualizar os contratos implementados"""
    base_url = "file:///"
    base_path = "c:/Users/Usuário/agrochain/workspace-01a1162b-e061-7ff0-b060-dfa40cc70dfdzip"
    
    links = []
    contract_files = [
        ("CafeToken.sol", "Token de governança CAFE (100M supply)"),
        ("CafeSwapFactory.sol", "Factory para criar pools Coffee/Cacao"),
        ("CafeSwapRouter.sol", "Router multi-hop para swaps"),
        ("CafeFarm.sol", "MasterChef para staking e rewards")
    ]
    
    for contract, description in contract_files:
        path = os.path.join(base_path, "blockchain", "contracts", "cafeswap", contract)
        if os.path.exists(path):
            file_url = base_url + path.replace("\\", "/")
            links.append({
                "name": contract,
                "description": description,
                "url": file_url,
                "size_bytes": os.path.getsize(path)
            })
    
    return links

if __name__ == "__main__":
    # Testar as funções
    print("CoffeeCacaoSwap DEX Status:")
    print("=" * 50)
    
    status = get_dex_status()
    for key, value in status.items():
        if key != "workflow_status":
            print(f"{key}: {value}")
    
    print("\nContratos implementados:")
    for contract, exists in status["contracts_status"].items():
        print(f"  {contract}: {'✅' if exists else '❌'}")
    
    print("\nLinks para contratos:")
    import os
    links = get_dex_contract_links()
    for link in links:
        print(f"  {link['name']} ({link['size_bytes']} bytes): {link['description']}")