import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

async function deployFixture() {
  const [owner, alice, bob] = await ethers.getSigners();
  const Token = await ethers.getContractFactory("BaseCreditToken");
  const token = await Token.deploy(owner.address);
  return { token, owner, alice, bob };
}

describe("BaseCreditToken", () => {
  it("mints 100M tokens to initial owner", async () => {
    const { token, owner } = await loadFixture(deployFixture);
    const supply = await token.totalSupply();
    expect(supply).to.equal(ethers.parseEther("100000000"));
    expect(await token.balanceOf(owner.address)).to.equal(supply);
  });

  it("has correct name and symbol", async () => {
    const { token } = await loadFixture(deployFixture);
    expect(await token.name()).to.equal("BaseCreditToken");
    expect(await token.symbol()).to.equal("baseCREDIT");
  });

  it("setDividends can only be called once", async () => {
    const { token, owner, alice, bob } = await loadFixture(deployFixture);
    await token.setDividends(alice.address);
    expect(await token.dividends()).to.equal(alice.address);
    await expect(token.setDividends(bob.address)).to.be.revertedWithCustomError(token, "AlreadySet");
  });

  it("setDividends reverts for zero address", async () => {
    const { token } = await loadFixture(deployFixture);
    await expect(token.setDividends(ethers.ZeroAddress)).to.be.revertedWithCustomError(token, "ZeroAddress");
  });

  it("non-owner cannot setDividends", async () => {
    const { token, alice, bob } = await loadFixture(deployFixture);
    await expect(token.connect(alice).setDividends(bob.address)).to.be.revertedWithCustomError(token, "NotOwner");
  });

  it("transfers work normally", async () => {
    const { token, owner, alice } = await loadFixture(deployFixture);
    await token.transfer(alice.address, ethers.parseEther("1000"));
    expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("1000"));
  });

  it("supports ERC20Votes delegation", async () => {
    const { token, owner, alice } = await loadFixture(deployFixture);
    await token.delegate(alice.address);
    const votes = await token.getVotes(alice.address);
    expect(votes).to.equal(await token.totalSupply());
  });

  it("transferOwnership changes owner", async () => {
    const { token, owner, alice } = await loadFixture(deployFixture);
    await token.transferOwnership(alice.address);
    expect(await token.owner()).to.equal(alice.address);
  });
});
