var path = require('path');

module.exports = {
  entry  : {
    client: './public/scripts/joystick.js',
    host: './public/scripts/spacewar.js',
  },
  output : {
    path     : path.join(__dirname, 'public/out'),
    filename : '[name]-bundle.js'
  },
  module : {
    loaders: [ {
      test   : /.js$/,
      loader : 'babel-loader'
    }
    ]
  }
};
