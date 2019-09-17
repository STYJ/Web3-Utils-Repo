const fs = require('fs');
const connect = require("./fetchWeb3.js").connect;
const stdLog = require("./stdLog.js").stdLog;
const BN = require('bignumber.js');

const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_params = JSON.parse(fs.readFileSync('./config/liquidity_input_params.json', 'utf8'));
const config_addresses = JSON.parse(fs.readFileSync('./config/Addresses.json', 'utf8'));

//CHANGE THIS
NETWORK = "staging"
AUTOMATED_RESERVE_ADDRESS = "0x3480e12b6c2438e02319e34b4c23770679169190"

const ETH_ADDRESS = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
const {addresses, wallets, web3} = connect(NETWORK);
const kyber_reserve_ABI = config_abis.KyberReserve;
const liquidity_conversion_rates_ABI = config_abis.LiquidityConversionRates;
const erc20_token_ABI = config_abis.ERC20;

async function main() {
  reserveInstance = new web3.eth.Contract(kyber_reserve_ABI,AUTOMATED_RESERVE_ADDRESS);
  pricingAddress = await reserveInstance.methods.conversionRatesContract().call((err,res) => {
    if (err) {
      stdLog(`Error: Check that reserve address is correct.`,'error');
      stdLog(`Error: ${err}`);
    }
  });
  stdLog(`Pricing contract: ${pricingAddress}`,'cyan');
  pricingInstance = new web3.eth.Contract(liquidity_conversion_rates_ABI, pricingAddress);
  tokenAddress = await pricingInstance.methods.token().call();
  stdLog(`Token: ${tokenAddress}`,'cyan')
  tokenInstance = new web3.eth.Contract(erc20_token_ABI, tokenAddress);
  TOKEN_DECIMALS = await tokenInstance.methods.decimals().call();
  TOKEN_SYMBOL = await tokenInstance.methods.symbol().call();
  await checkContractPointingToNetwork(reserveInstance);

  ////////////////////
  // CHECK BALANCES //
  ////////////////////
  await checkETHBalance(AUTOMATED_RESERVE_ADDRESS);
  await checkTokenBalance(tokenInstance,AUTOMATED_RESERVE_ADDRESS);

  ////////////////////////////
  // CHECK PRICING CONTRACT //
  ////////////////////////////
  rate1 = await pricingInstance.methods.getRate(
    tokenAddress, // conversionToken
    0, // currentBlockNumber
    true, // buy
    web3.utils.toWei('1'), // srcQty
  ).call();

  checkRateIsZero(rate1, 'pricing');

  rate2 = await pricingInstance.methods.getRate(
    tokenAddress, // conversionToken
    0, // currentBlockNumber
    true, //buy
    web3.utils.toWei('2'), // srcQty
  ).call();

  rate1 = 1 / (rate1 / 10**18);
  rate2 = 1 / (rate2 / 10**18);

  verifyInitialPrice(rate1,rate2,'pricing');
  verifyPriceMovement(rate1,rate2,'pricing');

  ////////////////////////////
  // CHECK RESERVE CONTRACT //
  ////////////////////////////
  rate1 = await reserveInstance.methods.getConversionRate(
    ETH_ADDRESS, // srcToken
    tokenAddress, // destToken
    web3.utils.toWei('1'), // srcQty
    0, // blockNumber
  ).call()

  checkRateIsZero(rate1, 'reserve');

  rate2 = await reserveInstance.methods.getConversionRate(
    ETH_ADDRESS, // srcToken
    tokenAddress, // destToken
    web3.utils.toWei('2'), // srcQty
    0, // blockNumber
  ).call()

  rate1 = 1 / (rate1 / 10**18);
  rate2 = 1 / (rate2 / 10**18);

  verifyInitialPrice(rate1,rate2,'reserve');
  verifyPriceMovement(rate1,rate2,'reserve');
  process.exit(0);
}

async function checkContractPointingToNetwork(reserveInstance) {
  expectedNetworkAddress = config_addresses[NETWORK].KyberNetwork;
  actualNetworkAddress = await reserveInstance.methods.kyberNetwork().call();
  if (expectedNetworkAddress.toLowerCase() == actualNetworkAddress.toLowerCase()) {
    stdLog(`Reserve pointing to correct network contract, OK!`,'success');
  } else {
    stdLog(`Reserve pointing to wrong network contract`,'error');
    stdLog(`Expected network address: ${expectedNetworkAddress}`);
    stdLog(`Actual network address: ${actualNetworkAddress}`);
  }
  return;
}

function checkRateIsZero(rate, contractName) {
  if (rate == 0) {
    stdLog(`Rate returned from ${contractName} contract is zero.`,'error');
    process.exit(0);
  } else {
    stdLog(`${contractName} contract returning rate, OK!`,'success');
  }
}

function verifyInitialPrice(rate1,rate2,contractName) {
  rateDiffInPercent = (rate1 - config_params.initial_price) / config_params.initial_price * 100;
  //Check that initial price is within acceptable bounds
  if(Math.abs(rateDiffInPercent - config_params.fee_percent) > 0.5) {
    stdLog(`Error: Initial price in ${contractName} contract off from desired by ${rateDiffInPercent - config_params.fee_percent}`,'error');
    stdLog(`Expected Price: ${config_params.initial_price}`);
    stdLog(`Actual Price: ${rate1}`);
  } else {
    stdLog(`Initial price in ${contractName} contract OK!`,'success')
  };
}

const verifyPriceMovement = function(rate1,rate2,contractName) {
  rateDiffInPercent = (rate2 - rate1) / rate1;
  if(Math.abs(rateDiffInPercent - (config_params.liquidity_rate / 2)) > 0.0001) {
    stdLog(`Error: Price movement in ${contractName} contract off from desired.`,'error');
    stdLog(`Expected movement: ${config_params.liquidity_rate / 2}`);
    stdLog(`Actual movement: ${rateDiffInPercent}`);
    stdLog(`1 ETH --> 1 ${TOKEN_SYMBOL} = ${rate1} ETH`);
    stdLog(`2 ETH --> 1 ${TOKEN_SYMBOL} = ${rate2} ETH`);
  } else {
    stdLog(`Price movement in ${contractName} OK!`,'success');
  }
}

async function checkETHBalance(reserveAddress) {
  expectedETHBalance = web3.utils.toWei(config_params.initial_ether_amount.toString())
  actualETHBalance = await web3.eth.getBalance(reserveAddress);
  imbalance = Math.abs(actualETHBalance - expectedETHBalance);
  if (imbalance > 1000) {
    stdLog(`Error: Initial ETH balance off by ${imbalance/10**18}`,'error');
    stdLog(`Expected ETH balance: ${config_params.initial_ether_amount}`);
    stdLog(`Actual ETH balance: ${actualETHBalance/10**18}`);
  } else {
    stdLog(`Reserve ether balance OK!`,'success');
  }
}

async function checkTokenBalance(tokenInstance,reserveAddress) {
  expectedTokenBalance = config_params.initial_token_amount * 10**TOKEN_DECIMALS;
  reserveInstance = new web3.eth.Contract(kyber_reserve_ABI,reserveAddress);
  try {
    tokenWallet = await reserveInstance.methods.tokenWallet(tokenInstance.options.address).call();
  } catch (e) {
    tokenWallet = reserveAddress;
  }

  actualTokenBalance = await tokenInstance.methods.balanceOf(tokenWallet).call();
  expectedTokenBalance = new BN(expectedTokenBalance);
  actualTokenBalance = new BN(actualTokenBalance);
  imbalance = expectedTokenBalance.minus(actualTokenBalance);
  if (imbalance > 1000) {
    stdLog(`Error: Initial token balance off by ${imbalance/10**TOKEN_DECIMALS}`,'error');
    stdLog(`Expected token balance: ${config_params.initial_token_amount}`);
    stdLog(`Actual token balance: ${actualTokenBalance/10**TOKEN_DECIMALS}`);
  } else {
    stdLog(`Reserve token balance OK!`,'success');
  }
}

main()
