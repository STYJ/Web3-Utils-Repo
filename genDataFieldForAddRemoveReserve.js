const fs = require('fs');
const connect = require("./fetchWeb3.js").connect;
const stdLog = require("./stdLog.js").stdLog;

const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_addresses = JSON.parse(fs.readFileSync('./config/Addresses.json', 'utf8'));

//CHANGE THIS
NETWORK = "staging";
RESERVE = "0xa107dfa919c3f084a7893a260b99586981beb528";
TOKEN = "0xdac17f958d2ee523a2206206994597c13d831ec7";
IS_ADD = false; //true = add reserve, false = remove reserve

const {addresses, wallets, web3} = connect(NETWORK);
const kyberNetwork_ABI = config_abis.KyberNetwork;
const kyberNetwork_address = config_addresses[NETWORK].KyberNetwork;
const MULTISIG = config_addresses[NETWORK].SADMultisig;
const wallet_ABI = config_abis.GnosisMultisig;

async function main() {
  kyberNetworkContract = new web3.eth.Contract(kyberNetwork_ABI,kyberNetwork_address);
  stdLog(`SAD Multisig Wallet: ${MULTISIG}`,'header');
  stdLog(`Wallet ABI`,'header');
  stdLog(`${JSON.stringify(wallet_ABI)}`);

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
  return reserves.findIndex(reserve => {
    reserve.toLowerCase() == RESERVE.toLowerCase()
  })
}

main();
