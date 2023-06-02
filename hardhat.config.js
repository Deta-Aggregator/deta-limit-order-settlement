require('@matterlabs/hardhat-zksync-deploy');
require('@matterlabs/hardhat-zksync-solc');
require('@matterlabs/hardhat-zksync-verify');
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');
require('@nomicfoundation/hardhat-chai-matchers');
require('solidity-coverage');
require('hardhat-dependency-compiler');
require('hardhat-deploy');
require('hardhat-gas-reporter');
require('hardhat-tracer');
require('dotenv').config();

const { networks, etherscan } = require('./hardhat.networks');

const DEFAULT_COMPILER_SETTINGS = {
    version: '0.8.19',
    settings: {
        optimizer: {
            enabled: true,
            runs: 1000000,
        },
        viaIR: true,
    },
};

const LOW_OPTIMIZER_COMPILER_SETTINGS = {
    version: '0.8.19',
    settings: {
        optimizer: {
            enabled: true,
        },
        viaIR: true,
    },
};

module.exports = {
    etherscan,
    tracer: {
        enableAllOpcodes: true,
    },
    solidity: {
        compilers: [DEFAULT_COMPILER_SETTINGS],
        overrides: {
            '@deta/limit-order-protocol-contract/contracts/LimitOrderProtocol.sol': LOW_OPTIMIZER_COMPILER_SETTINGS,
            'contracts/hardhat-dependency-compiler/@deta/limit-order-protocol-contract/contracts/LimitOrderProtocol.sol': LOW_OPTIMIZER_COMPILER_SETTINGS,
        },
    },
    networks,
    namedAccounts: {
        deployer: {
            default: 0,
        },
    },
    gasReporter: {
        enable: true,
    },
    dependencyCompiler: {
        paths: [
            '@deta/solidity-utils/contracts/mocks/TokenMock.sol',
            '@deta/solidity-utils/contracts/mocks/ERC20PermitMock.sol',
            '@deta/erc20-pods/contracts/mocks/PodMock.sol',
            '@deta/stdeta/contracts/Stdeta.sol',
            '@deta/limit-order-protocol-contract/contracts/LimitOrderProtocol.sol',
            '@deta/limit-order-protocol-contract/contracts/mocks/WrappedTokenMock.sol',
        ],
    },
    zksolc: {
        version: '1.3.7',
        compilerSource: 'binary',
        settings: {},
    },
};
