const { expect, time, ether, constants } = require('@deta/solidity-utils');
const { ethers } = require('hardhat');
const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expBase } = require('./helpers/utils');

describe('Delegation stdeta', function () {
    let addr, addr1;
    let accounts;
    const threshold = ether('0.05');
    const MAX_WHITELISTED = 3;
    const commonLockDuration = time.duration.days('40');

    const stakeAndRegisterInDelegation = async (stdeta, delegation, user, amount, userIndex) => {
        await stdeta.connect(user).deposit(0, commonLockDuration);
        await stdeta.depositFor(user.address, amount);
        await stdeta.connect(user).addPod(delegation.address);
        await delegation
            .connect(user)
            .functions['register(string,string)'](
                `${userIndex}DelegatingToken`,
                `A${userIndex}DT`,
            );
        await delegation.connect(user).delegate(user.address);
    };

    async function initContracts() {
        const TokenPermitMock = await ethers.getContractFactory('ERC20PermitMock');
        const oneInch = await TokenPermitMock.deploy('deta', 'deta', addr.address, ether('200'));
        await oneInch.deployed();
        await oneInch.transfer(addr1.address, ether('100'));

        const Stdeta = await ethers.getContractFactory('Stdeta');
        const stdeta = await Stdeta.deploy(oneInch.address, expBase, addr.address);
        await stdeta.deployed();
        await oneInch.approve(stdeta.address, ether('100'));
        await oneInch.connect(addr1).approve(stdeta.address, ether('100'));

        const PowerPod = await ethers.getContractFactory('PowerPod');
        const delegation = await PowerPod.deploy('PowerPod', 'PP', stdeta.address);
        await delegation.deployed();
        const WhitelistRegistry = await ethers.getContractFactory('WhitelistRegistry');
        const whitelistRegistry = await WhitelistRegistry.deploy(delegation.address, threshold, MAX_WHITELISTED);
        await whitelistRegistry.deployed();
        // fill all whitelist into WhitelistRegistry
        for (let i = 0; i < MAX_WHITELISTED; ++i) {
            const userIndex = i + 2;
            const user = accounts[userIndex];
            await stakeAndRegisterInDelegation(stdeta, delegation, user, ether('2') * BigInt(i + 1), userIndex);
            await whitelistRegistry.connect(user).register();
        }
        await stakeAndRegisterInDelegation(stdeta, delegation, addr, ether('1'), 0);

        return { stdeta, delegation, whitelistRegistry };
    }

    before(async function () {
        accounts = await ethers.getSigners();
        addr = accounts[0];
        addr1 = accounts[1];
    });

    describe('For add to whitelist', function () {
        const depositAndDelegateTo = async (stdeta, delegation, from, to, amount, duration = commonLockDuration) => {
            await stdeta.connect(from).deposit(amount, duration);
            await stdeta.connect(from).addPod(delegation.address);
            await delegation.connect(from).delegate(to);
        };

        it('should add account, when sum stacked stdeta and deposit stdeta is sufficient', async function () {
            const { stdeta, delegation, whitelistRegistry } = await loadFixture(initContracts);
            // addr shouldn't register becouse his stdeta balance less that all of the whitelisted accounts
            await expect(whitelistRegistry.register()).to.be.revertedWithCustomError(
                whitelistRegistry,
                'NotEnoughBalance',
            );
            // create other stake and delegate to addr
            await depositAndDelegateTo(stdeta, delegation, addr1, addr.address, ether('2'));
            // register addr into whitelistRegistry and chack that
            await whitelistRegistry.register();
            expect(await whitelistRegistry.getWhitelist()).to.contain(addr.address);
        });

        it('should add account, when sum stacked stdeta and deposit stdeta is sufficient (delegate before deposit)', async function () {
            const { stdeta, delegation, whitelistRegistry } = await loadFixture(initContracts);
            // delegate to addr and deposit deta
            await stdeta.connect(addr1).addPod(delegation.address);
            await delegation.connect(addr1).delegate(addr.address);
            await stdeta.connect(addr1).deposit(ether('2'), commonLockDuration);

            await whitelistRegistry.register();
        });

        it('should accrue DelegatedShare token after delegate', async function () {
            const { stdeta, delegation } = await loadFixture(initContracts);
            const DelegatedShare = await ethers.getContractFactory('DelegatedShare');
            const delegatedShare = await DelegatedShare.attach(await delegation.registration(addr.address));
            const balanceDelegated = await delegatedShare.balanceOf(addr.address);
            expect(await delegatedShare.totalSupply()).to.equal(balanceDelegated);
            expect(await stdeta.balanceOf(addr.address)).to.equal(balanceDelegated);

            await depositAndDelegateTo(stdeta, delegation, addr1, addr.address, ether('2'));

            const balanceDelegator = await delegatedShare.balanceOf(addr1.address);
            expect(balanceDelegated.mul(await stdeta.balanceOf(addr1.address))).to.equal(
                balanceDelegator.mul(await stdeta.balanceOf(addr.address)),
            );
        });

        it('should decrease delegatee balance, if delegator undelegate stake', async function () {
            const { stdeta, delegation, whitelistRegistry } = await loadFixture(initContracts);
            await depositAndDelegateTo(stdeta, delegation, addr1, addr.address, ether('2'));
            await whitelistRegistry.register();

            await delegation.connect(addr1).delegate(constants.ZERO_ADDRESS);
            await whitelistRegistry.connect(accounts[2]).register();
            expect(await whitelistRegistry.getWhitelist()).to.not.contain(addr.address);
        });

        it('should decrease delegatee balance, if delegator delegate to other account', async function () {
            const { stdeta, delegation, whitelistRegistry } = await loadFixture(initContracts);
            await depositAndDelegateTo(stdeta, delegation, addr1, addr.address, ether('2'));
            await whitelistRegistry.register();

            await delegation.connect(addr1).delegate(accounts[2].address);
            await whitelistRegistry.connect(accounts[2]).register();
            expect(await whitelistRegistry.getWhitelist()).to.not.contain(addr.address);
        });
    });
});
