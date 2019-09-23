const fetch = require("node-fetch");

module.exports = {
  getTokenInfo: async function(network, onlyPermissioned, tokensToGet) {
    prefix = network == "mainnet" ? "" : `${network}-`;
    url = `https://${prefix}api.kyber.network/currencies?only_official_reserve=${onlyPermissioned}`;
    tokenInfoRequest = await fetch(url);
    tokenInfo = await tokenInfoRequest.json();
    tokenInfo = tokenInfo.data;
    if (!tokensToGet) return tokenInfo;

    results = [];
    tokensToGet.forEach(symbol => {
      results.push(
        tokenInfo.find(tokenDetails => {
          return tokenDetails.symbol == symbol;
        })
      );
    });
    return results;
  }
};
