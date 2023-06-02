// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@deta/delegating/contracts/FarmingDelegationPod.sol";
import "@deta/stdeta/contracts/helpers/VotingPowerCalculator.sol";
import "@deta/stdeta/contracts/interfaces/IVotable.sol";
import "@deta/stdeta/contracts/interfaces/IStdeta.sol";

contract PowerPod is FarmingDelegationPod, VotingPowerCalculator, IVotable {
    uint256 private constant _MAX_SHARE_PODS = 3;
    uint256 private constant _SHARE_POD_GAS_LIMIT = 140_000;

    constructor(string memory name_, string memory symbol_, IStdeta stdeta)
        FarmingDelegationPod(name_, symbol_, stdeta, _MAX_SHARE_PODS, _SHARE_POD_GAS_LIMIT)
        VotingPowerCalculator(stdeta.expBase(), stdeta.origin())
    {}

    function votingPowerOf(address account) external view virtual returns (uint256) {
        return _votingPowerAt(balanceOf(account), block.timestamp);
    }
}
