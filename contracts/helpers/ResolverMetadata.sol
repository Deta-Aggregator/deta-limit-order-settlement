// SPDX-License-Identifier: MIT

pragma solidity 0.8.19;

import "@deta/delegating/contracts/interfaces/ITokenizedDelegationPod.sol";

contract ResolverMetadata {
    error NotRegisteredDelegatee();

    ITokenizedDelegationPod public immutable delegation;
    mapping (address => string) public getUrl;

    modifier onlyRegistered {
        if (address(delegation.registration(msg.sender)) == address(0)) revert NotRegisteredDelegatee();
        _;
    }

    constructor(ITokenizedDelegationPod delegation_) {
        delegation = delegation_;
    }

    function setResolverUrl(string calldata url) external onlyRegistered {
        getUrl[msg.sender] = url;
    }
}
