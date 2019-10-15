const fs = require("fs");
const connect = require("./fetchWeb3.js").connect;
const BN = require('bignumber.js');
const _ = require('underscore'); 

const configABIs = JSON.parse(fs.readFileSync("./config/ABI.json", "utf8"));
const configAddresses = JSON.parse(
  fs.readFileSync("./config/Addresses.json", "utf8")
);
const knABI = configABIs.KyberNetwork;
const krABI = configABIs.KyberReserve;
const lcrABI = configABIs.LiquidityConversionRates;
const erc20ABI = configABIs.ERC20;

const network = "mainnet";
const { web3 } = connect(network);
const knAddress = configAddresses[network].KyberNetwork;

async function main() {
  console.log("Getting inactive reserves, please wait...");
  const knInstance = new web3.eth.Contract(knABI, knAddress);
  const reserves = await knInstance.methods.getReserves().call();
  let inactiveReserves = await getInactiveReserves(reserves);
  console.table(_.sortBy(inactiveReserves, 'type'));
  process.exit(0);
}

// Gets inactiveReserve
async function getInactiveReserves(reserves) {
  let inactiveReserves = [];

  for (let i = 0; i < reserves.length; i++) {
    let address = reserves[i];
    let reserveInstance = new web3.eth.Contract(krABI, address);
    let events = await reserveInstance.getPastEvents("TradeExecute", {
      fromBlock: process.argv[2] // 100000 blocks is about 15 days (13 second blocks)
    });
    let reserveType = await getReserveType(reserveInstance);
    if (events.length == 0 && reserveType != "OR") {
      let ETH = formatNumber(Number(web3.utils.fromWei(await web3.eth.getBalance(address))));
      let tokenAddress = await getToken(reserveInstance);
      let tokenSymbol = await getTokenSymbol(tokenAddress);
      let tokenBalance = await getTokenBalance(tokenAddress, address);
      let details = {
        address: address,
        type: reserveType,
        ETH: ETH,
        token: tokenSymbol,
        balance: tokenBalance
      };
      inactiveReserves.push(details);
    }
  }

  return inactiveReserves;
}

// Checks if reserve is orderbook reserve
async function isOrderbookReserve(reserveInstance) {
  try {
    // Try and get the value stored at the conversionRatesContract variable
    await reserveInstance.methods.conversionRatesContract().call();
  } catch (err) {
    return true;
  }
  return false;
}

async function isAPR(crInstance) {
  try {
    // Try to get the value stored at the token variable
    await crInstance.methods.token().call();
  } catch (err) {
    return false;
  }
  return true;
}

async function getToken(reserveInstance) {
  let crAddress = await reserveInstance.methods
    .conversionRatesContract()
    .call();
  let crInstance = new web3.eth.Contract(lcrABI, crAddress);
  let token;
  try {
    token = await crInstance.methods.token().call();
  } catch (err) {
    token = "N/A";
  }
  return token;
}

async function getTokenSymbol(tokenAddress) {
  if (tokenAddress != "N/A") {
    let tokenInstance = new web3.eth.Contract(erc20ABI, tokenAddress);
    let name = await tokenInstance.methods.symbol().call();
    return name;
  }
  return "N/A";
}

function formatNumber(number) {
  return number.toFixed(2).replace(/[.,]00$/, "");
}

async function getTokenBalance(tokenAddress, contractAddress) {
  if (tokenAddress != "N/A") {
    let tokenInstance = new web3.eth.Contract(erc20ABI, tokenAddress);
    let balanceWei = await tokenInstance.methods.balanceOf(contractAddress).call();
    let decimals = await tokenInstance.methods.decimals().call();
    return formatNumber(new BN(balanceWei).div(new BN(10).pow(new BN(decimals))))
  }
  return "N/A";
}

async function getReserveType(reserveInstance) {
  if (await isOrderbookReserve(reserveInstance)) {
    return "OR";
  }
  let crAddress = await reserveInstance.methods
    .conversionRatesContract()
    .call();
  let crInstance = new web3.eth.Contract(lcrABI, crAddress);
  if (await isAPR(crInstance)) {
    return "APR";
  }
  return "FPR";
}

main();
