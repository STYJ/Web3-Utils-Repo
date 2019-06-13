//jshint esversion:8
const fs = require('fs');
const moment = require('moment');
const Web3 = require('web3');
const HDWalletProvider = require('truffle-hdwallet-provider');
require('dotenv').config();

process.on('unhandledRejection', console.error.bind(console));

// Connecting to ropsten infura node
const project_id = process.env.PROJECT_ID; //Replace this with your own Project ID
const infura_ropsten_url = "https://ropsten.infura.io/v3/" + project_id;
const mnemonic = process.env.MNEMONIC;
const provider = new HDWalletProvider(mnemonic, infura_ropsten_url, 0, 10);
const web3 = new Web3(provider);
const { addresses, wallets } = provider;

// Retrieve config addresses
const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_addresses = JSON.parse(fs.readFileSync('./config/Addresses.json', 'utf8'));

// Get instance of Ropsten KyberReserve for MYB
const KyberReserveABI = config_abis.KyberReserve;
const RopstenKyberReserveAddress = config_addresses.Ropsten.KyberReserve;
const RopstenKyberReserveInstance = new web3.eth.Contract(KyberReserveABI, RopstenKyberReserveAddress);

const ropsten_eth_address = config_addresses.Ropsten.ETH;
const ropsten_knc_address = config_addresses.Ropsten.KNC;
const ropsten_myb_address = config_addresses.Ropsten.MYB;
const liquidity_rate = 0.00723888314;

function stdlog(input) {
  console.log(`${moment().format('YYYY-MM-DD HH:mm:ss.SSS')}] ${input}`);
}

function tx(result, call) {
  const logs = (result.logs.length > 0) ? result.logs[0] : { address: null, event: null };
  console.log();
  console.log(`   ${call}`);
  console.log('   ------------------------');
  console.log(`   > transaction hash: ${result.transactionHash}`);
  console.log(`   > gas used: ${result.gasUsed}`);
  console.log();
}

async function main() {
  let rate_1;
  let rate_2;

  stdlog('- START -');
  stdlog(`MyBit Ropsten Reserve: ${RopstenKyberReserveAddress}`);
  stdlog(`Running getConversionRate(ETH, MYB) for 1 Eth and 2 Eth worth`);
  ( rate_1 = await RopstenKyberReserveInstance.methods.getConversionRate(
    ropsten_eth_address, // srctoken
    ropsten_myb_address, // dstToken
    web3.utils.toWei('1'), // srcQty
    0, // blockNumber
  ).call());

  ( rate_2 = await RopstenKyberReserveInstance.methods.getConversionRate(
    ropsten_eth_address, // srctoken
    ropsten_myb_address, // dstToken
    web3.utils.toWei('2'), // srcQty
    0, // blockNumber
  ).call());

  stdlog(`For 1 ETH, 1 MYB = ${1/rate_1} ETH`);
  stdlog(`For 2 ETH, 1 MYB = ${1/rate_2} ETH`);
  stdlog(`Observed Rate change = ${((1/rate_2) - (1/rate_1))/(1/rate_1)}`);
  stdlog(`Expected Rate change = ${liquidity_rate/2}`);

  stdlog('- END -');
}

// Start the script
main();
