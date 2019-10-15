#!/usr/bin/env node

const BN = require('bn.js');
const fs = require('fs');
const Web3 = require('web3');

process.on('unhandledRejection', console.error.bind(console));

async function main() {
  const rpcUrl = 'http://localhost:8545'; // Local Parity node
  const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

  const FeeBurnerAddress = '0x52166528FCC12681aF996e409Ee3a421a4e128A3';
  const FeeBurnerABI = JSON.parse(fs.readFileSync('./abi/FeeBurner.abi', 'utf8'));
  const FeeBurnerInstance = new web3.eth.Contract(FeeBurnerABI, FeeBurnerAddress);
  const SCPReserve = '0x7a3370075a54B187d7bD5DceBf0ff2B5552d4F7D';

  console.log(`FeeBurner: ${FeeBurnerInstance._address}`);
  console.log(`SCP Reserve: ${SCPReserve}`);

  const AssignFeeToWallet = await FeeBurnerInstance.getPastEvents('AssignFeeToWallet', {
    fromBlock: 7885210, // SCP Reserve contract deployment
    toBlock: 8255564 // Block where fee changed to 13 BPS
  });
  const AssignBurnFees = await FeeBurnerInstance.getPastEvents('AssignBurnFees', {
    fromBlock: 7885210, // SCP Reserve contract deployment
    toBlock: 8255564 // Block where fee changed to 13 BPS
  });
  const shareFees = AssignFeeToWallet.filter(o => o.returnValues.reserve.toLowerCase() === SCPReserve.toLowerCase());
  const burnFees = AssignBurnFees.filter(o => o.returnValues.reserve.toLowerCase() === SCPReserve.toLowerCase());

  let totalShareFees = new BN(0);
  let totalBurnFees = new BN(0);

  for (let index in shareFees) {
    totalShareFees = totalShareFees.add(new BN(shareFees[index].returnValues.walletFee));
  }
  for (let index in burnFees) {
    totalBurnFees = totalBurnFees.add(new BN(burnFees[index].returnValues.burnFee));
  }

  console.log(`Total: ${web3.utils.fromWei(totalShareFees.add(totalBurnFees))}`)
}

// Start the script
main();
