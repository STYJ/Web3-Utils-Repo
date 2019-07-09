const fs = require('fs');
const connect = require("./fetchWeb3.js").connect;
const stdLog = require("./stdLog.js").stdLog;

const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_addresses = JSON.parse(fs.readFileSync('./config/Addresses.json', 'utf8'));

//CHANGE THIS
NETWORK = "mainnet";
RESERVE = "0x63825c174ab367968EC60f061753D3bbD36A0D8F";
TOKEN = "0x5d60d8d7ef6d37e16ebabc324de3be57f135e0bc";
IS_ADD = false; //true = add reserve, false = remove reserve

const {addresses, wallets, web3} = connect(NETWORK);
const kyberNetwork_ABI = config_abis.KyberNetwork;
const kyberNetwork_address = config_addresses[NETWORK].KyberNetwork;

async function main() {
  kyberNetworkContract = new web3.eth.Contract(kyberNetwork_ABI,kyberNetwork_address);
  if (IS_ADD) {
    data = await kyberNetworkContract.methods.addReserve(RESERVE,false).encodeABI();
    stdLog(`Add reserve ${RESERVE}`,'header');
    stdLog(data);

    data = await kyberNetworkContract.methods.listPairForReserve(RESERVE,TOKEN,true,true,true).encodeABI();
    stdLog(`List pair for reserve`,'header');
    stdLog(data);
  } else {
    data = await kyberNetworkContract.methods.listPairForReserve(RESERVE,TOKEN,true,true,false).encodeABI();
    stdLog(`List pair for reserve ${RESERVE}`,'header');
    stdLog(data);
    index = await getReserveIndex(RESERVE);
    if (index == -1) {
      stdLog(`Reserve not found in network. Check environment.`,'error');
      process.exit(0);
    }
    data = await kyberNetworkContract.methods.removeReserve(RESERVE,index).encodeABI();
    stdLog(`Remove reserve ${RESERVE}`,'header');
    stdLog(data);
  }

  process.exit(0);
}

async function getReserveIndex(reserve) {
  reserves = await kyberNetworkContract.methods.getReserves().call();
  for (i=0;i<reserves.length;i++) {
    if (reserves[i].toLowerCase() == RESERVE.toLowerCase()) {
      stdLog(`Reserve index: ${i}`);
      return i;
    }
  }
  return -1;
}

main();
