var path = require('path');

module.exports = {
  entry: {
    'spacewar-client': './public/spacewar/joystick.js',
    'spacewar-host': './public/spacewar/spacewar.js',
    'poker-client': './public/poker/poker-client.js',
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
  }
};
