const hre = require('hardhat');
const { ethers } = hre;
const { constants } = require('@deta/solidity-utils');

const expBase = 999999952502977513n; // 0.05^(1/(2 years)) means 95% value loss over 2 years

const _delay = (ms) =>
    new Promise((resolve) => {
        setTimeout(resolve, ms);
    });

const _tryRun = async (f, n = 10) => {
    if (typeof f !== 'function') {
        throw Error('f is not a function');
    }
    for (let i = 0; ; i++) {
        try {
            return await f();
        } catch (error) {
            if (
                error.message === 'Contract source code already verified' ||
                error.message.includes('Reason: Already Verified')
            ) {
                console.log('Contract already verified. Skipping verification');
                break;
            }
            console.error(error);
            await _delay(2000);
            if (i > n) {
                throw new Error(`Couldn't verify deploy in ${n} runs`);
            }
        }
    }
};

// not idemponent. Needs to be rewritten a bit if another run is required
const _addCompoundTokens = async (compoundLikeWrapper, cTokens) => {
    await (await compoundLikeWrapper.addMarkets(cTokens)).wait();
};

const _getContract = async (contractName, contractAddress) => {
    const contractFactory = await ethers.getContractFactory(contractName);
    return contractFactory.attach(contractAddress);
};

const _zip = (a, b) => a.map((k, i) => [k, b[i]]);

async function addAaveTokens(aaveWrapperV2, AAWE_WRAPPER_TOKENS) {
    const aTokens = await Promise.all(AAWE_WRAPPER_TOKENS.map((x) => aaveWrapperV2.tokenToaToken(x)));
    const tokensToDeploy = _zip(AAWE_WRAPPER_TOKENS, aTokens)
        .filter(([, aToken]) => aToken === constants.ZERO_ADDRESS)
        .map(([token]) => token);
    if (tokensToDeploy.length > 0) {
        console.log('AaveWrapperV2 tokens to deploy: ', tokensToDeploy);
        await (await aaveWrapperV2.addMarkets(tokensToDeploy)).wait();
    } else {
        console.log('All tokens are already deployed');
    }
}

const idempotentDeploy = async (
    contractName,
    constructorArgs,
    deployments,
    deployer,
    deploymentName = contractName,
    skipVerify = false,
) => {
    const { deploy, getOrNull } = deployments;

    const existingContract = await getOrNull(deploymentName);
    if (existingContract) {
        console.log(`Skipping deploy for existing contract ${contractName} (${deploymentName}) at address: ${existingContract.address}`);

        return existingContract;
    }

    const contract = await deploy(deploymentName, {
        args: constructorArgs,
        from: deployer,
        contract: contractName,
        // gasPrice: 5_000_000_000n,
        // maxPriorityFeePerGas: BigInt(500_000_000n).toString(),
        // maxFeePerGas: BigInt(30_000_000_000n).toString(),
    });

    console.log(`${deploymentName} deployed to: ${contract.address}`);

    if (!skipVerify) {
        await _delay(2000);
        await _tryRun(() =>
            hre.run('verify:verify', {
                address: contract.address,
                constructorArguments: constructorArgs,
            }),
        );
    }

    return contract;
};

const idempotentDeployGetContract = async (
    contractName,
    constructorArgs,
    deployments,
    deployer,
    deploymentName = contractName,
    skipVerify = false,
) => {
    const deployResult = await idempotentDeploy(
        contractName,
        constructorArgs,
        deployments,
        deployer,
        deploymentName,
        skipVerify,
    );
    return _getContract(contractName, deployResult.address);
};

const getContract = async (contractName, deployments, deploymentName = contractName) => {
    return _getContract(contractName, (await deployments.get(deploymentName)).address);
};

const getContractByAddress = async (contractName, address) => {
    return _getContract(contractName, address);
};

const deployCompoundTokenWrapper = async (
    contractInfo,
    tokenName,
    deployments,
    deployer,
    feeData,
    deploymentName = `CompoundLikeWrapper_${contractInfo.name}`,
) => {
    const comptroller = await ethers.getContractAt('IComptroller', contractInfo.address);
    const cToken = (await comptroller.getAllMarkets()).filter((token) => token !== tokenName);
    console.log(`Found ${contractInfo.name} cTokens: ${cToken}`);
    const wrapper = await idempotentDeployGetContract(
        'CompoundLikeWrapper',
        [contractInfo.address, tokenName],
        deploymentName,
        deployments,
        deployer,
        feeData,
    );
    await _addCompoundTokens(wrapper, cToken);
    return wrapper;
};

module.exports = {
    expBase,
    addAaveTokens,
    deployCompoundTokenWrapper,
    getContract,
    getContractByAddress,
    idempotentDeploy,
    idempotentDeployGetContract,
};
