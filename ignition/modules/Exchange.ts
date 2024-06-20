import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ExchangeModule", (m) => {
  const token = m.contract("Token", ["Token", "TKN", (10 ** 18).toString()]);
  //   token = await Token.deploy("Token", "TKN", (10 ** 18).toString());
  //   await token.deployed();
  const exchange = m.contract("Exchange", [token]);

  return { exchange };
});
