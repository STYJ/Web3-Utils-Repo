const fs = require("fs");
const connect = require("./fetchWeb3.js").connect;

const configABIs = JSON.parse(fs.readFileSync("./config/ABI.json", "utf8"));
const configAddresses = JSON.parse(
  fs.readFileSync("./config/Addresses.json", "utf8")
);
const knABI = configABIs.KyberNetwork;
const krABI = configABIs.KyberReserve;


const network = "mainnet";
const tokensToFetch = ["MYB"];
const { web3 } = connect(network);
const knAddress = configAddresses[network].KyberNetwork;

async function main() {
  console.log("Getting inactive reserves");
  const knInstance = new web3.eth.Contract(knABI, knAddress);
  const reserves = await knInstance.methods.getReserves().call();
  let inactiveReserves = [];
  
  reserves.forEach(reserve => {
    let reserveInstance = new web3.eth.Contract(krABI, reserve);
    let events = await reserveInstance.getPastEvents("TradeExecute", {
      fromBlock: 8500000, // 100000 blocks is about 15 days (13 second blocks)
    })
    if(events.length == 0) {
      inactiveReserves.push(reserve);
    }
  })

  console.log(inactiveReserves);

  

  console.log("Done");
  process.exit(0);
}



main();
