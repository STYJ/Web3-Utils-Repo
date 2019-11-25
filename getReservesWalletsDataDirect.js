const fs = require('fs');
const Web3 = require('web3');
const fetch = require("node-fetch");
require('dotenv').config();

//CHANGE THESE SETTINGS
const OUTPUT_FILENAME = "reservesWalletsStaging.json"
const NETWORK = "mainnet"
// const START_BLOCK = 6996580 ; //staging
const START_BLOCK = 7003117; //mainnet
let CURRENT_BLOCK;

//instantiate web3 instance
const project_id = process.env.INFURA_PROJECT_ID;
const infura_url = `wss://${NETWORK}.infura.io/ws/v3/${project_id}`;
const web3 = new Web3(new Web3.providers.WebsocketProvider(infura_url));

//read config info
const config_abis = JSON.parse(fs.readFileSync('./config/ABI.json', 'utf8'));
const config_addresses = JSON.parse(fs.readFileSync('./config/Addresses.json', 'utf8'));
const fee_burner_ABI = config_abis.FeeBurner;
const kyber_network_ABI = config_abis.KyberNetwork;
const orderbook_reserve_ABI = config_abis.OrderbookReserve;
const fee_burner_address = config_addresses[NETWORK].FeeBurner;
const kyber_network_address = config_addresses[NETWORK].KyberNetwork;
const ethAddress = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
let wrapFeeBurnerInstance;
let feeBurnerInstance;
let kyberNetworkInstance;
let reserves;

//json object that stores the fee data
var RESULT = {}

async function main() {
    CURRENT_BLOCK = await web3.eth.getBlockNumber();
    feeBurnerInstance = new web3.eth.Contract(fee_burner_ABI, fee_burner_address);
    kyberNetworkInstance = new web3.eth.Contract(kyber_network_ABI, kyber_network_address);
    reserves = await kyberNetworkInstance.methods.getReserves().call();
    await fetchReservesData()
    await fetchWalletData();
    exportToJSON();
    console.log("Done!")
    //process.exit(0);
}

async function fetchReservesData() {
    reservesInfo = []
    for (var i=0; i<reserves.length; i++) {
        reserve = reserves[i];
        if (await isOrderbookReserve(reserve)) continue;
        //get token info
        reserveTokens = await getTokensOfReserve(reserve);
        //reserves not listed for any token, don't migrate
        if (reserveTokens.length === 0) continue;
        reserveFeeInfo = await getReserveFeeData(reserve);
        reservesInfo.push({
            'address': reserve,
            'KNCWallet': reserveFeeInfo.wallet,
            'fees': reserveFeeInfo.fees,
            'tokens': reserveTokens
        });
    }
    RESULT.reserves = reservesInfo;
}

async function isOrderbookReserve(reserve) {
    try {
        orderbookReserve = new web3.eth.Contract(orderbook_reserve_ABI, reserve);
        isOrderbook = await orderbookReserve.methods.NUM_ORDERS().call();
        return true;
    } catch(e) {
        return false;
    }
}

async function getTokensOfReserve(reserve) {
    reserveTokens = [];
    ethToToken = [];
    tokenToEth = [];
    pastListedPairs = await kyberNetworkInstance.getPastEvents('ListReservePairs',{
        filter: {reserve: reserve},
        fromBlock: START_BLOCK,
        toBlock: CURRENT_BLOCK
      });
    
    for (var i=0; i<pastListedPairs.length; i++) {
        listEvent = pastListedPairs[i];
        txHash = listEvent.transactionHash;
        // console.log(txHash);
        listEventValues = listEvent.returnValues;
        //ETH -> token events
        if (listEventValues.src.toLowerCase() === ethAddress) {
            //listing token, add into array
            if (listEventValues.add) {
                index = ethToToken.indexOf(listEventValues.dest);
                if (index == -1) ethToToken.push(listEventValues.dest);
            //delisting token, remove from array
            } else {
                index = ethToToken.indexOf(listEventValues.dest);
                if (index > -1) ethToToken.splice(index,1);
            }
        //token -> ETH events
        } else {
            //listing token, add into array
            if(listEventValues.add) {
                index = tokenToEth.indexOf(listEventValues.src);
                if (index == -1) tokenToEth.push(listEventValues.src);
            //delisting token, remove from array
            } else {
                index = tokenToEth.indexOf(listEventValues.src);
                if (index > -1) tokenToEth.splice(index,1);
            }
        } 
    }

    //add eth to token pair to reserve token result
    for (var i=0; i<ethToToken.length; i++) {
        token = ethToToken[i];
        reserveTokens[token] = {
            'address': token,
            'ethToToken': true,
            'tokenToEth': false
        };
    }

    //add token to eth pair to reserve token result
    for (var i=0; i<tokenToEth.length; i++) {
        token = tokenToEth[i];
        if (reserveTokens[token]) {
            reserveTokens[token].tokenToEth = true;
        } else {
            reserveTokens[token] = {
                'address': token,
                'ethToToken': false,
                'tokenToEth': true
            };
        }
    }

    //convert reserveTokens object to array
    reserveTokens = Object.values(reserveTokens);
    return reserveTokens;
}
    
async function getReserveFeeData(reserve) {
    console.log(`Fetching reserve ${reserve} fee data...`);
    reserveKNCWallet = await feeBurnerInstance.methods.reserveKNCWallet(reserve).call();
    feesInBps = await feeBurnerInstance.methods.reserveFeesInBps(reserve).call();
    return({
        'wallet': reserveKNCWallet,
        'fees': feesInBps
    });
}

async function fetchWalletData() {
    walletFeeInfo = {};

    allFeeWalletEvents = await feeBurnerInstance.getPastEvents('WalletFeesSet',{
        fromBlock: 0,
        toBlock: 'latest'
    });

    for (var i=0; i<allFeeWalletEvents.length; i++) {
        feeWalletEvent = allFeeWalletEvents[i].returnValues;
        walletFeeInfo[feeWalletEvent.wallet] = {
            'id': feeWalletEvent.wallet,
            'fees': feeWalletEvent.feesInBps
        }
    }

    RESULT.wallets = Object.values(walletFeeInfo);
}

function exportToJSON() {
    fs.writeFile(OUTPUT_FILENAME, JSON.stringify(RESULT, null, 2), function(err) {
        if(err) console.log(err);
    });
}

main()
