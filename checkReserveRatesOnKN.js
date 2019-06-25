const fs = require('fs');
const connect = require("./fetchWeb3.js").connect;
const stdLog = require("./stdLog.js").stdLog;

const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_addresses = JSON.parse(fs.readFileSync('./config/Addresses.json', 'utf8'));
const config_params = JSON.parse(fs.readFileSync('./config/liquidity_input_params.json', 'utf8'));

//CHANGE THIS
NETWORK = "ropsten"
AUTOMATED_RESERVE_ADDRESS = "0xb1e779395446b4857232e7b8f84362a611c5669b"
TOKEN_ADDRESS = "0x9952e42ff92149f48b3b7dee3f921a6dd106f79f"
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

  const { kyberExpectedRate,kyberSlippageRate } = await kyberProxyInstance.methods.getExpectedRate(
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
  checkRateIsZero(kyberExpectedRate,'proxy');

  if (kyberExpectedRate > reserveRate) {
    stdLog(`Error: Rate not from desired reserve. Please disable other reserves offering this token pair.`);
    stdLog(`Proxy Rate: ${kyberExpectedRate}`);
    stdLog(`Reserve Rate: ${reserveRate}`);
    process.exit(0);
  } else if (kyberExpectedRate < reserveRate) {
    stdLog(`Error: Reserve not added into network. Please do so, and disable other reserves`);
    stdLog(`Proxy Rate: ${kyberExpectedRate}`);
    stdLog(`Reserve Rate: ${reserveRate}`);
    process.exit(0);
  } else {
    stdLog(`Proxy showing reserve rate, OK!`);
    process.exit(0);
  }
}

function checkRateIsZero(rate, contractName) {
  if (rate == 0) {
    stdLog(`Rate returned from ${contractName} contract is zero.`)
    process.exit(0);
  } else {
    stdLog(`${contractName} contract returning rate, OK!`);
  }
}

main()
