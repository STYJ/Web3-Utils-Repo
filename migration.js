const fs = require("fs");
const stdLog = require("./stdLog.js").stdLog;
const getTokenInfo = require("./getTokenInfo.js").getTokenInfo;
const config_abis = JSON.parse(fs.readFileSync("./config/ABI.json", "utf8"));
const config_addresses = JSON.parse(
  fs.readFileSync("./config/Addresses.json", "utf8")
);

const Web3 = require("web3");
const Tx = require("ethereumjs-tx").Transaction;
const BN = require("bignumber.js");
const kyber_network_ABI = config_abis.KyberNetwork;
const erc20_token_ABI = config_abis.ERC20;
require("dotenv").config();

const project_id = process.env.INFURA_PROJECT_ID;
const WS_PROVIDER = "wss://ropsten.infura.io/ws/v3/" + project_id;
const web3 = new Web3(new Web3.providers.WebsocketProvider(WS_PROVIDER));

var ALL_RESERVES = [];
const KYBER_NETWORK_ADDRESS = "0x753fe1914db38ee744e071baadd123f50f9c8e46";
const PRIVATE_KEY = Buffer.from("ENTER_USER_PRIVATE_KEY", "hex"); //exclude 0x prefix
var USER_ADDRESS = web3.eth.accounts.privateKeyToAccount(
  "0x" + PRIVATE_KEY.toString("hex")
).address;

async function main() {
  NETWORK = "ropsten";

  tokenInfo = await getTokenInfo(NETWORK, true, "");
  kyberContract = new web3.eth.Contract(
    kyber_network_ABI,
    KYBER_NETWORK_ADDRESS
  );
  for (var i = 1; i < tokenInfo.length; i++) {
    token = tokenInfo[i];
    console.log(`Token: ${token.symbol}`);
    await migrate(token.id, token.reserves_src);
  }
  console.log(ALL_RESERVES);
  process.exit(0);
}

async function migrate(tokenAddress, reserves) {
  try {
    for (var i = 0; i < reserves.length; i++) {
      reserve = reserves[i];
      if (!ALL_RESERVES.includes(reserve.toLowerCase())) {
        console.log(`Adding new reserve: ${reserve.toLowerCase()}`);
        txData = await kyberContract.methods
          .addReserve(reserve, true)
          .encodeABI();
        await broadcastTx(USER_ADDRESS, KYBER_NETWORK_ADDRESS, txData, 300000);
        ALL_RESERVES.push(tokenAddress);
      }
      console.log(`Listing pair for reserve: ${reserve.toLowerCase()}`);
      // list Pair For Reserve
      txData = await kyberContract.methods
        .listPairForReserve(reserve, tokenAddress, true, true, true)
        .encodeABI();
      await broadcastTx(USER_ADDRESS, KYBER_NETWORK_ADDRESS, txData, 800000);
    }
  } catch (err) {
    console.log(err);
  }

  return;
}

async function broadcastTx(from, to, txData, gasLimit) {
  let txCount = await web3.eth.getTransactionCount(from);
  //Method 1: Use a constant
  let gasPrice = new BN(25).times(10 ** 9); //25 Gwei
  let rawTx = {
    from: from,
    to: to,
    data: txData,
    gasLimit: web3.utils.toHex(gasLimit),
    gasPrice: web3.utils.toHex(gasPrice),
    nonce: txCount
  };

  let tx = new Tx(rawTx, {'chain': NETWORK});

  tx.sign(PRIVATE_KEY);
  const serializedTx = tx.serialize();
  txReceipt = await web3.eth
    .sendSignedTransaction("0x" + serializedTx.toString("hex"))
    .catch(error => console.log(error));

  // Log the tx receipt
  // console.log(txReceipt);
  return;
}

main();
