const fs = require('fs');
const connect = require("./fetchWeb3.js").connect;
const stdLog = require("./stdLog.js").stdLog;

const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_addresses = JSON.parse(fs.readFileSync('./config/Addresses.json', 'utf8'));
const config_params = JSON.parse(fs.readFileSync('./config/liquidity_input_params.json', 'utf8'));

//CHANGE THIS
NETWORK = "mainnet"
AUTOMATED_RESERVE_ADDRESS = "0x3480E12B6C2438e02319e34b4c23770679169190"
TOKEN_ADDRESS = "0xaaaf91d9b90df800df4f55c205fd6989c977e73a"

const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";
const {addresses, wallets, web3} = connect(NETWORK);
const kyber_network_ABI = config_abis.KyberNetwork;
const kyber_reserve_ABI = config_abis.KyberReserve;
const fee_burner_ABI = config_abis.FeeBurner;
const erc20_token_ABI = config_abis.ERC20;

const kyber_network_address = config_addresses[NETWORK].KyberNetwork;
const fee_burner_address = config_addresses[NETWORK].FeeBurner;

async function main() {
  kyberNetworkInstance = new web3.eth.Contract(kyber_network_ABI, kyber_network_address);
  reserveInstance = new web3.eth.Contract(kyber_reserve_ABI,AUTOMATED_RESERVE_ADDRESS);
  feeBurnerInstance = new web3.eth.Contract(fee_burner_ABI,fee_burner_address);
  tokenInstance = new web3.eth.Contract(erc20_token_ABI, TOKEN_ADDRESS);
  TOKEN_DECIMALS = await tokenInstance.methods.decimals().call();
  
  //1) Check reserve is pointed to production
  networkContract = await reserveInstance.methods.kyberNetwork().call();
  if (networkContract.toLowerCase() == kyber_network_address.toLowerCase()) {
    stdLog(`Reserve points to production contract, OK!`, 'success');
  } else {
    stdLog(`Reserve needs to point to production contract`, 'error');
  }

  //2) Check reserve is returning rates
  rate1 = await reserveInstance.methods.getConversionRate(
    ETH_ADDRESS, // srcToken
    TOKEN_ADDRESS, // destToken
    web3.utils.toWei('1'), // srcQty
    0, // blockNumber
  ).call()

  checkRateIsZero(rate1, 'Reserve', 'buy');

  rate2 = await reserveInstance.methods.getConversionRate(
    TOKEN_ADDRESS, // srcToken
    ETH_ADDRESS, // destToken
    (10 ** TOKEN_DECIMALS).toString(), // srcQty
    0, // blockNumber
  ).call()

  checkRateIsZero(rate2, 'Reserve', 'sell');

  // 3) Reserve has KNC wallet listed in fee burner
  result = await feeBurnerInstance.methods.reserveKNCWallet(AUTOMATED_RESERVE_ADDRESS).call();
  if (result == NULL_ADDRESS) {
    stdLog(`Reserve fee wallet not set.`, 'error');
  } else {
    stdLog(`Fee wallet set! OK!`, 'success');
  }

  // 4) Reserve is listed in KN contract
  result = await kyberNetworkInstance.methods.getReserves().call();
  const index = result.findIndex(r => AUTOMATED_RESERVE_ADDRESS.toLowerCase() === r.toLowerCase());
  if (index === -1) {
    stdLog(`Reserve has not been listed on production`, 'error');
  } else {
    stdLog(`Reserve is listed`, 'success');
  }

  process.exit(0);
}

function checkRateIsZero(rate, contractName, isBuy) {
  if (rate == 0) {
    stdLog(`${isBuy} rate returned from contract is zero.`,'error');
    process.exit(0);
  } else {
    stdLog(`${contractName} contract returning ${isBuy} rate, OK!`,'success');
  }
}

main()
