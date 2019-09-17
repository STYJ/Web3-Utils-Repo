const fs = require('fs');
const connect = require("./fetchWeb3.js").connect;
const stdLog = require("./stdLog.js").stdLog;
const getTokenInfo = require("./getTokenInfo.js").getTokenInfo;

const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const BN = require('bignumber.js');

//CHANGE THIS
NETWORK = "ropsten"
RESERVE_ADDRESS = "0x3051a9d61b85e5c79d577e707e858b6211004315"
TOKEN = ["TKN"]
//OPTIONAL FIELDS
var TOKEN_ADDRESS = "0xAA15075eDf8E33867687428d0E49Ae898e5B3513";
var TOKEN_DECIMALS = 8;

const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

const {addresses, wallets, web3} = connect(NETWORK);
const kyber_reserve_ABI = config_abis.KyberReserve;
const conv_rate_interface_ABI = config_abis.ConversionRatesInterface;
const sanity_rates_ABI = config_abis.SanityRates;
const erc20_token_ABI = config_abis.ERC20;
var BUY_QTY = web3.utils.toWei('0.5');
var SELL_QTY;

async function main() {
  tokenInfo = await getTokenInfo(NETWORK,false,TOKEN);
  verifyReserveInput(tokenInfo);
  SELL_QTY = 10 * 10 ** TOKEN_DECIMALS;
  reserveInstance = new web3.eth.Contract(kyber_reserve_ABI,RESERVE_ADDRESS);
  pricingInstance = new web3.eth.Contract(conv_rate_interface_ABI,await reserveInstance.methods.conversionRatesContract().call());
  await checkTradeEnabled();
  stdLog('Checking buy rate...');
  await obtainVerifyRate(true);
  stdLog('Checking sell rate...');
  await obtainVerifyRate(false);
  process.exit(0);
}

function verifyReserveInput(tokenInfo) {
  if (!tokenInfo[0]) return
  tokenInfo = tokenInfo[0];
  if (tokenInfo.reserves_src.findIndex(address => (address == RESERVE_ADDRESS)) == -1) {
    stdLog(`Reserve address not found in /currencies API.`,`error`);
    process.exit(0);
  }
  TOKEN_ADDRESS = tokenInfo.address;
  TOKEN_DECIMALS = tokenInfo.decimals;
  return;
}

async function checkTradeEnabled() {
  tradeEnabled = await reserveInstance.methods.tradeEnabled().call();
  if (!tradeEnabled) {
    stdLog(`Trade not enabled.`,'error');
    process.exit(0);
  }
  return;
}

async function obtainVerifyRate(isBuy) {
  if (isBuy) {
    SRC_ADDRESS = ETH_ADDRESS;
    DEST_ADDRESS = TOKEN_ADDRESS;
    QTY = BUY_QTY;
    isBuyText = 'Buy';
  } else {
    SRC_ADDRESS = TOKEN_ADDRESS;
    DEST_ADDRESS = ETH_ADDRESS;
    QTY = SELL_QTY;
    isBuyText = 'Sell';
  }

  rate = await reserveInstance.methods.getConversionRate(
    SRC_ADDRESS,
    DEST_ADDRESS,
    QTY,
    0).call()

  if(isRateZero(rate)) {
    rate = await pricingInstance.methods.getRate(
      TOKEN_ADDRESS,
      0,
      isBuy,
      QTY
    ).call();

    if(isRateZero(rate)) {
      stdLog(`Pricing contract returns zero rate.`,`error`);
      process.exit(0);
    } else {
      await verifyDestLimits(SRC_ADDRESS, DEST_ADDRESS, QTY, rate);
    }
  } else {
    stdLog(`${isBuyText} Rate: ${rate}, OK!`,'success');
    return;
  }
}

async function verifyDestLimits(srcAddress, dstAddress, qty, rate) {
  destQty = await reserveInstance.methods.getDestQty(
    srcAddress,
    dstAddress,
    qty,
    rate
  ).call();

  balance = await reserveInstance.methods.getBalance(dstAddress).call();
  if (isRateZero(balance)) {
    stdLog(`Balance is zero... Going deeper...`);
    if (dstAddress == ETH_ADDRESS) {
      stdLog(`Reserve has no ETH.`,'error');
      process.exit(0);
    }
    wallet = await reserveInstance.methods.tokenWallet(dstAddress).call();
    stdLog(`Wallet Contract: ${wallet}`,'cyan');
    tokenInstance = new web3.eth.Contract(erc20_token_ABI,dstAddress);
    balanceOfWallet = await tokenInstance.methods.balanceOf(wallet).call();
    allowanceOfWallet = await tokenInstance.methods.allowance(wallet,RESERVE_ADDRESS);
    if (isRateZero(balanceOfWallet)) {
      stdLog(`Insufficient token balance.`,'error');
      process.exit(0);
    } else {
      stdLog(`Insufficient token allowance`,'error');
      process.exit(0);
    }
  };

  if (balance < destQty) {
    stdLog(`Dest amount greater than balance.`,'error');
    stdLog(`Balance: ${balance}`);
    stdLog(`Dest Qty: ${destQty}`);
    process.exit(0);
  }

  stdLog(`Rate exceeds sanity rates`,'error');
  sanityRatesAddress = await reserveInstance.methods.sanityRatesContract().call();
  sanityRatesInstance = new web3.eth.Contract(sanity_rates_ABI, sanityRatesAddress);
  sanityRate = await sanityRatesInstance.methods.getSanityRate(srcAddress, dstAddress).call();
  stdLog(`Sanity Rate:${sanityRate}`);
  process.exit(0);
}

function isRateZero(rate) {
  return (rate == 0);
}

main()
