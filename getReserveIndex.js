const fs = require('fs');
const connect = require("./fetchWeb3.js").connect;
const stdLog = require("./stdLog.js").stdLog;

const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_addresses = JSON.parse(fs.readFileSync('./config/Addresses.json', 'utf8'));

//CHANGE THIS
NETWORK = "staging"
RESERVES_INDEXES_TO_FETCH = ["0x302b35bd0b01312ec2652783c04955d7200c3d9b"]

const {addresses, wallets, web3} = connect(NETWORK);
const kyberNetwork_ABI = config_abis.KyberNetwork;
const kyberNetwork_address = config_addresses[NETWORK].KyberNetwork;

async function main() {
  kyberNetworkContract = new web3.eth.Contract(kyberNetwork_ABI,kyberNetwork_address);
  reserves = await kyberNetworkContract.methods.getReserves().call();
  for (i=0;i<RESERVES_INDEXES_TO_FETCH.length;i++) {
    reserveAddress = RESERVES_INDEXES_TO_FETCH[i];
    reserveIndex = reserves.indexOf(reserveAddress.toLowerCase());
    stdLog(`Reserve address: ${reserveAddress}`);
    if (reserveIndex == -1) {
      stdLog(`Reserve not found`,`error`);
      continue;
    }
    stdLog(`Reserve index: ${reserveIndex}`);
  }
  process.exit(0);
}

main()
