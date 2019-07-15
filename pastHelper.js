const stdLog = require("./stdLog.js").stdLog;

var self = module.exports = {
  getStartBlock: async function (web3,queryDuration,averageBlockTime=17,blockDurationBuffer=40) {
    /*
    web3: web3 instance
    queryDuration: no. of days from now
    averageBlockTime: ETH average block time (in seconds)
    blockDurationBuffer: margin (in seconds) for determining start block
    */
    const DAY_IN_SECONDS = 86400;
    latestBlock = await web3.eth.getBlockNumber();
    queryTimeStamp = await self.getBlockTimestamp(web3, latestBlock);
    startTimeStamp = queryTimeStamp - queryDuration * DAY_IN_SECONDS;
    startBlock = latestBlock - Math.round(queryDuration * DAY_IN_SECONDS / averageBlockTime);

    while (Math.abs(queryTimeStamp - startTimeStamp) > blockDurationBuffer) {
      queryTimeStamp = await self.getBlockTimestamp(web3, startBlock);
      if (startTimeStamp > queryTimeStamp) {
        startBlock += Math.round((startTimeStamp - queryTimeStamp) / averageBlockTime);
      } else {
        startBlock -= Math.round((queryTimeStamp - startTimeStamp) / averageBlockTime);
      }
    }

    return startBlock;
  },

  getBlockTimestamp: async function (web3, blockNumber) {
    blockInfo = await web3.eth.getBlock(blockNumber);
    return blockInfo.timestamp;
  },

  getPastEvents: async function (web3, contract, eventName,
    startBlock, endBlock='latest', queryInterval=10000) {
      ALL_EVENTS = []
      latestBlockNumber = await web3.eth.getBlockNumber();
      if (endBlock == 'latest') endBlock = latestBlockNumber;
      currentBlock = startBlock;
      nextBlock = currentBlock + queryInterval;
      while (endBlock > nextBlock) {
        stdLog(`Querying event from block ${currentBlock} to ${nextBlock}`);
        pastEvents = await contract.getPastEvents(eventName,{
          fromBlock: currentBlock,
          toBlock: nextBlock
        });
        currentBlock = nextBlock+1;
        nextBlock += queryInterval;
        ALL_EVENTS = ALL_EVENTS.concat(pastEvents);
      }
      pastEvents = await contract.getPastEvents(eventName,{
          fromBlock: currentBlock,
          toBlock: endBlock
      });
      ALL_EVENTS = ALL_EVENTS.concat(pastEvents);
      return ALL_EVENTS;
  }
}
