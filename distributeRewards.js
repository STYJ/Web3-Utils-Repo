const fs = require("fs");
const connect = require("./fetchWeb3.js").connect;
const BN = require('bn.js');
const winston = require("winston");
const { gasPrice } = require("yargs")
  .usage(
    "Usage: $0 --gas-price [gwei]"
  )
  .demandOption(["gasPrice"]).argv;

const logger = getLogger();
const configABIs = JSON.parse(fs.readFileSync("./config/ABI.json", "utf8"));

const winners = (fs.readFileSync("./config/winners.txt", "utf8")).split('\n');

const network = "mainnet";
const { web3, addresses, wallets } = connect(network);

let KNCInstance;
let gas_price;


async function main() {
  logger.info("- START -");
  
  KNCInstance = await getInstance();
  gas_price = await getGasPrice();

  logger.info(`Account: ${addresses[0]}`);
  logger.info(`Gas Price: ${gas_price}`);
  logger.info("===========================================================");

  let initialETH = await web3.eth.getBalance(addresses[0]);
  let KNCAmount = new BN(0);
  let result;

  for (let index in winners) {
    logger.info(`- ${parseInt(index) + 1} of ${winners.length} -`);
    logger.info(`Winner: ${winners[index]}`);

    KNCAmount = new BN(156)
      .mul(new BN(10).pow(new BN(await KNCInstance.methods.decimals().call())))
      .add(new BN(1)
      .mul(new BN(10).pow(new BN(await KNCInstance.methods.decimals().call()).sub(new BN(1)))))
      .toString();
    result = await sendTx(
      KNCInstance.methods.transfer(winners[index], KNCAmount)
    );
    tx(result, "transfer()");

    logger.info("------------");
  }

  let finalETH = await web3.eth.getBalance(addresses[0]);
  logger.info(
    `ETH Spent for Txs: ${web3.utils.fromWei(
      new BN(initialETH).sub(new BN(finalETH))
    )}`
  );

  logger.info("- END -");
  process.exit(0);
}

async function getInstance() {
  const KNCAddress = "0xdd974d5c2e2928dea5f71b9825b8b646686bd200";
  const RopstenKNC = "0x4E470dc7321E84CA96FcAEDD0C8aBCebbAEB68C6";
  const KNCABI = configABIs.ERC20;
  return new web3.eth.Contract(KNCABI, KNCAddress);
}


async function getGasPrice() {
  if (typeof gasPrice !== "undefined") {
    return web3.utils.toWei(new BN(gasPrice.toString()), "gwei");
  }
}


function getLogger() {
  return winston.createLogger({
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
}

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
  const nonce = await web3.eth.getTransactionCount(addresses[0]);
  const txData = txObject.encodeABI();
  const txFrom = addresses[0];
  const txTo = txObject._parent.options.address;
  const txValue = 0;
  const txKey = "0x" + wallets[addresses[0]]._privKey.toString('hex');
  let gas_limit;
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

  logger.info(`Raw tx: ${signedTx.rawTransaction}`);
  return web3.eth.sendSignedTransaction(signedTx.rawTransaction);
}



main();
