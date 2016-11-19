var path = require('path');

module.exports = {
  entry  : {
    client: './public/scripts/scrabble-client.js',
    host: './public/scripts/scrabble.js',
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
