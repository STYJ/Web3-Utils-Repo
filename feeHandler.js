#!/usr/bin/env node

require('dotenv').config();
const Axios = require('axios');
const BN = require('bn.js');
const fs = require('fs');
const Telegraf = require('telegraf');
const Web3 = require('web3');
const winston = require('winston');
const { config,
        gasPrice,
        privateKey,
        provider,
        queryOnly,
        sendToTelegram,
      } = require('yargs')
      .usage('Usage: $0 --config [path] --gas-price [gwei] --private-key [file] --provider [provider] --query-only --send-to-telegram')
      .demandOption(['config', 'privateKey'])
      .argv;
const configuration = JSON.parse(fs.readFileSync(config, 'utf8'));
const axios = Axios.create({
  baseURL: 'https://api.etherscan.io/',
  timeout: 20000,
});
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const logfile = 'logs/feeHandler';
try {
  fs.unlinkSync(`${logfile}_info.log`);
  fs.unlinkSync(`${logfile}_error.log`);
} catch {}
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.prettyPrint(),
    winston.format.printf(({ message, timestamp }) => {
      return `${timestamp}] ${message}`;
    }),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
      ),
    }),
    new winston.transports.File({ filename: `${logfile}_error.log`, level: 'error' }),
    new winston.transports.File({ filename: `${logfile}_info.log` })
  ]
});

let errors = 0;
let total = new BN(0);
let totalBurned = new BN(0);
let totalShared = new BN(0);
let account;
let reserves;
let feeSharingWallets;
let web3;
let gas_price;
let gas_limit;
let NetworkProxyInstance;
let NetworkInstance;
let FeeBurnerInstance;
let WrapFeeBurnerInstance;
let KNCInstance;

process.on('unhandledRejection', console.error.bind(console));
bot.catch((err) => {
  logger.error('ERROR: Telegram bot encountered some error.');
})

function tx(result, text) {
  logger.info();
  logger.info(`   ${text}`);
  logger.info('   --------------------------');
  logger.info(`   > transaction hash: ${result.transactionHash}`);
  logger.info(`   > gas used: ${result.gasUsed}`);
  logger.info();
}

async function sendTx(txObject) {
  const nonce = await web3.eth.getTransactionCount(account.address);
  const txData = txObject.encodeABI();
  const txFrom = account.address;
  const txTo = txObject._parent.options.address;
  const txValue = 0;
  const txKey = account.privateKey;

  try {
    gas_limit = await txObject.estimateGas();
  }
  catch (e) {
    gas_limit = 100000;
  }

  const txParams = {
    from: txFrom,
    to: txTo,
    data: txData,
    value: txValue,
    gas: gas_limit,
    gasPrice: gas_price,
    nonce: nonce,
  };

  const signedTx = await web3.eth.accounts.signTransaction(txParams, txKey);

  logger.info(`Broadcasting tx: ${signedTx.rawTransaction}`);
  return web3.eth.sendSignedTransaction(signedTx.rawTransaction);
}

async function sendTelegram(message) {
  if (sendToTelegram) {
    await bot.telegram.sendMessage(process.env.TELEGRAM_CHAT_ID, message);
  }
}

async function getABI(address) {
  const result = await axios.get('api', {
    params: {
      apikey: process.env.ETHERSCAN_API_KEY,
      module: 'contract',
      action: 'getabi',
      address,
    }
  });

  return JSON.parse(result.data.result);
}

function getAccount() {
  const data = fs.readFileSync(privateKey, 'utf8');

  return web3.eth.accounts.privateKeyToAccount(data);
}

function getProvider() {
  let rpcUrl;

  if (provider === 'node') {
    rpcUrl = 'http://localhost:8545'; // Local node
  } else {
    rpcUrl = `https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`;
  }

  return new Web3(new Web3.providers.HttpProvider(rpcUrl));
}

async function getGasPrice() {
  if (typeof gasPrice !== 'undefined') {
    return web3.utils.toWei(new BN(gasPrice), 'gwei');
  }

  return new BN(await web3.eth.getGasPrice()).mul(1.3);
}

async function getFeeSharingWallets() {
  const feeSharingWallets = await WrapFeeBurnerInstance.methods.getFeeSharingWallets().call();
  for (let wallet in configuration.wallets) {
    feeSharingWallets.push(configuration.wallets[wallet]);
  }

  return feeSharingWallets;
}

async function setInstances() {
  const KyberNetworkProxyAddress = configuration.KyberNetworkProxy;
  const KyberNetworkProxyABI = await getABI(KyberNetworkProxyAddress);
  NetworkProxyInstance = new web3.eth.Contract(KyberNetworkProxyABI, KyberNetworkProxyAddress);

  const KyberNetworkAddress = await NetworkProxyInstance.methods.kyberNetworkContract().call();
  const KyberNetworkABI = await getABI(KyberNetworkAddress);
  NetworkInstance = new web3.eth.Contract(KyberNetworkABI, KyberNetworkAddress);

  const FeeBurnerAddress = await NetworkInstance.methods.feeBurnerContract().call();
  const FeeBurnerABI = await getABI(FeeBurnerAddress);
  FeeBurnerInstance = new web3.eth.Contract(FeeBurnerABI, FeeBurnerAddress);

  const WrapFeeBurnerAddress = await FeeBurnerInstance.methods.admin().call();
  const WrapFeeBurnerABI = await getABI(WrapFeeBurnerAddress);
  WrapFeeBurnerInstance = new web3.eth.Contract(WrapFeeBurnerABI, WrapFeeBurnerAddress);

  const KNCAddress = configuration.KNC;
  const KNCABI = await getABI(KNCAddress);
  KNCInstance = new web3.eth.Contract(KNCABI, KNCAddress);
}

async function validate(reserve) {
  const reserveKNCWallet = await FeeBurnerInstance.methods.reserveKNCWallet(reserve).call();
  logger.info(`Reserve KNC Wallet: ${reserveKNCWallet}`);

  const kncWalletBalance = await KNCInstance.methods.balanceOf(reserveKNCWallet).call();
  logger.info(`Reserve KNC Wallet Balance: ${web3.utils.fromWei(kncWalletBalance)}`);

  const kncWalletAllowance = await KNCInstance.methods.allowance(reserveKNCWallet, FeeBurnerInstance._address).call();
  logger.info(`Reserve KNC Wallet Allowance: ${web3.utils.fromWei(kncWalletAllowance)}`);

  const usableKNC = BN.min(new BN(kncWalletBalance), new BN (kncWalletAllowance));
  logger.info(`Usable KNC in Wallet: ${web3.utils.fromWei(usableKNC)}`);

  const burnFees = await FeeBurnerInstance.methods.reserveFeeToBurn(reserve).call();
  logger.info(`Reserve Fees to Burn: ${web3.utils.fromWei(burnFees)}`);

  let sharingFees = new BN(0);
  for (let index in feeSharingWallets) {
    sharingFees = sharingFees.add(new BN(await FeeBurnerInstance.methods.reserveFeeToWallet(reserve, feeSharingWallets[index]).call()));
  }
  logger.info(`Reserve Fees to Share: ${web3.utils.fromWei(sharingFees)}`);

  const totalFees = new BN(sharingFees).add(new BN(burnFees));
  logger.info(`TOTAL FEES: ${web3.utils.fromWei(totalFees)}`);
  total = total.add(totalFees);

  if (totalFees.gt(new BN(usableKNC))) {
    const text = `VALIDATION ERROR: ${configuration.reserve_names[reserve]} (${reserve})\n\nUsable KNC (${web3.utils.fromWei(usableKNC)}) is less than the Total Fees needed (${web3.utils.fromWei(totalFees)})\n\n`
    logger.error(text);
    sendTelegram(text);
    errors += 1;

    return false
  }

  return true
}

async function doBurnFees(reserve) {
  const fees = new BN(await FeeBurnerInstance.methods.reserveFeeToBurn(reserve).call());
  if (fees.gte(new BN(configuration.KNC_MINIMAL_TX_AMOUNT))) {
    try {
      const result = await sendTx(FeeBurnerInstance.methods.burnReserveFees(reserve));
      tx(result, `Burnt ${web3.utils.fromWei(fees)}`);
      totalBurned = totalBurned.add(fees);
    } catch (e) {
      logger.error(e);
    }
  }
}

async function doShareFees(reserve) {
  for (let index in feeSharingWallets) {
    const fees = new BN(await FeeBurnerInstance.methods.reserveFeeToWallet(reserve, feeSharingWallets[index]).call());
    if (fees.gte(new BN(configuration.KNC_MINIMAL_TX_AMOUNT))) {
      try {
        const result = await sendTx(FeeBurnerInstance.methods.sendFeeToWallet(feeSharingWallets[index], reserve));
        tx(result, `Shared ${web3.utils.fromWei(fees)}`);
        totalShared = totalShared.add(fees);
      } catch (e) {
        logger.error(e);
      }
    }
  }
}

async function main() {
  logger.info('- START -');
  sendTelegram('I am now running the feeHandler.js script.');

  web3 = getProvider();
  await setInstances();
  account = getAccount();
  gas_price = await getGasPrice();
  reserves = await NetworkInstance.methods.getReserves().call();
  // reserves = configuration.test;
  feeSharingWallets = await getFeeSharingWallets();

  logger.info(`Account: ${account.address}`);
  logger.info(`Gas Price: ${gas_price}`);
  logger.info('===========================================================');
  logger.info(`FeeBurner: ${FeeBurnerInstance._address}`);
  logger.info(`WrapFeeBurner: ${WrapFeeBurnerInstance._address}`);
  logger.info(`Reserves:\n${JSON.stringify(reserves)}`);
  logger.info(`Fee Sharing Wallets:\n${JSON.stringify(feeSharingWallets)}`);
  logger.info('===========================================================');

  let initialETH = await web3.eth.getBalance(account.address);

  for (let index in reserves) {
    logger.info(`- ${parseInt(index) + 1} of ${reserves.length} -`);
    logger.info(`Reserve: ${configuration.reserve_names[reserves[index]]}`);
    logger.info(`Reserve Address: ${reserves[index]}`);

    let valid = await validate(reserves[index]);

    if (!queryOnly && valid) {
        await doBurnFees(reserves[index]);
        await doShareFees(reserves[index]);
    }

    logger.info('------------');
  }

  logger.info(`TOTAL FEES ALL RESERVES: ${web3.utils.fromWei(total)}`);
  if (queryOnly) {
    sendTelegram('This is query run only. No fees were burned or shared.');
  } else {
    logger.info(`TOTAL FEES BURNED: ${web3.utils.fromWei(totalBurned)}`);
    logger.info(`TOTAL FEES SHARED: ${web3.utils.fromWei(totalShared)}`);
    sendTelegram(`KNC Fees Burned: ${web3.utils.fromWei(totalBurned)}\nKNC Fees Shared: ${web3.utils.fromWei(totalShared)}`);
  }
  logger.info('===========================================================');

  let finalETH = await web3.eth.getBalance(account.address);
  logger.info(`ETH Spent for Txs: ${web3.utils.fromWei(new BN(initialETH).sub(new BN(finalETH)))}`);
  logger.error(`Errors: ${errors}`);

  sendTelegram('I have finished running the feeHandler.js script.');
  logger.info('- END -');
}

// Start the script
main();
