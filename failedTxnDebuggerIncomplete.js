// jshint esversion:8
const fs = require('fs');
const fetch = require('node-fetch');
const connect = require("./fetchWeb3.js").connect;
const stdLog = require("./stdLog.js").stdLog;

const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_addresses = JSON.parse(fs.readFileSync('./config/Addresses.json', 'utf8'));
const BN = require('bignumber.js');

//CHANGE THIS
NETWORK = "mainnet";
TXN_HASH = "0x17acba168e1736ed5403306a4bd439ef13669c2a92577703e6042069d413a520";


const { web3 } = connect(NETWORK);

async function main() {
  stdLog(`Debugging transaction: ${TXN_HASH}`, `cyan`);
  let txn = await getTransaction(TXN_HASH);
  console.log(txn);
  let input = txn.input;
  let to = txn.to;

  let fn_name = await getFnName(input);
  let contract_name = getContractName(to);
  let fn_params = getFnParams(fn_name, contract_name);
  let fn_args = getFnArgs(input);
  printCleanedInput(fn_name, fn_params, fn_args);

  process.exit(0);
}

////////////////////////////////////////////
/// HELPER FUNCTIONS TO DEBUG FAILED TXN ///
////////////////////////////////////////////

async function getTransaction(hash) {
  let txn = await web3.eth.getTransaction(hash);
  return txn;
}

async function getSignature(hex) {
  const BASE_URL = "https://www.4byte.directory/api/v1/signatures/?hex_signature=";
  let response = await fetch(`${BASE_URL}${hex}`);
  let response_json = await response.json();
  if(response_json.count === 1) {
    return response_json.results[0].text_signature;
  }
  stdLog(`Function signature ${hex} does not exist in 4bytes.dictionary`, 'error');
  process.exit(0);
}

async function getFnName(input) {
  let fn_sig_hex = input.slice(0, 10);
  let fn_sig_text = await getSignature(fn_sig_hex);
  let index = fn_sig_text.indexOf('(');
  return fn_sig_text.slice(0, index);
}

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

function getContractName(address) {
  let contract_addresses = config_addresses[NETWORK];
  let name = getKeyByValue(contract_addresses, address);
  if(name) {
    return name;
  }
  stdLog(`Address ${address} is not one of the valid kyber addresses.`, 'error');
  process.exit(0);
}

function getFnParams(fn_name, contract_name) {
  let abi = config_abis[contract_name];
  let args = abi.find(fn => fn.name === fn_name);
  if(args) {
    return args.inputs;
  }
  stdLog(`Function ${fn_name} does not exist in contract ${contract_name}.`, 'error');
  process.exit(0);
}

function getFnArgs(input) {
  return input.slice(10,).match(/.{1,64}/g);
}

function cleanInput(fn_params, fn_args) {

}

function printCleanedInput(fn_name, fn_params, fn_args, colour) {
  stdLog(`${"Function".padEnd(21, ' ')}: ${fn_name}`);
  for(let i = 0; i < fn_params.length; i ++) {
    stdLog(`${fn_params[i].name.padEnd(21, ' ')}: ${fn_args[i]}`, colour);
  }
}



main();
