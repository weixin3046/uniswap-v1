import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TokenModule", (m) => {
  const apollo = m.contract("Token", ["token", "UINV2", (10 ** 18).toString()]);

  //   m.call(apollo, "launch", []);

  return { apollo };
});
