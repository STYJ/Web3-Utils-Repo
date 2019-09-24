## Setup
### Step 1: `npm install`
### Step 2: Add env variables
Create a .env file and add the INFURA_PROJECT_ID and MNEMONIC environment variables. To generate a random 12-word mnemonic phrase, visit https://iancoleman.io/bip39/

#### Example
```
INFURA_PROJECT_ID=0123456789abcdef01234567abcdef01
MNEMONIC=parrot consider guilt grit pull next bundle flat pepper over number rail
```

## Scripts
### `getInactiveReserves.js` - Getting a list of inactive reserves (FPR + APR only)
Retrieves a list of inactive reserves based on the `TradeExecute` event. The script will look for the `TradeExecute` event since the specified block number till the latest block.
1) Run `getInactiveReserves.js` <block #> e.g. `node getInactiveReserves.js 8500000`

### `aprPriceDebugger.js` - APR Rate Debugger
Should the price for the APR reserve be zero, this script can be run to try to figure out why.
Checks for both pricing and reserve contract.

### `aprRateChecker.js` - APR Rate Checker
Checks that initial price and movement is as determined in liquidity params for the APR.
1) Modify `liquidity_input_params.json` to match the settings used for the python script
2) Run `aprRateChecker.js`

### `checkReserveRatesOnKN.js` - Check Reserve Rates On Kyber Network (Ropsten / Staging)
Checks that the rate set by the reserve can be seen in kyber network proxy, after addition to the network

### `genDataFieldForAddRemoveReserve.js` - Generate data field for add and remove reserve functions
Due to Gnosis multisig UI, adding or remove reserve has to be done via MEW / MyCrypto. This script generates the data
field required for those functions.

### `genLimitOrderParams.js` - Generate limit order params
Generate the limit order parameters needed for a limit order. Works with either private key or the HD wallet provdier in the .env file

### `get_liquidity_params.py` - Get liquidity params
`python3 get_liquidity_params.py --input ./config/liquidity_input_params.json --get params`

### `getOrderbookReserveLimits.js` - Get Orderbook Reserve Limits
Obtain the following information for an orderbook reserve:
1. `minNewOrderUsd`
2. `maxOrdersPerTrade`
3. `minNewOrderSizeWei`
4. `minOrderSizeWei`
5. Reserve token
6. Fee burner contract address
7. Kyber Network address

### `getReserveBalances.js` - Get Reserve Balances
Reads the `./currencies` API, then for each reserve, obtains the ETH and token balances.

### `getReserveStatuses.js` - Get Reserve Status
Iterates through each reserve to see if they return a conversion rate for their token pair(s).

### `getTokenInfo.js` - Get Token Info
Useful for use in other scripts. Parameters below:
1. `Network` - What network to use. Exclude staging.
2. `onlyPermissioned` - Whether to filter for only permissioned reserves.
3. `tokensToGet` - Use if only specific tokens are needed.

#### All Tokens
```
const getTokenInfo = require("./getTokenInfo.js").getTokenInfo;
const NETWORK = "ropsten";
await getTokenInfo(NETWORK,false,'');
```

#### Specific Tokens
```
const getTokenInfo = require("./getTokenInfo.js").getTokenInfo;
const NETWORK = "ropsten";
await getTokenInfo(NETWORK,false,["BAT","MYB"]);
```

### `pastHelper.js` - Module with functions to get past information

#### `getBlockTimestamp`
Obtains the timestamp of a block
1. `web3` - web3 instance
2. `blockNumber` - blockNumber to obtain timestamp of

#### `getPastEvents`
Obtains the past events for a given contract and time range (specified in block number)
1. `web3` - web3 instance
2. `contract` - contract instantiated via web3 (Eg. `contract = new web3.eth.Contract(contractABI,contractAddress)`)
3. `eventName` - event name
4. `startBlock` - starting block to query from
5. `endBlock` (optional) - end block to query till. Default will be `latest`
6. `queryInterval` (optional) - block interval to use between queries. Default is `10000`.

##### Examples
`const getPastEvents = require('./pastHelper.js').getPastEvents;`
`await getPastEvents(web3,networkContract,'TradeEnabled',6700000);`
`await getPastEvents(web3,networkContract,'TradeExecute',7000000,undefined,5000)`;

#### `getStartBlock`
Calculates the block number X days from now, where X is an input parameter.
1. `web3` - web3 instance
2. `queryDuration` - No. of days from current time
3. `averageBlockTime` (optional) - Average ETH block time (in seconds)
4. `blockDurationBuffer` (optional) - Error margin (in seconds) for determining the start block

##### Examples
`const getStartBlock = require('./pastHelper.js').getStartBlock;`

1. Get number of block mined 5 days ago
`startBlock = await getStartBlock(web3,5);`

2. Get number of block mined 1 hour ago
`startBlock = await getStartBlock(web3,1/24);`

3, Get number of block mined 1 day ago, with margin of 1 minute
`startBlock = await getStartBlock(web3,1,undefined,60);`

## JSON Structure
- All variables inside the json files in the `./config` folder are arranged in alphabetical order
