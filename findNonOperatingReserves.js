#!/usr/bin/env node

const fs = require('fs');
const moment = require('moment');
const Web3 = require('./fetchWeb3');
const log = require('./stdLog');

process.on('unhandledRejection', console.error.bind(console));

const web3 = Web3.connect('mainnet');

const KyberNetworkProxyABI = JSON.parse(fs.readFileSync('./abi/KyberNetworkProxy.abi', 'utf8'));
const ERC20ABI =JSON.parse(fs.readFileSync('./abi/ERC20.abi', 'utf8'));
const KyberNetworkProxyAddress = '0x818E6FECD516Ecc3849DAf6845e3EC868087B755';
const NetworkProxyInstance = new web3.eth.Contract(KyberNetworkProxyABI, KyberNetworkProxyAddress);

const ETH_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
const KNC_ADDRESS = '0x8c13AFB7815f10A8333955854E6ec7503eD841B7';
const OMG_ADDRESS = '0x3750bE154260872270EbA56eEf89E78E6E21C1D9';
const MANA_ADDRESS = '0xe19Ec968c15f487E96f631Ad9AA54fAE09A67C8c';
const POLY_ADDRESS = '0x58A21f7aA3D9D83D0BD8D4aDF589626D13b94b45';
const SNT_ADDRESS = '0xA46E01606f9252fa833131648f4D855549BcE9D9';

async function main() {
  let expectedRate;
  let slippageRate;

  log('- START -');
  log(`KyberNetworkProxy (${KyberNetworkProxyAddress})`);

  ({ expectedRate, slippageRate } = await NetworkProxyInstance.methods
    .getExpectedRate(
      ETH_ADDRESS, // srcToken
      KNC_ADDRESS, // destToken
      web3.utils.toWei('1'), // srcQty
    )
    .call());
  log(
    `ETH <-> KNC getExpectedRate() = expectedRate: ${expectedRate}, slippageRate:${slippageRate}`,
  );

  ({ expectedRate, slippageRate } = await NetworkProxyInstance.methods
    .getExpectedRate(
      KNC_ADDRESS, // srcToken
      ETH_ADDRESS, // destToken
      web3.utils.toWei('1'), // srcQty
    )
    .call());
  log(
    `KNC <-> ETH getExpectedRate() = expectedRate: ${expectedRate}, slippageRate:${slippageRate}`,
  );

  log('- END -');
}

// Start the script
main();
