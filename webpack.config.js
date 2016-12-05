var path = require('path');

module.exports = {
  entry: {
    'index': './public/scripts/index.js',
    'spacewar-client': './public/spacewar/joystick.js',
    'spacewar-host': './public/spacewar/spacewar.js',
    'poker-client': './public/poker/poker-client.js',
    'poker-host': './public/poker/poker.js',
    'scrabble-client': './public/scrabble/scrabble-client.js',
    'scrabble-host': './public/scrabble/scrabble.js',
  },
  output: {
    path: path.join(__dirname, 'public/out'),
    filename: '[name]-bundle.js'
  },
  devtool: 'cheap-module-eval-source-map',
  module: {
    loaders: [{
      test: /.js$/,
      loader: 'babel-loader'
    }
    ]
  },
  debug: true
};
