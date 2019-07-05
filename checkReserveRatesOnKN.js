const fs = require('fs');
const connect = require("./fetchWeb3.js").connect;
const stdLog = require("./stdLog.js").stdLog;

const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_addresses = JSON.parse(fs.readFileSync('./config/Addresses.json', 'utf8'));
const config_params = JSON.parse(fs.readFileSync('./config/liquidity_input_params.json', 'utf8'));

//CHANGE THIS
NETWORK = "mainnet"
AUTOMATED_RESERVE_ADDRESS = "0x45eb33D008801d547990cAF3b63B4F8aE596EA57"
TOKEN_ADDRESS = "0x408e41876cCCDC0F92210600ef50372656052a38"
TOKEN_DECIMALS = 18

const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const {addresses, wallets, web3} = connect(NETWORK);
const kyber_network_proxy_ABI = config_abis.KyberNetworkProxy;
const kyber_reserve_ABI = config_abis.KyberReserve;
const erc20_token_ABI = config_abis.ERC20;
const kyber_proxy_address = config_addresses[NETWORK].KyberNetworkProxy;

async function main() {
  kyberProxyInstance = new web3.eth.Contract(kyber_network_proxy_ABI, kyber_proxy_address);
  reserveInstance = new web3.eth.Contract(kyber_reserve_ABI,AUTOMATED_RESERVE_ADDRESS);

  const { expectedRate,slippageRate } = await kyberProxyInstance.methods.getExpectedRate(
    ETH_ADDRESS, // srcToken
    TOKEN_ADDRESS, // destToken
    web3.utils.toWei('1') // srcQty
  ).call();

  reserveRate = await reserveInstance.methods.getConversionRate(
    ETH_ADDRESS, // srcToken
    TOKEN_ADDRESS, // destToken
    web3.utils.toWei('1'), // srcQty
    0, // blockNumber
  ).call();

  checkRateIsZero(reserveRate,'reserve');
  checkRateIsZero(expectedRate,'proxy');

  if (expectedRate > reserveRate) {
    stdLog(`Error: Rate not from desired reserve. Please disable other reserves offering this token pair.`,'error');
    stdLog(`Proxy Rate: ${expectedRate}`);
    stdLog(`Reserve Rate: ${reserveRate}`);
    process.exit(0);
  } else if (expectedRate < reserveRate) {
    stdLog(`Error: Reserve not added into network. Please do so, and disable other reserves`,'error');
    stdLog(`Proxy Rate: ${expectedRate}`);
    stdLog(`Reserve Rate: ${reserveRate}`);
    process.exit(0);
  } else {
    stdLog(`Proxy showing reserve rate, OK!`,'success');
    process.exit(0);
  }
}

function checkRateIsZero(rate, contractName) {
  if (rate == 0) {
    stdLog(`Error: Rate returned from ${contractName} contract is zero.`,'error');
    stdLog(`Check if reserve is added into network.`,'error');
    process.exit(0);
  } else {
    stdLog(`${contractName} contract returning rate, OK!`,'success');
  }
}

main()
