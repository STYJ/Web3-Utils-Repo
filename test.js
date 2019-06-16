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

// Connecting to ropsten infura node
const project_id = process.env.PROJECT_ID; //Replace this with your own Project ID
// const infura_ropsten_url = "https://ropsten.infura.io/v3/" + project_id;
const infura_mainnet_url = "https://mainnet.infura.io/v3/" + project_id;
const mnemonic = process.env.MNEMONIC;
const provider = new HDWalletProvider(mnemonic, infura_mainnet_url, 0, 10);
const web3 = new Web3(provider);
const {
  addresses,
  wallets
} = provider;

// Ropsten Eth and KNC token addresses
// const ropsten_eth_address = config_addresses.Ropsten.ETH;
// const ropsten_knc_address = config_addresses.Ropsten.KNC;

// Mainnet Eth and KNC token addresses
const mainnet_eth_address = config_addresses.Mainnet.ETH;
const mainnet_knc_address = config_addresses.Mainnet.KNC;

// Helper functions
function stdlog(input) {
  console.log(`${moment().format('YYYY-MM-DD HH:mm:ss.SSS')}] ${input}`);
}

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

function getLCRSetupDetails() {
  return {
    token_symbol: config_test_details.TestingLCRSetup.TokenSymbol,
    token_address: config_test_details.TestingLCRSetup.TokenAddress,
    liquidity_rate: config_test_details.TestingLCRSetup.LiquidityRate,
    kyber_reserve_abi: config_abis.KyberReserve,
    kyber_reserve_address: config_test_details.TestingLCRSetup.KyberReserveAddress,
  };
}

function getOrderbookDetails() {
  return {
    abyss_orderbook_reserve_address: config_test_details.GetOrderbookReserveLimits.AbyssOrderbookReserveAddress,
    wax_orderbook_reserve_address: config_test_details.GetOrderbookReserveLimits.WaxOrderbookReserveAddress,
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
    ropsten_eth_address, // srctoken
    testDetails.token_address, // dstToken
    web3.utils.toWei('1'), // srcQty
    0, // blockNumber
  ).call());

  (rate_2 = await kyber_reserve_instance.methods.getConversionRate(
    ropsten_eth_address, // srctoken
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

// Start the script
// testLCRSetup();
getOrderbookReserveLimits()
