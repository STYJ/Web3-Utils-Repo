const fetch = require("node-fetch");

function getAPILink(network) {
  if (network == 'mainnet') {
    return("https://api.kyber.network");
  } else {
    return("https://" + network + "-api.kyber.network");
  }
}

module.exports = {
  getTokenInfo: async function(network,onlyPermissioned,tokensToGet) {
    url = getAPILink(network);
    if(onlyPermissioned) {
      url = url + "/currencies?only_official_reserve=true";
    } else {
      url = url + "/currencies?only_official_reserve=false";
    }
    tokenInfoRequest = await fetch(url);
    tokenInfo = await tokenInfoRequest.json()
    tokenInfo = tokenInfo.data
    result = {}
    for (var i=0; i<tokensToGet.length; i++) {
      for (var j=0; j<tokenInfo.length; j++) {
        token = tokenInfo[j];
        if (token.symbol == tokensToGet[i]) {
          result[token.symbol] = token;
        }
      }
    }
    return result;
  }
}
