const fs = require('fs');
const connect = require("./fetchWeb3.js").connect;
const stdLog = require("./stdLog.js").stdLog;

const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_params = JSON.parse(fs.readFileSync('./config/liquidity_input_params.json', 'utf8'));
const BN = require('bignumber.js');

//CHANGE THIS
NETWORK = "ropsten"
AUTOMATED_RESERVE_ADDRESS = "0x4595CBE9C126559ced43c5082C729d3BBF0A9662"
TOKEN_SYMBOL = "BTU"
TOKEN_DECIMALS = 18

const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const NULL_ADDRESS = "0x0000000000000000000000000000000000000000";

const {addresses, wallets, web3} = connect(NETWORK);
const kyber_reserve_ABI = config_abis.KyberReserve;
const liquidity_conversion_rates_ABI = config_abis.LiquidityConversionRates;
const erc20_token_ABI = config_abis.ERC20;

async function main() {
  reserveInstance = new web3.eth.Contract(kyber_reserve_ABI,AUTOMATED_RESERVE_ADDRESS);
  reserveBalance = await web3.eth.getBalance(AUTOMATED_RESERVE_ADDRESS);
  pricingAddress = await reserveInstance.methods.conversionRatesContract().call();
  stdLog(`Pricing contract: ${pricingAddress}`,'cyan');
  pricingInstance = new web3.eth.Contract(liquidity_conversion_rates_ABI, pricingAddress);
  tokenAddress = await pricingInstance.methods.token().call();
  stdLog(`Token: ${tokenAddress}`,'cyan');
  srcQty = web3.utils.toWei('1');

  ////////////////////////////
  // CHECK PRICING CONTRACT //
  ////////////////////////////
  rate = await pricingInstance.methods.getRate(
    tokenAddress, // conversionToken
    0, // currentBlockNumber
    true, // buy
    srcQty, // srcQty
  ).call();

  stdLog('Checking buy rate in pricing contract...');
  await checkRateInPricingContract(rate,true);

  rate = await pricingInstance.methods.getRate(
    tokenAddress, // conversionToken
    0, // currentBlockNumber
    false, // buy
    srcQty, // srcQty
  ).call();

  stdLog('Checking sell rate in pricing contract...');
  await checkRateInPricingContract(rate,false);

  ////////////////////////////
  // CHECK RESERVE CONTRACT //
  ////////////////////////////
  rate = await reserveInstance.methods.getConversionRate(
    ETH_ADDRESS,
    tokenAddress, // conversionToken
    srcQty, // srcQty
    0 // blockNumber
  ).call();
  stdLog('Checking buy rate in reserve contract...');
  await checkRateInReserveContract(rate,true);

  rate = await reserveInstance.methods.getConversionRate(
    tokenAddress,
    ETH_ADDRESS,
    srcQty, // srcQty
    0 // blockNumber
  ).call();
  stdLog('Checking sell rate in reserve contract...');
  await checkRateInReserveContract(rate,false);
  process.exit(0);
}

//////////////////////////////////////////////
/// PRICING CONTRACT RATE HELPER FUNCTIONS ///
//////////////////////////////////////////////
async function checkRateInPricingContract(rate,isBuy) {
  if(isRateZero(rate)) {
    rate = await checkRateWithE(reserveBalance,isBuy);
    if(isRateZero(rate)) {
      await validateEInFp(reserveBalance);
      delta = await checkDelta(reserveBalance,isBuy);
      await getRateWithDelta(delta,reserveBalance,isBuy);
    } else {
      stdLog('Rate exceeds MAX_RATE. Can only support 1 ETH <> 1B tokens max.','error');
      process.exit(0);
    }
  }
  stdLog('Rate returned, OK!','success');
  stdLog(`Rate: ${rate}`,'success');
  //Everything is ok!
}

function isRateZero(rate) {
  return (rate == 0);
}

async function checkRateWithE(reserveBalance,isBuy) {
  eInFp = await pricingInstance.methods.fromWeiToFp(reserveBalance).call();
  rate = await pricingInstance.methods.getRateWithE(tokenAddress, isBuy, srcQty, eInFp).call();
  stdLog(`Rate With E: ${rate}`);
  return rate;
}

async function validateEInFp(reserveBalance) {
  eInFp = await pricingInstance.methods.fromWeiToFp(reserveBalance).call();
  maxQtyInFp = await pricingInstance.methods.fromWeiToFp(web3.utils.toWei('10000000000')).call();
  eInFp = new BN(eInFp);
  maxQtyInFp = new BN(maxQtyInFp);

  if (eInFp.isGreaterThan(maxQtyInFp)) {
    stdLog(`eInFp (Ether balance) too large, exceeds maxQtyInFp. Try withdrawing some ETH.`,'error');
    stdLog(`eInFp: ${eInFp}`);
    stdLog(`maxQtyInFp: ${maxQtyInFp}`);
    process.exit(0);
  }
}

async function checkDelta(reserveBalance,isBuy) {
  if (isBuy) {
    deltaInFp = await pricingInstance.methods.fromWeiToFp(srcQty).call();
    maxEthCapBuyInFp = await pricingInstance.methods.maxEthCapBuyInFp().call();
    stdLog(`deltaInFp: ${deltaInFp}`);
    stdLog(`maxEthCapBuyInFp: ${maxEthCapBuyInFp}`);
    deltaInFp = new BN(deltaInFp);
    maxEthCapBuyInFp = new BN(deltaInFp);
    if (deltaInFp.isGreaterThan(maxEthCapBuyInFp)) {
      stdLog(`srcQty in FP exceeds max eth cap in FP. Try smaller srcQty.`,'error');
      process.exit(0);
    }
  } else {
    sellInputTokenQtyInFp = await pricingInstance.methods.fromTweiToFp(srcQty).call();
    stdLog(`sellInputTokenQtyInFp:${sellInputTokenQtyInFp}`);
    deltaInFp = await pricingInstance.methods.valueAfterReducingFee(sellInputTokenQtyInFp);
    stdLog(`deltaTInFp:${deltaInFp}`);
  }

  if(deltaInFp == 0) {
    stdLog(`deltaInFp is zero. Checking buy / sell rate zero quantity....`);
  } else {
    stdLog(`deltaInFp is something. Checking its buy / sell rate....`);
  }
  return deltaInFp;
}

async function getRateWithDelta(delta,reserveBalance,isBuy) {
  eInFp = await pricingInstance.methods.fromWeiToFp(reserveBalance).call();
  if (isBuy) {
    if (delta == 0) {
      rateInPrecision = await pricingInstance.methods.buyRateZeroQuantity(eInFp).call();
    } else {
      rateInPrecision = await pricingInstance.methods.buyRate(eInFp, delta).call();
    }
  } else {
    sellInputTokenQtyInFp = await pricingInstance.methods.fromTweiToFp(srcQty);
    if (delta == 0) {
      rateInPrecision = await sellRateZeroQuantity(eInFp);
      deltaEInFp = 0;
    } else {
      const {rateInPrecision, deltaEInFp} = await sellRate(eInFp, sellInputTokenQtyInFp, delta)
    }
    maxEthCapSellInFp = await pricingInstance.methods.maxEthCapSellInFp().call();
    if (deltaEInFp > maxEthCapSellInFp) {
      stdLog(`Swap value too large, exceeds sell cap. Try smaller srcQty`,'error');
    }
  }
  stdLog(`Rate In Precision: ${rateInPrecision}`);
}


//////////////////////////////////////////////
/// RESERVE CONTRACT RATE HELPER FUNCTIONS ///
//////////////////////////////////////////////
async function checkRateInReserveContract(rate,isBuy) {
  if (isRateZero(rate)) {
    tradeEnabled = await reserveInstance.methods.tradeEnabled().call();
    if (!tradeEnabled) {
      stdLog(`Trade has been disabled for this token.`,'error');
      process.exit(0);
    }

    if (isBuy) {
      srcToken = ETH_ADDRESS;
      destToken = tokenAddress;
    } else {
      srcToken = tokenAddress;
      destToken = ETH_ADDRESS;
    }

    rate = await pricingInstance.methods.getRate(
      tokenAddress,
      0,
      isBuy,
      srcQty
    ).call()

    destQty = await reserveInstance.methods.getDestQty(srcToken,destToken,srcQty,rate).call();
    destBalance = await reserveInstance.methods.getBalance(destToken).call()
    stdLog(`Expected dest qty: ${destQty}`);
    stdLog(`destBalance: ${destBalance}`);
    await verifyDestBalance(destToken);

    destBalance = new BN(destBalance);
    destQty = new BN(destQty);
    if (destQty == 0) {
      stdLog(`Expected dest qty is zero for some reason`,'error');
      process.exit(0);
    }
    
    if (destBalance.isLessThan(destQty)) {
      stdLog(`Insufficient dest tokens (or allowance) in reserve!`,'error');
      process.exit(0);
    }
    sanityRatesContract = await reserveInstance.methods.sanityRatesContract().call();
    if (sanityRatesContract != NULL_ADDRESS) {
      stdLog(`Sanity Rates: ${sanityRatesContract}`);
      stdLog(`Rate probably exceeded sanity rates, or sanity rates contract got problem.`,'error');
      process.exit(0);
    }
  }
  //Everything is ok!
  stdLog('Reserve contract returned rate, OK!','success');
  stdLog(`Rate: ${rate}`,'success');
}

async function verifyDestBalance(destToken) {
  if (destToken == ETH_ADDRESS) { return }
  tokenWallet = await reserveInstance.methods.tokenWallet(destToken).call();
  if (tokenWallet == NULL_ADDRESS) {
    stdLog(`Token wallet is null address. Reserve didn't setup fully. Get admin to set token wallet.`,'error');
    process.exit(0);
  }
}

main()
