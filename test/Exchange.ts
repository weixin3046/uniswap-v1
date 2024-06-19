const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
import hre from "hardhat";

const toWei = (value: number) => hre.ethers.parseEther(value.toString());

const fromWei = (value: any) =>
  hre.ethers.formatEther(typeof value === "string" ? value : value.toString());

describe("Exchange", function () {
  beforeEach(function () {});
  async function deploys() {
    const [owner, otherAccount] = await hre.ethers.getSigners();
    const Token = await hre.ethers.getContractFactory("Token");
    const token = await Token.deploy("Token", "TKN", toWei(1000000));

    const Exchange = await hre.ethers.getContractFactory("Exchange");
    const exchange = await Exchange.deploy(token.target);

    return {
      Token,
      token,
      Exchange,
      exchange,
      owner,
      otherAccount,
    };
  }
  describe("addLiquidity", function () {
    it("adds liquidity", async function () {
      const { token, exchange } = await loadFixture(deploys);

      await token.approve(exchange.target, toWei(200));
      await exchange.addLiquidity(toWei(200), { value: toWei(100) });

      expect(await hre.ethers.provider.getBalance(exchange.target)).to.equal(
        toWei(100)
      );
      expect(await exchange.getReserve()).to.equal(toWei(200));
    });
  });
  describe("getPrice", function () {
    it("returns correct prices", async function () {
      const { token, exchange } = await loadFixture(deploys);
      await token.approve(exchange.target, toWei(2000));
      await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });
      const tokenReserve = await exchange.getReserve();
      const etherReserve = await hre.ethers.provider.getBalance(
        exchange.target
      );
      // tokenReserve == toWei(2000)     // etherReserve == toWei(1000)
      // Token price  = etherReserve / tokenReserve = 1000 / 2000 == 0.5
      // ETH price  = tokenReserve / etherReserve = 2000 / 1000 == 2

      // ETH per token
      expect(await exchange.getPrice(etherReserve, tokenReserve)).to.eq(500);

      // token per ETH
      expect(await exchange.getPrice(tokenReserve, etherReserve)).to.eq(2000);
    });
  });
  describe("getTokenAmount", async () => {
    it("returns correct token amount", async () => {
      const { token, exchange } = await loadFixture(deploys);
      await token.approve(exchange.target, toWei(2000));
      await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });

      let tokensOut = await exchange.getTokenAmount(toWei(1));
      expect(fromWei(tokensOut)).to.equal("1.998001998001998001");

      tokensOut = await exchange.getTokenAmount(toWei(100));
      expect(fromWei(tokensOut)).to.equal("181.818181818181818181");

      tokensOut = await exchange.getTokenAmount(toWei(1000));
      expect(fromWei(tokensOut)).to.equal("1000.0");
    });
  });
  describe("getEthAmount", async () => {
    it("returns correct ether amount", async () => {
      const { token, exchange } = await loadFixture(deploys);
      await token.approve(exchange.target, toWei(2000));
      await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });

      let ethOut = await exchange.getEthAmount(toWei(2));
      expect(fromWei(ethOut)).to.equal("0.999000999000999");

      ethOut = await exchange.getEthAmount(toWei(100));
      expect(fromWei(ethOut)).to.equal("47.619047619047619047");

      ethOut = await exchange.getEthAmount(toWei(2000));
      expect(fromWei(ethOut)).to.equal("500.0");
    });
  });

  describe("ethToTokenSwap", async () => {
    it("transfers at least min amount of tokens", async () => {
      const { token, exchange, otherAccount } = await loadFixture(deploys);
      // await token.transfer(otherAccount.address, toWei(2));
      // await token.connect(otherAccount).approve(exchange.target, toWei(2));
      await token.approve(exchange.target, toWei(2000));
      await exchange.addLiquidity(toWei(2000), { value: toWei(1000) });

      const userBalanceBefore = await hre.ethers.provider.getBalance(
        otherAccount.address
      );
      await exchange
        .connect(otherAccount)
        .ethToTokenSwap(toWei(1.99), { value: toWei(1) });

      const userBalanceAfter = await hre.ethers.provider.getBalance(
        otherAccount.address
      );
      expect(fromWei(userBalanceAfter - userBalanceBefore)).to.equal(
        "-1.0004877520006021"
      );
      const userTokenBalance = await token.balanceOf(otherAccount.address);
      expect(fromWei(userTokenBalance)).to.equal("1.998001998001998001");

      const exchangeEthBalance = await hre.ethers.provider.getBalance(
        exchange.address
      );
      expect(fromWei(exchangeEthBalance)).to.equal("1001.0");

      const exchangeTokenBalance = await token.balanceOf(exchange.address);
      expect(fromWei(exchangeTokenBalance)).to.equal("1998.001998001998001999");
    });

    // it("fails when output amount is less than min amount", async () => {
    //   await expect(
    //     exchange
    //       .connect(otherAccount)
    //       .ethToTokenSwap(toWei(2), { value: toWei(1) })
    //   ).to.be.revertedWith("insufficient output amount");
    // });

    // it("allows zero swaps", async () => {
    //   await exchange
    //     .connect(otherAccount)
    //     .ethToTokenSwap(toWei(0), { value: toWei(0) });

    //   const userTokenBalance = await token.balanceOf(otherAccount);
    //   expect(fromWei(userTokenBalance)).to.equal("0.0");

    //   const exchangeEthBalance = await getBalance(exchange.address);
    //   expect(fromWei(exchangeEthBalance)).to.equal("1000.0");

    //   const exchangeTokenBalance = await token.balanceOf(exchange.address);
    //   expect(fromWei(exchangeTokenBalance)).to.equal("2000.0");
    // });
  });
  // describe("tokenToEthSwap", async () => {
  //   const { token, exchange, exchange.target, otherAccount } =
  //     await loadFixture(deploys);

  //   it("transfers at least min amount of tokens", async () => {
  //     const userBalanceBefore = await getBalance(otherAccount);

  //     await exchange.connect(otherAccount).tokenToEthSwap(toWei(2), toWei(0.9));

  //     const userBalanceAfter = await getBalance(otherAccount);
  //     expect(fromWei(userBalanceAfter - userBalanceBefore)).to.equal(
  //       "0.9987649429999452"
  //     );

  //     const userTokenBalance = await token.balanceOf(otherAccount);
  //     expect(fromWei(userTokenBalance)).to.equal("0.0");

  //     const exchangeEthBalance = await getBalance(exchange.target);
  //     expect(fromWei(exchangeEthBalance)).to.equal("999.000999000999001");

  //     const exchangeTokenBalance = await token.balanceOf(exchange.target);
  //     expect(fromWei(exchangeTokenBalance)).to.equal("2002.0");
  //   });

  //   it("fails when output amount is less than min amount", async () => {
  //     await expect(
  //       exchange.connect(otherAccount).tokenToEthSwap(toWei(2), toWei(1.0))
  //     ).to.be.revertedWith("insufficient output amount");
  //   });

  //   it("allows zero swaps", async () => {
  //     await exchange.connect(otherAccount).tokenToEthSwap(toWei(0), toWei(0));

  //     const userBalance = await getBalance(otherAccount);
  //     expect(fromWei(userBalance)).to.equal("9999.995994295000999");

  //     const userTokenBalance = await token.balanceOf(otherAccount);
  //     expect(fromWei(userTokenBalance)).to.equal("2.0");

  //     const exchangeEthBalance = await getBalance(exchange.target);
  //     expect(fromWei(exchangeEthBalance)).to.equal("1000.0");

  //     const exchangeTokenBalance = await token.balanceOf(exchange.target);
  //     expect(fromWei(exchangeTokenBalance)).to.equal("2000.0");
  //   });
  // });
});
