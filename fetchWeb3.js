//jshint esversion:8
const Web3 = require('web3');
const HDWalletProvider = require('truffle-hdwallet-provider');
require('dotenv').config();

process.on('unhandledRejection', console.error.bind(console));

module.exports = {
  connect: function(network) {
    if (network == 'staging') { network = 'mainnet' }
    const project_id = process.env.INFURA_PROJECT_ID;
    const infura_url = "https://" + network + ".infura.io/v3/" + project_id;
    const mnemonic = process.env.MNEMONIC;
    const provider = new HDWalletProvider(mnemonic, infura_url, 0, 10);
    const web3 = new Web3(provider);
    const {
      addresses,
      wallets,
    } = provider;
    return {
      addresses: addresses,
      wallets: wallets,
      web3: web3,
    };
  },

  connectWebsocket: function(network) {
    if (network == 'staging') { network = 'mainnet' }
    const project_id = process.env.INFURA_PROJECT_ID;
    const infura_url = "wss://" + network + ".infura.io/ws/v3/" + project_id;
    const web3 = new Web3(new Web3.providers.WebsocketProvider(infura_url));
    return web3;
  }
}
