// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "../PowerPod.sol";
import "@deta/stdeta/contracts/interfaces/IStdeta.sol";

contract PowerPodMock is PowerPod {
    constructor(string memory name, string memory symbol, IStdeta stdeta) PowerPod(name, symbol, stdeta) {}

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }

    function votingPowerOf(address account) external view override returns (uint256) {
        return balanceOf(account) / 2;
    }
}
