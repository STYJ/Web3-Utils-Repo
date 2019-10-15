#!/usr/bin/env node

require("dotenv").config();
const Axios = require("axios");
const BN = require("bn.js");
const fs = require("fs");
const Web3 = require("web3");
const winston = require("winston");
const { gasPrice, privateKey, provider } = require("yargs")
  .usage(
    "Usage: $0 --gas-price [gwei] --private-key [file] --provider [provider]"
  )
  .demandOption(["privateKey"]).argv;
const axios = Axios.create({
  baseURL: "https://api.etherscan.io/",
  timeout: 20000
});
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss.SSS"
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.prettyPrint(),
    winston.format.printf(({ message, timestamp }) => {
      return `${timestamp}] ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize({ all: true }))
    })
  ]
});

const swapWinners = [
  // "0x5deb1c8b3b517b98cedf2210807045b2770adb74",
  // "0xaefb948f84224b70e6a935d96b684fa20fca0ecf",
  // "0xf4bf21c4c47159ebfc16995afe86cf43462bb88a",
  // "0xB44E5C42ADAB24Cc18506e8B81Eb9B5988e19fFf",
  // "0x1882A7CE4df61a611E296818A3d7c76418E1a0A8",
  "0x3A44ED000762CD64AE032EF73AB0948E9F4EF75F",
  "0x8316c9065424c21aBD198d6f501a576710305E7e",
  "0x04458691CbC1Dd54c20E6790CaAbF38beb6420A7",
  "0xe9af1c78E95659505c72Ad0d7534a5D34b4D418D",
  "0x1eEf8a3ed72c8feA8a40DB6B0D0a09B433D1387E",
  "0xcd4b2D8B7f371cd23930115DA4c23ee570aa1622",
  "0x57C5c33Bcb4Fdb2C40Ca94Af291710E9C88B5Aac",
  "0x083Eecf084aF2ab3e56a4e6d14a70E60f96aEbD1",
  "0x66f8f6291D9B541FdEC853603054Bc9D459eeCBB",
  "0xbaCA0C118bF708Ebd9926a14A34AE6F2CcF4F380",
  "0xD4fFA3a5Ce71F521ef52Eb0207df2046068FD32C",
  "0x83a6141B87B83F1E0C97e3ed1A26bdF0C75a10b8",
  "0x678628439034812a1A85DFAF9967f056c7f96cbB",
  "0x315Ec2aa315618C0651DA54B5Bb36837C4Ad6C38",
  "0x629f8665B60E987D69E1A5dE4100bB83c48CdA3F",
  "0xB970AB0a958148D1a0efFAf3FfE7B40C22fAA343",
  "0xB7687CDfaD9c0238Ee62a1a9CA676BA520f12342",
  "0x6c3fc444f096B6D70e6AFc8e2b8C706A8889343a",
  "0x35742c176aE717857A2E749e9F31c84d08A678A0",
  "0x14ABf98e61D724EB595CA77a3fbe4F65cf04ad76",
  "0xB591BD73F62E35DEB26FA54FB711C7D7DC10EA3E",
  "0xF1125ADF00C95CFBD906D49CFC2167DC32A6CCFB",
  "0x20F29de94Bc121f04635aD18404461d935DFdC1b",
  "0x54E7fae79Fb5Dc9B8ba67ba3b3970a0c7E2CD413",
  "0x0A6d74028820586782E46Bb2c5027146B6657e25",
  "0xC709d908D7d33778c2007f94Ec67AcE709EbF3E5",
  "0x3B11B5e3382F0047F9C5f024628Fa669D44320A9",
  "0xFd88D3785CbEA127Dd530560347db58899cB168e",
  "0xbaccbC1130c8EB896Cb1102b7C78580EBb31FF8f",
  "0x3CF2eEB41AD308C6De03C4A605fD609f87f2C25d",
  "0x644692F60EAD1866251F4E4A7782852A71571A9C",
  "0xBeB308CbFedFd99AFD537beeb9390558eB6f0dAF",
  "0x24d01cff5ef383cccb0c468390d4045bba697729",
  "0xa4af849bb993ff054d81f5b5ef85b6594789cacc",
  "0x96B0158473Dfab97769892c12AE409164209C361",
  "0x003a8a320a357b8e100e96e969044d14732228c5",
  "0x4a392aad4dccf1df645466f7a591315d6beae175",
  "0x0547CA26791BC32D4E828F85F016C1CA9575BF00",
  "0xF4bb04cE129927ecb7a8898EFdA5eD71AE578f22",
  "0x1C06C25C9FA93771E92382BC325B504FBDC31A70",
  "0x50DC3F0CF3FA5B68501DF9BE0765FF0721350BE9",
  "0x33730625F0AFD64B393F00D9CE0C65BA91C04884",
  "0x9bF35e973D2BD4c6652FD1996bFbD84a3C6Baa35",
  "0x0e23F7d8463EDD31B350AD06021181909F39A686",
  "0x3A2E0373541650573C81A0CF5FA17B0CD8367486",
  "0xbdb4c15e80490b29b7f8d39e681f4bdf35ee24e7",
  "0x04beE89f8a0A98DD2b533EcDe43B3E89f8d9140E",
  "0x8246b4da582f9789b4269547549eef377b1126f8",
  "0x1a5a786c33df9b5861ea8584c1cfaea240e7fa2f",
  "0x01a91a90bec8bfd8fa3d386fac50d7f671107230",
  "0xfda6ff1A18C331F35F7a5E91fd5Ca7ddb6267136",
  "0x7a728ccfa1f06daf69eb8cfb59e337055b68a729",
  "0x0e041c184f87dea85c32226dbfb7e8c306fd07ef",
  "0x0de95e7df014a0bcb991a798cfd7d3e53e832908"
];

const limitWinners = [
  "0xa9021CC258DcC989D8DDE437783052B15C859B72",
  "0x0f21f32ca6cf0e80b68137745f85be8a87e63cc3",
  "0xc8558d2f871ad3ef19c65beb2a7ba955f947b6b0",
  "0xb7096eeb6999da5a44db73dac3f0862b95da12bd"
];

let account;
let web3;
let gas_price;
let gas_limit;
let DAInstance;

process.on("unhandledRejection", console.error.bind(console));

function tx(result, text) {
  logger.info();
  logger.info(`   ${text}`);
  logger.info("   --------------------------");
  logger.info(`   > transaction hash: ${result.transactionHash}`);
  logger.info(`   > gas used: ${result.gasUsed}`);
  logger.info();
}

async function sendTx(txObject) {
  const nonce = await web3.eth.getTransactionCount(account.address);
  const txData = txObject.encodeABI();
  const txFrom = account.address;
  const txTo = txObject._parent.options.address;
  const txValue = 0;
  const txKey = account.privateKey;

  try {
    gas_limit = await txObject.estimateGas();
  } catch (e) {
    gas_limit = 100000;
  }

  const txParams = {
    from: txFrom,
    to: txTo,
    data: txData,
    value: txValue,
    gas: gas_limit,
    gasPrice: gas_price,
    nonce: nonce
  };

  const signedTx = await web3.eth.accounts.signTransaction(txParams, txKey);

  logger.info(`Broadcasting tx: ${signedTx.rawTransaction}`);
  return web3.eth.sendSignedTransaction(signedTx.rawTransaction);
}

async function getGasPrice() {
  if (typeof gasPrice !== "undefined") {
    return web3.utils.toWei(new BN(gasPrice), "gwei");
  }

  return new BN(await web3.eth.getGasPrice()).mul(1.3);
}

async function getABI(address) {
  const result = await axios.get("api", {
    params: {
      apikey: process.env.ETHERSCAN_API_KEY,
      module: "contract",
      action: "getabi",
      address
    }
  });

  return JSON.parse(result.data.result);
}

function getAccount() {
  const data = fs.readFileSync(privateKey, "utf8");

  return web3.eth.accounts.privateKeyToAccount(data);
}

function getProvider() {
  let rpcUrl;

  if (provider === "node") {
    rpcUrl = "http://localhost:8545"; // Local node
  } else {
    rpcUrl = `https://ropsten.infura.io/v3/${process.env.INFURA_PROJECT_ID}`;
  }

  return new Web3(new Web3.providers.HttpProvider(rpcUrl));
}

async function setInstances() {
  const DAIAddress = "0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359";
  const RopstenDAI = "0xaD6D458402F60fD3Bd25163575031ACDce07538D";
  const DAIABI = await getABI(DAIAddress);
  DAIInstance = new web3.eth.Contract(DAIABI, DAIAddress);
}

async function main() {
  logger.info("- START -");

  web3 = getProvider();
  await setInstances();
  account = getAccount();
  gas_price = await getGasPrice();

  logger.info(`Account: ${account.address}`);
  logger.info(`Gas Price: ${gas_price}`);
  logger.info("===========================================================");

  let initialETH = await web3.eth.getBalance(account.address);
  let DAIAmount = new BN(0);
  let result;

  for (let index in swapWinners) {
    logger.info(`- ${parseInt(index) + 1} of ${swapWinners.length} -`);
    logger.info(`Winner: ${swapWinners[index]}`);

    DAIAmount = new BN(5)
      .mul(new BN(10).pow(new BN(await DAIInstance.methods.decimals().call())))
      .toString();
    result = await sendTx(
      DAIInstance.methods.transfer(swapWinners[index], DAIAmount)
    );
    tx(result, "transfer()");

    logger.info("------------");
  }
  for (let index in limitWinners) {
    logger.info(`- ${parseInt(index) + 1} of ${limitWinners.length} -`);
    logger.info(`Winner: ${limitWinners[index]}`);

    DAIAmount = new BN(10)
      .mul(new BN(10).pow(new BN(await DAIInstance.methods.decimals().call())))
      .toString();
    result = await sendTx(
      DAIInstance.methods.transfer(swapWinners[index], DAIAmount)
    );
    tx(result, "transfer()");

    logger.info("------------");
  }

  let finalETH = await web3.eth.getBalance(account.address);
  logger.info(
    `ETH Spent for Txs: ${web3.utils.fromWei(
      new BN(initialETH).sub(new BN(finalETH))
    )}`
  );

  logger.info("- END -");
}

// Start the script
main();
