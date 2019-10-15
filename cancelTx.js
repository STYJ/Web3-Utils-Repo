const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const account = web3.eth.accounts.privateKeyToAccount('');

async function main() {
    const txKey = account.privateKey;

    const txParams = {
        from: account.address,
        to: account.address,
        value: 0,
        gas: 21000,
        gasPrice: 30000000000,
        nonce: '273',
    };

    const signedTx = await web3.eth.accounts.signTransaction(txParams, txKey);
    console.log(signedTx.rawTransaction);
}

main();