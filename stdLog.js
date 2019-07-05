const moment = require('moment');
var colors = require('colors');

colors.setTheme({
  rainbow: 'rainbow',
  grey: 'grey',
  red: 'red',
  header: ['bgWhite','black'],
  warn: ['bgYellow','black'],
  debug: 'blue',
  error: ['bgRed','white'],
  white: 'white',
  success: 'green'
});

module.exports = {
  stdLog: function(input,colorType='white') {
    console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss.SSS')}] ${input}`[colorType]);
  }
}
