var path = require('path');

module.exports = {
  entry: {
    'spacewar-client': './public/spacewar/joystick.js',
    'spacewar-host': './public/spacewar/spacewar.js',
  },
  output: {
    path: path.join(__dirname, 'public/out'),
    filename: '[name]-bundle.js'
  },
  module: {
    loaders: [{
      test: /.js$/,
      loader: 'babel-loader'
    }
    ]
  }
};
