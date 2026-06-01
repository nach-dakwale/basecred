require("ts-node").register({
  transpileOnly: true,
  compilerOptions: { module: "commonjs", moduleResolution: "node" },
});
require("./BaseCreditToken.test.ts");
require("./CredDividends.test.ts");
require("./CredPrivateSale.test.ts");
require("./LoanPool.dividends.test.ts");
