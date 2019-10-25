#!/usr/bin/env node

const Axios = require("axios");
const BN = require('bn.js');
const fs = require('fs');
const Web3 = require('web3');

process.on('unhandledRejection', console.error.bind(console));

async function main() {
  const rpcUrl = 'http://localhost:8545'; // Local Parity node
  const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

  const walletAddress = '0x440bBd6a888a36DE6e2F6A25f65bc4e16874faa9';
  const KNCAddress = '0xdd974D5C2e2928deA5F71b9825b8b646686BD200';
  const KNCTokenABI = JSON.parse(fs.readFileSync('./abi/KNC.abi', 'utf8'));
  const KNC = new web3.eth.Contract(KNCTokenABI, KNCAddress);

  console.log(`KNC: ${KNC._address}`);
  console.log(`Wallet: ${walletAddress}`);

  const Transfer = await KNC.getPastEvents('Transfer', {
    filter: {
      _to: '0x440bBd6a888a36DE6e2F6A25f65bc4e16874faa9',
    },
    fromBlock: 8077741,
    toBlock: 8244825,
  });

  let totalTransfers = new BN(0);

  for (let index in Transfer) {
    totalTransfers = totalTransfers.add(new BN(Transfer[index].returnValues._value));
  }

  console.log(`Total: ${web3.utils.fromWei(totalTransfers)}`)
}

async function uniswap() {
  const axios = Axios.create({
    baseURL: "https://api.etherscan.io/",
    timeout: 20000
  });
  const rpcUrl = 'http://localhost:8545'; // Local Parity node
  const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

  const UniswapAddress = '0x5D154c145Db2ca90B8aB5e8Fe3E716AfA4AB7Ff0';
  const abi = await axios.get("api", {
    params: {
      apikey: process.env.ETHERSCAN_API_KEY,
      module: "contract",
      action: "getabi",
      address: UniswapAddress,
    }
  });
  const UniswapABI = JSON.parse(abi.data.result);
  const Uniswap = new web3.eth.Contract(UniswapABI, UniswapAddress);

  console.log(`Uniswap: ${UniswapAddress._address}`);

  const TokenListed = await Uniswap.getPastEvents('TokenListed', {
    fromBlock: 8077741,
    toBlock: 'latest',
  });

  console.log(TokenListed);
}

// Start the script
// main();
uniswap();
