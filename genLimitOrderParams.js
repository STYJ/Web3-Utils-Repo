const secp256k1 = require("secp256k1");
const ethUtils = require("ethereumjs-util");
const connect = require("./fetchWeb3.js").connect;
const stdLog = require("./stdLog.js").stdLog;
const BN = require('bignumber.js');

//CHANGE THIS
var PRIVATE_KEY = ""; //WITH 0x prefix. Leave empty if to use wallet from .env file
const NETWORK = "mainnet";
const LIMIT_ORDER_CONTRACT = "0x0f01b5ea43719683c546868bfadeaccde14ab79e";
const SRC_TOKEN = "0xd26114cd6ee289accf82350c8d8487fedb8a0c07"; //OMG
const SRC_QTY = 50000000000000000; //in SRC_TOKEN decimals Eg. 50000000000000000 = OMG
const DEST_TOKEN = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"; //ETH
const MIN_CONVERSION_RATE = 0;
const FEE_IN_PRECISION = 1000; //1%
CONCAT_ADDRESSES = getConcatenatedTokenAddresses(SRC_TOKEN,DEST_TOKEN);

const {addresses, wallets, web3} = connect(NETWORK);

if (!PRIVATE_KEY) {
  USER_ADDRESS = addresses[0];
  PRIVATE_KEY = wallets[USER_ADDRESS]._privKey;
} else {
  USER_ADDRESS = privateKeyToAddress(PRIVATE_KEY);
}

const DEST_ADDRESS = USER_ADDRESS;

function main() {
	NONCE = getNonce();
  stdLog(`Params for limit order`,`header`);
  stdLog(`User Address: ${USER_ADDRESS}`);
  stdLog(`Nonce: ${NONCE}`);
  stdLog(`Src Token: ${SRC_TOKEN}`);
  stdLog(`Src Qty: ${SRC_QTY}`);
  stdLog(`Dest Token: ${DEST_TOKEN}`);
	stdLog(`Dest Address: ${DEST_ADDRESS}`);
  stdLog(`Min Rate: ${MIN_CONVERSION_RATE}`);
  stdLog(`Fee: ${FEE_IN_PRECISION}`);
	sig = getLimitOrderSig(USER_ADDRESS,PRIVATE_KEY,NONCE,SRC_TOKEN,SRC_QTY,DEST_TOKEN,DEST_ADDRESS,MIN_CONVERSION_RATE,FEE_IN_PRECISION);
  stdLog(`v: ${sig.v}`);
  stdLog(`r: ${sig.r}`);
  stdLog(`s: ${sig.s}`);
  process.exit(0);
}

function getNonce() {
	currentTimestamp = web3.utils.toHex(Date.now());
	currentTimestamp = currentTimestamp.substring(2);
	currentTimestamp = leftPadWithZeroes(currentTimestamp);
	//first 16 bytes = 32 char length + 0x prefix of length 2 = 34
	return LIMIT_ORDER_CONTRACT.substring(0,34) + currentTimestamp;
}

function leftPadWithZeroes(timeStampInHex) {
	return '0'.repeat(32 - timeStampInHex.length)+timeStampInHex;
}

function getLimitOrderSig(userAddress,userPrivateKey,nonce,srcToken,srcQty,destToken,destAddress,minConversionRate,feeInPrecision) {
	srcQty = web3.utils.toBN(srcQty);
	minConversionRate = web3.utils.toBN(minConversionRate);
	feeInPrecision = web3.utils.toBN(feeInPrecision);

	const prefixBuffer = ethUtils.toBuffer('0x');
	const userAddressBuffer = ethUtils.setLength(ethUtils.toBuffer(userAddress),20);
	const nonceBuffer = ethUtils.setLength(ethUtils.toBuffer(nonce),32);
	const srcTokenBuffer = ethUtils.setLength(ethUtils.toBuffer(srcToken),20);
	const srcQtyBuffer = ethUtils.setLength(ethUtils.toBuffer(srcQty),32);
	const destTokenBuffer = ethUtils.setLength(ethUtils.toBuffer(destToken),20);
	const destAddressBuffer = ethUtils.setLength(ethUtils.toBuffer(destAddress),20);
	const convRateBuffer = ethUtils.setLength(ethUtils.toBuffer(minConversionRate),32);
	const feeBuffer = ethUtils.setLength(ethUtils.toBuffer(feeInPrecision),32);

	const message = Buffer.concat([
		prefixBuffer,
		userAddressBuffer,
	  nonceBuffer,
	  srcTokenBuffer,
	  srcQtyBuffer,
	  destTokenBuffer,
	  destAddressBuffer,
	  convRateBuffer,
	  feeBuffer
	]);

	msgHash = ethUtils.keccak256(message);
	msgHash = '0x' + msgHash.toString('hex');
  msgHash = web3.utils.soliditySha3(userAddress,nonce,srcToken,srcQty,destToken,destAddress,minConversionRate,feeInPrecision);
	ret = ecsign(msgHash,userPrivateKey);
  return ret;
}

function ecsign(msgHash, privateKey) {
  msgHashWithPrefix = web3.utils.soliditySha3("\x19Ethereum Signed Message:\n32",msgHash);
  msgHashWithPrefix = ethUtils.toBuffer(msgHashWithPrefix);
  const sig = secp256k1.sign(msgHashWithPrefix, ethUtils.toBuffer(privateKey))
  const ret = {}
  ret.msgHash = msgHash;
  ret.r = "0x" + ethUtils.setLength(sig.signature.slice(0, 32),32).toString('hex')
  ret.s = "0x" + ethUtils.setLength(sig.signature.slice(32, 64),32).toString('hex')
  ret.v = "0x" + ethUtils.toBuffer(sig.recovery + 27).toString('hex')
  return ret;
}

function privateKeyToAddress(key) {
  const privateKey = ethUtils.toBuffer(key);
  const pubKey = ethUtils.privateToPublic(privateKey);
  return "0x" + ethUtils.publicToAddress(pubKey).toString('hex');
}

function getConcatenatedTokenAddresses(srcToken,destToken) {
  //obtain only 16 bytes of srcToken and destToken
  srcToken = srcToken.substring(0,34).toLowerCase();
  destToken = destToken.substring(2,34).toLowerCase(); //remove 0x prefix
  concatenatedAddresses = srcToken + destToken;
  return new BN(concatenatedAddresses);
}

main()
