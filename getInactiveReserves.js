const fs = require("fs");
const connect = require("./fetchWeb3.js").connect;

const configABIs = JSON.parse(fs.readFileSync("./config/ABI.json", "utf8"));
const configAddresses = JSON.parse(
  fs.readFileSync("./config/Addresses.json", "utf8")
);
const knABI = configABIs.KyberNetwork;
const krABI = configABIs.KyberReserve;

const network = "mainnet";
const { web3 } = connect(network);
const knAddress = configAddresses[network].KyberNetwork;

async function main() {
  console.log("Getting inactive reserves");
  const knInstance = new web3.eth.Contract(knABI, knAddress);
  const reserves = await knInstance.methods.getReserves().call();
  let inactiveReserves = await getInactiveReserves(reserves);
  console.log(inactiveReserves);
  console.log("Done");
  process.exit(0);
}

// Gets inactiveReserve
async function getInactiveReserves(reserves) {
  let inactiveReserves = [];

  for (let i = 0; i < reserves.length; i++) {
    let address = reserves[i];
    console.log(`Checking ${address}...`);
    let reserveInstance = new web3.eth.Contract(krABI, address);
    let events = await reserveInstance.getPastEvents("TradeExecute", {
      fromBlock: process.argv[2] // 100000 blocks is about 15 days (13 second blocks)
    });
    if (events.length == 0 && !(await isOrderbookReserve(reserveInstance))) {
      inactiveReserves.push(address);
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

main();
