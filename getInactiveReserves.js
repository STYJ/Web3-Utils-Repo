const fs = require("fs");
const connect = require("./fetchWeb3.js").connect;
const stdLog = require("./stdLog.js").stdLog;
const getTokenInfo = require("./getTokenInfo.js").getTokenInfo;

const configABIs = JSON.parse(fs.readFileSync("./config/ABI.json", "utf8"));
const configAddresses = JSON.parse(
  fs.readFileSync("./config/Addresses.json", "utf8")
);
const erc20TokenABI = configABIs.ERC20;
const kyberReserveABI = configABIs.KyberReserve;
const conversionsRateABI = configABIs.ConversionRates;
const liquidityConversionsRateABI = configABIs.LiquidityConversionRates;

const network = "mainnet";
const tokensToFetch = ["MYB"];
const { web3 } = connect(network);


async function main() {
  tokenInfo = await getTokenInfo(network, false, tokensToFetch);
  console.log(tokenInfo);
  process.exit(0);
}

// async function getReserveBalancesPerToken(tokenInfo) {
//   for (var i = 0; i < tokenInfo.length; i++) {
//     token = tokenInfo[i];
//     if (!token.reserves_src) continue;
//     tokenContract = new web3.eth.Contract(erc20_token_ABI, token.address);
//     if (!token.symbol) {
//       token.symbol = token.address;
//     }
//     stdLog(`---- RESERVE INFO FOR ${token.symbol} --- `, "header");
//     for (var j = 0; j < token.reserves_src.length; j++) {
//       reserve = token.reserves_src[j];
//       //handle exceptions like Uniswap, DutchX, Eth2Dai reserves
//       if (SPECIAL_RESERVES.includes(reserve)) {
//         reserve = await obtainReserveStoringFunds(reserve, token.address);
//       }

//       stdLog(`Reserve: ${reserve}`, "red");
//       //get reserve ETH balance
//       reserveBalance = (await web3.eth.getBalance(reserve)) / 10 ** 18;
//       stdLog(`ETH Balance: ${reserveBalance}`);
//       reserveTokenBalance = await getTokenBalance(
//         reserve,
//         tokenContract,
//         token.decimals
//       );
//       stdLog(`Token Balance: ${reserveTokenBalance}`);
//     }
//   }
//   return;
// }


main();
