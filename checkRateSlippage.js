const fs = require('fs');
const csvWriter = require('csv-write-stream');
const Web3 = require('web3');
const connect = require("./fetchWeb3.js").connectWebsocket;
const stdLog = require("./stdLog.js").stdLog;
const getTokenInfo = require("./getTokenInfo.js").getTokenInfo;
const BN = require('bignumber.js');

const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_addresses = JSON.parse(fs.readFileSync('./config/Addresses.json', 'utf8'));
const kyber_network_ABI = config_abis.KyberNetwork;

//CHANGE THIS
NETWORK = "mainnet";
const network_address = config_addresses[NETWORK].KyberNetwork;
const web3 = connect(NETWORK);

TOKENS_TO_FETCH = ['LINK','DAI','USDC']
ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
MULTIPLIER_AMOUNTS = [1,2,4,5,8]
MIN_TRADE_AMOUNT = web3.utils.toWei('1.5');
const writer = csvWriter();
writer.pipe(fs.createWriteStream('dataForNuo.csv', {flags: 'a'}));

async function main() {
  tokenInfo = await getTokenInfo(NETWORK,false,TOKENS_TO_FETCH);
  await monitorTrades();
}

async function monitorTrades() {
  networkInstance = new web3.eth.Contract(kyber_network_ABI,network_address);
  networkInstance.events.KyberTrade({
    fromBlock: 'latest'
  })
  .on('data', async (event) => {
    await processEvent(event);
  })
  .on('error', error => {
    console.log(error);
  })
}

async function processEvent(event) {
  result = event.returnValues;
  ethWeiValue = new BN(result.ethWeiValue);
  if (ethWeiValue.isLessThan(MIN_TRADE_AMOUNT)) { return }
  /*
  token = tokenInfo.find(token => {
    token.address.toLowerCase() == result.src.toLowerCase() || token.add
  })
  */
  for (var i=0;i<tokenInfo.length;i++) {
    token = tokenInfo[i];
    if (token.address.toLowerCase() == result.src.toLowerCase()) {
      rate = calcRate(result.srcAmount,result.ethWeiValue,token.decimals,18);
      RESULT = {
        'txHash': event.transactionHash,
        'srcToken': token.symbol,
        'destToken': 'ETH',
        'ethAmt': (result.ethWeiValue / 10**18).toFixed(3),
        'tokenAmt': (result.srcAmount / 10**token.decimals).toFixed(3),
        'tradedRate': rate.toString()
      }

      for (var j=0;j<MULTIPLIER_AMOUNTS.length;j++) {
        headerName = 'rate' + j;
        queryRate = await networkInstance.methods.getExpectedRate(
          token.address,
          ETH_ADDRESS,
          new BN(result.srcAmount * MULTIPLIER_AMOUNTS[j]).toFixed()
        ).call();
        RESULT[headerName] = queryRate.expectedRate;
      }
      writer.write(RESULT)
    }

    if (token.address.toLowerCase() == result.dest.toLowerCase()) {
      rate = calcRate(result.ethWeiValue,result.dstAmount,18,token.decimals);
      RESULT = {
        'txHash': event.transactionHash,
        'srcToken': 'ETH',
        'destToken': token.symbol,
        'ethAmt': (result.ethWeiValue / 10**18).toFixed(3),
        'tokenAmt': (result.dstAmount / 10**token.decimals).toFixed(3),
        'tradedRate': rate.toString()
      }

      for (var j=0;j<MULTIPLIER_AMOUNTS.length;j++) {
        headerName = 'rate' + j;
        queryRate = await networkInstance.methods.getExpectedRate(
          ETH_ADDRESS,
          token.address,
          new BN(result.ethWeiValue * MULTIPLIER_AMOUNTS[j]).toFixed()
        ).call();
        RESULT[headerName] = queryRate.expectedRate
      }
      writer.write(RESULT)
    }
  }
  if (RESULT) { console.log(RESULT) }
}

function calcRate(srcAmount, destAmount, srcDecimals, dstDecimals) {
  const PRECISION = (10 ** 18);
  if (dstDecimals >= srcDecimals) {
    return (destAmount * PRECISION / ((10 ** (dstDecimals - srcDecimals)) * srcAmount));
  } else {
    return (destAmount * PRECISION * (10 ** (srcDecimals - dstDecimals)) / srcAmount);
  }
}

main()
