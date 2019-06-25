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
### `aprRateChecker.js` - APR Rate Checker
Checks that initial price and movement is as determined in liquidity params for the APR.
1) Modify `liquidity_input_params.json` to match the settings used for the python script
2) Run `aprRateChecker.js`

### `checkReserveRatesOnKN.js` - Check Reserve Rates On Kyber Network (Ropsten / Staging)
Checks that the rate set by the reserve can be seen in kyber network proxy, after addition to the network

### `getOrderbookReserveLimits.js` - Get Orderbook Reserve Limits
Obtain the following information for an orderbook reserve:
1. `minNewOrderUsd`
2. `maxOrdersPerTrade`
3. `minNewOrderSizeWei`
4. `minOrderSizeWei`
5. Reserve token
6. Fee burner contract address
7. Kyber Network address

### `getTokenInfo.js` - Get Token Info
Useful for use in other scripts
```
import { getTokenInfo } from "./getTokenInfo.js";
const NETWORK = "ropsten"
await getTokenInfo(NETWORK,false,["BAT","MYB"]);
```

## JSON Structure
- All variables inside the json files in the `./config` folder are arranged in alphabetical order
