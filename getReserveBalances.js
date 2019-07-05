const fs = require('fs');
const connect = require("./fetchWeb3.js").connect;
const stdLog = require("./stdLog.js").stdLog;
const getTokenInfo = require("./getTokenInfo.js").getTokenInfo;

const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_addresses = JSON.parse(fs.readFileSync('./config/Addresses.json', 'utf8'));
const erc20_token_ABI = config_abis.ERC20;
const kyber_reserve_ABI = config_abis.KyberReserve;
const dutchX_ABI = config_abis.DutchXReserve;
const uniswap_ABI = config_abis.UniswapReserve;

//CHANGE THIS
NETWORK = "mainnet" //Will not work on staging since no staging API!
TOKENS_TO_FETCH = ['BAT','MYB']
UNISWAP_RESERVE = "0x5D154c145Db2ca90B8aB5e8Fe3E716AfA4AB7Ff0";
DUTCHX_RESERVE = "0xD6000fda0b38f4Bff4CfAb188E0bd18e8725a5e7";
SPECIAL_RESERVES = [UNISWAP_RESERVE,DUTCHX_RESERVE];
const {addresses, wallets, web3} = connect(NETWORK);

async function main() {
  tokenInfo = await getTokenInfo(NETWORK,false,TOKENS_TO_FETCH);
  await getReserveBalancesPerToken(tokenInfo);
  process.exit(0);
}

async function getReserveBalancesPerToken(tokenInfo) {
  for (var i=0; i<tokenInfo.length; i++) {
    token = tokenInfo[i]
    if (!token.reserves_src) continue;
    tokenContract = new web3.eth.Contract(erc20_token_ABI,token.address)
    if (!token.symbol) {
      token.symbol = token.address
    }
    stdLog(`---- RESERVE INFO FOR ${token.symbol} --- `, 'header')
    reserveBalances = []
    for (var j=0; j<token.reserves_src.length;j++) {
      reserve = token.reserves_src[j];
      //handle exceptions like Uniswap, DutchX, Eth2Dai reserves
      if (SPECIAL_RESERVES.includes(reserve)) {
        reserve = await obtainReserveStoringFunds(reserve,token.address);
      }

      stdLog(`Reserve: ${reserve}`,'red');
      //get reserve ETH balance
      reserveBalance = await web3.eth.getBalance(reserve) / (10**18);
      stdLog(`ETH Balance: ${reserveBalance}`);
      reserveTokenBalance = await getTokenBalance(reserve,tokenContract,token.decimals);
      stdLog(`Token Balance: ${reserveTokenBalance}`);
    }
  }
  return;
}

async function obtainReserveStoringFunds(reserve,tokenAddress) {
  if (reserve == DUTCHX_RESERVE) {
    reserve = await getDutchXReserve(reserve);
  } else {
    reserve = await getUniswapReserve(reserve,tokenAddress);
  }
  return reserve;
}

async function getDutchXReserve(reserve) {
  dutchXReserve = new web3.eth.Contract(dutchX_ABI,reserve);
  dutchXReserve = await dutchXReserve.methods.dutchX().call();
  return dutchXReserve;
}

async function getUniswapReserve(reserve,tokenAddress) {
  uniswapReserve = new web3.eth.Contract(uniswap_ABI,reserve);
  uniswapReserve = await uniswapReserve.methods.tokenExchange(tokenAddress).call();
  return uniswapReserve;
}

async function getTokenBalance(reserve,tokenContract,decimals) {
  reserveInstance = new web3.eth.Contract(kyber_reserve_ABI,reserve);
  try {
    tokenWallet = await reserveInstance.methods.tokenWallet(tokenContract.options.address).call();
  } catch (e) {
    reserveTokenBalance = await tokenContract.methods.balanceOf(reserve).call()
    //if (reserveTokenBalance.balance) reserveTokenBalance = reserveTokenBalance.balance
    if (decimals) reserveTokenBalance = reserveTokenBalance / 10**decimals;
    return reserveTokenBalance;
  }

  reserveTokenBalance = await tokenContract.methods.balanceOf(tokenWallet).call()
  if (decimals) reserveTokenBalance = reserveTokenBalance / 10**decimals
  return reserveTokenBalance;
}

main()
