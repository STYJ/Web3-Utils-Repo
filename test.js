//jshint esversion:8
const fs = require('fs');
const moment = require('moment');
const Web3 = require('web3');
const HDWalletProvider = require('truffle-hdwallet-provider');
require('dotenv').config();

process.on('unhandledRejection', console.error.bind(console));

// Retrieve config addresses, abis and test details
const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_addresses = JSON.parse(fs.readFileSync('./config/Addresses.json', 'utf8'));
const config_test_details = JSON.parse(fs.readFileSync('./config/TestDetails.json', 'utf8'));

const network = "ropsten";

// Connecting to ropsten infura node
const {
  addresses,
  wallets,
  web3
} = connect(network);

// Eth and KNC addresses
const eth_address = network == "ropsten" ? config_addresses.Ropsten.ETH : config_addresses.Mainnet.ETH;
const knc_address = network == "ropsten" ? config_addresses.Ropsten.KNC : config_addresses.Mainnet.KNC;

async function main() {
  // Call your function here.
  testLCRSetup();
}

main();

/********************
 * HELPER FUNCTIONS *
 ********************/

 // Print input
 function stdlog(input) {
   console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss.SSS')}] ${input}`);
 }

 // Print txn result
 function tx(result, call) {
   const logs = (result.logs.length > 0) ? result.logs[0] : {
     address: null,
     event: null
   };
   console.log();
   console.log(`   ${call}`);
   console.log('   ------------------------');
   console.log(`   > transaction hash: ${result.transactionHash}`);
   console.log(`   > gas used: ${result.gasUsed}`);
   console.log();
 }

// Connect to either Ropsten or Mainnet
function connect(network) {
  const project_id = process.env.INFURA_PROJECT_ID; //Replace this with your own Project ID
  const infura_url = network == "ropsten" ? "https://ropsten.infura.io/v3/" + project_id : "https://mainnet.infura.io/v3/" + project_id;
  const mnemonic = process.env.MNEMONIC;
  const provider = new HDWalletProvider(mnemonic, infura_url, 0, 10);
  const web3 = new Web3(provider);
  const {
    addresses,
    wallets
  } = provider;
  return {
    addresses: addresses,
    wallets: wallets,
    web3: web3,
  };
}


function getLCRSetupDetails() {
  return {
    token_symbol: config_test_details.LCRSetup.TokenSymbol,
    token_address: config_test_details.LCRSetup.TokenAddress,
    liquidity_rate: config_test_details.LCRSetup.LiquidityRate,
    kyber_reserve_abi: config_abis.KyberReserve,
    kyber_reserve_address: config_test_details.LCRSetup.KyberReserveAddress,
  };
}

function getOrderbookDetails() {
  return {
    abyss_orderbook_reserve_address: config_test_details.OrderbookReserveLimits.AbyssOrderbookReserveAddress,
    wax_orderbook_reserve_address: config_test_details.OrderbookReserveLimits.WaxOrderbookReserveAddress,
    orderbook_reserve_abi: config_abis.OrderbookReserve
  };
}

async function getOrderbookReserveLimits() {
  let orderbookReserveDetails = getOrderbookDetails();
  const abyss_orderbook_reserve_instance = new web3.eth.Contract(orderbookReserveDetails.orderbook_reserve_abi, orderbookReserveDetails.abyss_orderbook_reserve_address);
  const wax_orderbook_reserve_instance = new web3.eth.Contract(orderbookReserveDetails.orderbook_reserve_abi, orderbookReserveDetails.wax_orderbook_reserve_address);

  stdlog('- START -');
  stdlog(`Abyss Orderbook Reserve: ${orderbookReserveDetails.abyss_orderbook_reserve_address}`);
  ({
    minNewOrderSizeUsd,
    maxOrdersPerTrade,
    minNewOrderSizeWei,
    minOrderSizeWei
  } = await abyss_orderbook_reserve_instance.methods.limits().call());
  stdlog(`minNewOrderUsd: ${minNewOrderSizeUsd}`);
  stdlog(`maxOrdersPerTrade: ${maxOrdersPerTrade}`);
  stdlog(`minNewOrderSizeWei: ${minNewOrderSizeWei}`);
  stdlog(`minOrderSizeWei: ${minOrderSizeWei}`);

  console.log("");
  stdlog(`Wax Orderbook Reserve: ${orderbookReserveDetails.wax_orderbook_reserve_address}`);
  ({
    minNewOrderSizeUsd,
    maxOrdersPerTrade,
    minNewOrderSizeWei,
    minOrderSizeWei
  } = await wax_orderbook_reserve_instance.methods.limits().call());
  stdlog(`minNewOrderUsd: ${minNewOrderSizeUsd}`);
  stdlog(`maxOrdersPerTrade: ${maxOrdersPerTrade}`);
  stdlog(`minNewOrderSizeWei: ${minNewOrderSizeWei}`);
  stdlog(`minOrderSizeWei: ${minOrderSizeWei}`);
  stdlog('- END -');
}

//  Test that liquidity conversion rate has been setup correct
async function testLCRSetup() {
  // Getting test details
  let testDetails = getLCRSetupDetails();

  // Get instance of Kyber Reserve
  const kyber_reserve_instance = new web3.eth.Contract(testDetails.kyber_reserve_abi, testDetails.kyber_reserve_address);

  // Perform the actual testing
  let rate_1;
  let rate_2;

  stdlog('- START -');
  stdlog(`${testDetails.token_symbol} Ropsten Reserve: ${testDetails.kyber_reserve_address}`);
  stdlog(`Running getConversionRate(ETH, ${testDetails.token_symbol}) for 1 Eth and 2 Eth worth`);
  (rate_1 = await kyber_reserve_instance.methods.getConversionRate(
    eth_address, // srctoken
    testDetails.token_address, // dstToken
    web3.utils.toWei('1'), // srcQty
    0, // blockNumber
  ).call());

  (rate_2 = await kyber_reserve_instance.methods.getConversionRate(
    eth_address, // srctoken
    testDetails.token_address, // dstToken
    web3.utils.toWei('2'), // srcQty
    0, // blockNumber
  ).call());

  stdlog(`For 1 ETH, 1 ${testDetails.token_symbol} = ${1/rate_1} ETH`);
  stdlog(`For 2 ETH, 1 ${testDetails.token_symbol} = ${1/rate_2} ETH`);
  stdlog(`Observed Rate change = ${((1/rate_2) - (1/rate_1))/(1/rate_1)}`);
  stdlog(`Expected Rate change = ${testDetails.liquidity_rate/2}`);
  stdlog('- END -');
}
