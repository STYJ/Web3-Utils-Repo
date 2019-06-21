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
### Get Token Info
```
import { getTokenInfo } from "./getTokenInfo.js";
const NETWORK = "ropsten"
await getTokenInfo(NETWORK,false,["BAT","MYB"]);
```

## JSON Structure
- All variables inside the json files in the `./config` folder are arranged in alphabetical order
