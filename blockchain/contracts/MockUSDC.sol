// SPDX-License-Identifier: MIT
pragma solidity 0.8.37;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title MockUSDC Token
/// @notice ERC20 token simulando USDC para testes em ambiente local/testnet
/// @dev Fornece função mint() pública sem permissões para uso em testes
contract MockUSDC is ERC20 {

    /// @notice Inicializa o token com nome e símbolo
    constructor() ERC20("Mock USDC", "mUSDC") {}

    /// @notice Função de mint pública - qualquer endereço pode chamar
    /// @param _to Endereço receptor dos tokens
    /// @param _amount Quantidade de tokens a cunhar (em unidades de 18 decimais)
    function mint(address _to, uint256 _amount) external {
        require(_to != address(0), "MockUSDC: Cannot mint to zero address");
        require(_amount > 0, "MockUSDC: Amount must be greater than zero");
        _mint(_to, _amount);
    }

    /// @notice Retorna o número de casas decimais (padrão: 18)
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
