const fs = require('fs');
const connect = require("./fetchWeb3.js").connect;
const stdLog = require("./stdLog.js").stdLog;

const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_addresses = JSON.parse(fs.readFileSync('./config/Addresses.json', 'utf8'));

//CHANGE THIS
NETWORK = "mainnet"
ORDERBOOK_RESERVES = ["0x9D27a2D71Ac44E075f764d5612581E9Afc1964fd"]

const {addresses, wallets, web3} = connect(NETWORK);
const orderbook_reserve_ABI = config_abis.OrderbookReserve;

async function main() {
  stdLog(`----------START----------`)
  for (var i=0;i<ORDERBOOK_RESERVES.length;i++) {
    orderbookReserveAddress = ORDERBOOK_RESERVES[i];
    orderbookInstance = new web3.eth.Contract(orderbook_reserve_ABI,orderbookReserveAddress);
    ({
      minNewOrderSizeUsd,
      maxOrdersPerTrade,
      minNewOrderSizeWei,
      minOrderSizeWei
    } = await orderbookInstance.methods.limits().call()
    );
    stdLog(`Reserve Address: ${orderbookReserveAddress}`);
    stdLog(`minNewOrderUsd: ${minNewOrderSizeUsd}`);
    stdLog(`maxOrdersPerTrade: ${maxOrdersPerTrade}`);
    stdLog(`minNewOrderSizeWei: ${minNewOrderSizeWei}`);
    stdLog(`minOrderSizeWei: ${minOrderSizeWei}`);

    ({
      kncToken,
      token,
      feeBurner,
      kyberNetwork,
      medianizer,
      orderListFactory
    } = await orderbookInstance.methods.contracts().call()
    );
    stdLog(`token: ${token}`);
    stdLog(`feeBurner: ${feeBurner}`);
    stdLog(`kyberNetwork: ${kyberNetwork}`);
    stdLog('------------------------------');
  }
  process.exit(0);
}

main()
