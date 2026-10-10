// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

/// @title MockCoffeeCacaoFarm
/// @notice Mock farm contract for testing governance proposals
contract MockCoffeeCacaoFarm {
    uint256 public cafePerSecond;

    event RewardRateUpdated(uint256 oldRate, uint256 newRate);

    function setRewardRate(uint256 _newRate) external {
        uint256 oldRate = cafePerSecond;
        cafePerSecond = _newRate;
        emit RewardRateUpdated(oldRate, _newRate);
    }
}
