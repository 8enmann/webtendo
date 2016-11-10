'use strict';

var depLinker = require('dep-linker');
var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');


depLinker.linkDependenciesTo('./public/scripts')
  .then(() => console.log('Finished copying deps'));
var file = new nodeStatic.Server('./public');
var app = http.createServer(function(req, res) {
  file.serve(req, res);
}).listen(8080);

var io = socketIO.listen(app);
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    // socket.emit('log', array);
    console.log(array);
  }

  // Message passthrough, client expects 'type' property.
  socket.on('message', (message) => {
    log('Client said: ', message);
    if (message.recipient) {
      io.to(socketid).emit('message', message);
    } else {
      // for a real app, would be room-only (not broadcast)
      // TODO: make this room-only
      socket.broadcast.emit('message', message);
    }
  });

  socket.on('create or join', function(room, clientId) {
    log('create or join room ' + room + ' from ' + clientId + ' ' + socket.handshake.address + '//' + socket.request.connection.remoteAddress);

    
    var numClients = io.sockets.sockets.length;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 1) {
      socket.join(room);
      log('Client ID ' + socket.id + ' created room ' + room);
      socket.emit('created', room, clientId);

    } else if (numClients < 10) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready', room, clientId);
    } else { // max two clients
      socket.emit('full', room);
    }
  });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log('received bye');
  });

});
