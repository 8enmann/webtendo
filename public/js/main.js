'use strict';

/****************************************************************************
* Initial setup
****************************************************************************/

var configuration = {
  'iceServers': [
    {'url': 'stun:stun.l.google.com:19302'},
    {'url':'stun:stun.services.mozilla.com'}
  ]
};
// var configuration = null;

// var roomURL = document.getElementById('url');
var input = document.getElementById('input');
var output = document.getElementById('output');
var sendButton = document.getElementById('sendButton');
const AUTO_PING = true;

// Attach event handlers
sendButton.addEventListener('click', () => {
  console.log('sending ' + input.value);
  dataChannel.send(JSON.stringify({
    data: input.value,
    action: 'text',
  }));
});

// Create a random room if not already present in the URL.
var isHost = window.location.pathname.includes('host');
// TODO: get room from server based on external IP, then store in window.location.hash
var room = 'foo';

/****************************************************************************
* Signaling server
****************************************************************************/

// Connect to the signaling server
var socket = io.connect();

socket.on('ipaddr', function(ipaddr) {
  console.log('Server IP address is: ' + ipaddr);
  document.getElementById('ip').innerText = ipaddr;
  // updateRoomURL(ipaddr);
});

socket.on('created', function(room, clientId) {
  console.log('Created room', room, '- my client ID is', clientId);
});

socket.on('joined', function(room, clientId) {
  console.log('This peer has joined room', room, 'with client ID', clientId);
  createPeerConnection(isHost, configuration);
});

socket.on('full', function(room) {
  //alert('Room ' + room + ' is full. We will create a new room for you.');
  //window.location.hash = '';
  //window.location.reload();
  console.log('server thinks room is full');
  // TODO: remove this
});

socket.on('ready', function() {
  console.log('Socket is ready');
  createPeerConnection(isHost, configuration);
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

socket.on('message', function(message) {
  console.log('Client received message:', message);
  signalingMessageCallback(message);
});

// Join a room
socket.emit('create or join', room);

if (location.hostname.match(/localhost|127\.0\.0/)) {
  socket.emit('ipaddr');
}

/**
* Send message to signaling server
*/
function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

/**
* Updates URL on the page so that users can copy&paste it to their peers.
*/
// function updateRoomURL(ipaddr) {
//   var url;
//   if (!ipaddr) {
//     url = location.href;
//   } else {
//     url = location.protocol + '//' + ipaddr + ':2013/#' + room;
//   }
//   roomURL.innerHTML = url;
// }


/****************************************************************************
* WebRTC peer connection and data channel
****************************************************************************/

var peerConn;
var dataChannel;

function signalingMessageCallback(message) {
  if (message.type === 'offer') {
    console.log('Got offer. Sending answer to peer.');
    peerConn.setRemoteDescription(new RTCSessionDescription(message), function() {},
                                  logError);
    peerConn.createAnswer(onLocalSessionCreated, logError);

  } else if (message.type === 'answer') {
    console.log('Got answer.');
    peerConn.setRemoteDescription(new RTCSessionDescription(message), function() {},
                                  logError);

  } else if (message.type === 'candidate') {
    peerConn.addIceCandidate(new RTCIceCandidate({
      candidate: message.candidate
    }));

  } else if (message === 'bye') {
// TODO: cleanup RTC connection?
}
}

function createPeerConnection(isHost, config) {
  console.log('Creating Peer connection as initiator?', isHost, 'config:',
              config);
  peerConn = new RTCPeerConnection(config);

  // send any ice candidates to the other peer
  peerConn.onicecandidate = function(event) {
    console.log('icecandidate event:', event);
    if (event.candidate) {
      sendMessage({
	type: 'candidate',
	label: event.candidate.sdpMLineIndex,
	id: event.candidate.sdpMid,
	candidate: event.candidate.candidate
      });
    } else {
      console.log('End of candidates.');
    }
  };

  if (isHost) {
    console.log('Creating Data Channel');
    dataChannel = peerConn.createDataChannel('photos');
    onDataChannelCreated(dataChannel);

    console.log('Creating an offer');
    peerConn.createOffer(onLocalSessionCreated, logError);
  } else {
    peerConn.ondatachannel = function(event) {
      console.log('ondatachannel:', event.channel);
      dataChannel = event.channel;
      onDataChannelCreated(dataChannel);
    };
  }
}

function onLocalSessionCreated(desc) {
  console.log('local session created:', desc);
  peerConn.setLocalDescription(desc, function() {
    console.log('sending local desc:', peerConn.localDescription);
    sendMessage(peerConn.localDescription);
  }, logError);
}

function onDataChannelCreated(channel) {
  console.log('onDataChannelCreated:', channel);

  channel.onopen = function() {
    console.log('CHANNEL opened!!!');
    if (AUTO_PING) {
      var cancel = window.setInterval(() => {
	try {
	dataChannel.send(JSON.stringify({
	  action: 'echo',
	  time: performance.now(),
	}));
	} catch (e) {
	  console.error(e);
	  window.clearInterval(cancel);
	}
      }, 1000);
    }
  };

  channel.onmessage = (event) => {
    // console.log(event);
    var x = JSON.parse(event.data);
    if (x.action === 'echo') {
      x.action = 'lag';
      dataChannel.send(JSON.stringify(x));
    } else if (x.action == 'text') {
      output.value = x.data;
    } else if (x.action == 'lag') {
      var str = 'round trip latency ' + (performance.now() - x.time).toFixed(2) + ' ms';
      // console.log(str);
      document.getElementById('latency').innerText = str;
    } else {
      console.log('unknown action');
    }
  };
}


/****************************************************************************
* Aux functions, mostly UI-related
****************************************************************************/


function randomToken() {
  return Math.floor((1 + Math.random()) * 1e16).toString(16).substring(1);
}

function logError(err) {
  console.log(err.toString(), err);
}
