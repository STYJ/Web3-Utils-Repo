const moment = require('moment');

module.exports = {
  stdLog: function(input) {
    console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss.SSS')}] ${input}`);
  }
}
