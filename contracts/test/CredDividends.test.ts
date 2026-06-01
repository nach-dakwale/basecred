import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

async function deployFixture() {
  const [deployer, treasury, alice, bob, carol] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("BaseCreditToken");
  const token = await Token.deploy(deployer.address);

  const Dividends = await ethers.getContractFactory("CredDividends");
  const dividends = await Dividends.deploy(await token.getAddress());

  await token.setDividends(await dividends.getAddress());
  await dividends.setLoanPool(deployer.address); // use deployer as mock pool

  return { token, dividends, deployer, treasury, alice, bob, carol };
}

describe("CredDividends", () => {
  it("reverts receiveInterest from non-pool", async () => {
    const { dividends, alice } = await loadFixture(deployFixture);
    await expect(
      alice.sendTransaction({ to: await dividends.getAddress(), value: ethers.parseEther("1") })
    ).to.not.be.reverted; // receive() is fine
    await expect(
      dividends.connect(alice).receiveInterest({ value: ethers.parseEther("1") })
    ).to.be.revertedWithCustomError(dividends, "NotPool");
  });

  it("distributes interest proportionally", async () => {
    const { token, dividends, deployer, alice, bob } = await loadFixture(deployFixture);
    const supply = ethers.parseEther("100000000");

    // Give alice 30%, bob 70%
    await token.transfer(alice.address, (supply * 30n) / 100n);
    await token.transfer(bob.address, (supply * 70n) / 100n);

    // Deployer (mock pool) sends 1 ETH interest
    await dividends.receiveInterest({ value: ethers.parseEther("1") });

    const alicePending = await dividends.pendingReward(alice.address);
    const bobPending = await dividends.pendingReward(bob.address);

    // Allow tiny rounding
    expect(alicePending).to.be.closeTo(ethers.parseEther("0.3"), ethers.parseEther("0.00001"));
    expect(bobPending).to.be.closeTo(ethers.parseEther("0.7"), ethers.parseEther("0.00001"));
  });

  it("claim sends ETH and zeros balance", async () => {
    const { token, dividends, deployer, alice } = await loadFixture(deployFixture);
    await token.transfer(alice.address, await token.totalSupply());
    await dividends.receiveInterest({ value: ethers.parseEther("1") });

    const before = await ethers.provider.getBalance(alice.address);
    const tx = await dividends.connect(alice).claim();
    const receipt = await tx.wait();
    const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
    const after = await ethers.provider.getBalance(alice.address);

    expect(after - before + gasUsed).to.be.closeTo(ethers.parseEther("1"), ethers.parseEther("0.00001"));
    expect(await dividends.pendingReward(alice.address)).to.equal(0n);
  });

  it("claim reverts with nothing to claim", async () => {
    const { dividends, alice } = await loadFixture(deployFixture);
    await expect(dividends.connect(alice).claim()).to.be.revertedWithCustomError(dividends, "NothingToClaim");
  });

  it("snapshots correctly on transfer: new holder earns from transfer point only", async () => {
    const { token, dividends, deployer, alice, bob } = await loadFixture(deployFixture);
    const supply = await token.totalSupply();

    // First interest tranche -- alice holds 100%
    await token.transfer(alice.address, supply);
    await dividends.receiveInterest({ value: ethers.parseEther("1") });

    // Alice transfers half to bob
    await token.connect(alice).transfer(bob.address, supply / 2n);

    // Second interest tranche -- alice and bob split 50/50
    await dividends.receiveInterest({ value: ethers.parseEther("1") });

    // Alice should have: 1 ETH (first) + 0.5 ETH (second) = 1.5 ETH
    const alicePending = await dividends.pendingReward(alice.address);
    expect(alicePending).to.be.closeTo(ethers.parseEther("1.5"), ethers.parseEther("0.00001"));

    // Bob should have: 0 (first) + 0.5 ETH (second) = 0.5 ETH
    const bobPending = await dividends.pendingReward(bob.address);
    expect(bobPending).to.be.closeTo(ethers.parseEther("0.5"), ethers.parseEther("0.00001"));
  });

  it("setLoanPool can only be called once", async () => {
    const { dividends, alice } = await loadFixture(deployFixture);
    await expect(dividends.setLoanPool(alice.address)).to.be.revertedWithCustomError(dividends, "AlreadySet");
  });
});
