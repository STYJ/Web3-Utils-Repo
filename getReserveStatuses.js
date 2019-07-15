const fs = require('fs');
const connect = require("./fetchWeb3.js").connect;
const stdLog = require("./stdLog.js").stdLog;
const getTokenInfo = require("./getTokenInfo.js").getTokenInfo;
const BN = require('bignumber.js');

const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_addresses = JSON.parse(fs.readFileSync('./config/Addresses.json', 'utf8'));
const erc20_token_ABI = config_abis.ERC20;
const kyber_reserve_ABI = config_abis.KyberReserve;
const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

//CHANGE THIS
NETWORK = "mainnet" //Will not work on staging since no staging API!
TOKENS_TO_FETCH = ['PAY']
SRC_QUERY_AMOUNT = '0.1'
const {addresses, wallets, web3} = connect(NETWORK);

async function main() {
  tokenInfo = await getTokenInfo(NETWORK,false,TOKENS_TO_FETCH);
  await getReserveStatuses(tokenInfo);
  process.exit(0);
}

async function getReserveStatuses(tokenInfo) {
  for (var i=0; i<tokenInfo.length; i++) {
    token = tokenInfo[i]
    if (!token.reserves_src) continue;
    if (!token.symbol) {
      token.symbol = token.address
    }

    stdLog(`---- RESERVES FOR ${token.symbol} --- `, 'header')
    for (var j=0; j<token.reserves_src.length;j++) {
      reserve = token.reserves_src[j];
      reserveInstance = new web3.eth.Contract(kyber_reserve_ABI,reserve);
      //do test ETH > token getConversionRate
      rate = await reserveInstance.methods.getConversionRate(
        ETH_ADDRESS,
        token.address,
        web3.utils.toWei(SRC_QUERY_AMOUNT),
        0
      ).call()
      if (rate == 0) {
        stdLog(`Error: Reserve ${reserve} returns zero ETH -> ${token.symbol} rate.`,'red');
        continue;
      }

      rate = await reserveInstance.methods.getConversionRate(
        token.address,
        ETH_ADDRESS,
        new BN(1 * 10**token.decimals).toString(),
        0
      ).call();

      if (rate == 0) {
        stdLog(`Error: Reserve ${reserve} returns zero ${token.symbol} -> ETH rate.`,'red');
        continue;
      }

      stdLog(`Reserve ${reserve} is operational, OK!`,'success');
    }
    return;
  }
}

main()
