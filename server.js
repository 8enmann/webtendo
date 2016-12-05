'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');
var hashwords = require('hashwords');

const hasher = hashwords({salt: '~webtendo~'});

function getRoomId(seed) {
  return hasher.hashStr(seed).toLowerCase().split(' ').slice(0,2).join('-');
}

var file = new nodeStatic.Server('./public');
var app = http.createServer(function(req, res) {
  file.serve(req, res);
}).listen(process.env.PORT || 8080);

var hosts = {};
var clients = {};
var io = socketIO.listen(app);
io.sockets.on('connection', function(socket) {
  var socketClientId;
  var hostId;
  var clientIP;
  var socketRoom;
  if (socket.request.headers['x-forwarded-for']) {
    clientIP = socket.request.headers['x-forwarded-for'];
    console.log('clientIP', clientIP, 'aka', getRoomId(clientIP));
  }

  // convenience function to log server messages on the client
  function log() {
    var array = ['Message from server:'];
    array.push.apply(array, arguments);
    // socket.emit('log', array);
    console.log(array);
  }

  // Message passthrough for signaling.
  socket.on('message', message => {
    log('Client said: ', message);
    if (message.recipient) {
      io.to(clients[message.recipient]).emit('message', message);
    } else {
      io.to(socketRoom).emit('message', message);
    }
  });

  socket.on('get room', () => {
    socket.emit('room', getRoomId(clientIP));
  });

  socket.on('create or join', function(room, clientId, isHost) {
    socketRoom = room || getRoomId(clientIP);
    room = socketRoom;
    log('create or join room ' + room + ' from ' + clientId);
    clients[clientId] = socket.id;
    socketClientId = clientId;
    if (isHost) {
      socket.join(room);
      hosts[room] = clientId;
      io.to(room).emit('created', room, clientId);
      return;
    }
    if (!io.sockets.adapter.rooms[room]) {
      socket.emit('nohost', room);
      return;
    }
    var numClients = io.sockets.adapter.rooms[room].length;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');
    if (numClients < 10) {
      log('Client ID ' + socket.id + ' joined room ' + room);
      hostId = hosts[room];
      socket.join(room);
      // Tell host to send an offer.
      io.to(clients[hostId]).emit('joined', room, clientId);
      // Echo back to sender so they know they joined successfully.
      socket.emit('joined', room, clientId);
    } else { // max two clients
      socket.emit('full', room);
    }
  });
  socket.on('disconnect', () => {
    if (!socketClientId) {
      return;
    }
    console.log(socketClientId, 'disconnected from ', socketRoom);
    io.to(clients[hostId]).emit('disconnected', socketClientId);
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
