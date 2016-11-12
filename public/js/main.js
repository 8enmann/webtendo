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
const AUTO_PING = true;

// Attach event handlers
function broadcast(message) {
  console.log('sending ', message);
  for (var dataChannel in dataChannels) {
    dataChannels[dataChannel].send(JSON.stringify({
      data: message,
      action: 'text',
    }));
  }
};

// Create a random room if not already present in the URL.
var isHost = window.location.pathname.includes('host');
// TODO: get room from server based on external IP, then store in window.location.hash
var room = 'foo';
// Use session storage to maintain connections across refresh but allow
// multiple tabs in the same browser for testing purposes.
// Not to be confused with socket ID.
var clientId = sessionStorage.getItem('clientId');
if (!clientId) {
  clientId = Math.random().toString(36).substr(2, 10);
  sessionStorage.setItem('clientId', clientId);
}
console.log('Session clientId ' + clientId);

/****************************************************************************
* Signaling server
****************************************************************************/

// Connect to the signaling server
var socket = io.connect();

socket.on('ipaddr', function(ipaddr) {
  console.log('Server IP address is: ' + ipaddr);
  // TODO: actually should display host IP not server
  if (isHost) {
    document.getElementById('ip').innerText = ipaddr;
  }
  // updateRoomURL(ipaddr);
});

socket.on('created', function(room, hostClientId) {
  console.log('Created room', room, '- my client ID is', clientId);
  if (!isHost) {
    // Get dangling clients to reconnect if a host stutters.
    peerConns = {};
    dataChannels = {};
    socket.emit('create or join', room, clientId, isHost);
  }
});

socket.on('full', function(room) {
  //alert('Room ' + room + ' is full. We will create a new room for you.');
  //window.location.hash = '';
  //window.location.reload();
  console.log('server thinks room is full');
  // TODO: remove this
});

socket.on('joined', function(room, clientId) {
  console.log(clientId, 'joined');
  createPeerConnection(isHost, configuration, clientId);
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

socket.on('message', signalingMessageCallback);

socket.on('nohost', () => console.error('No host'));

// Join a room
socket.emit('create or join', room, clientId, isHost);

if (location.hostname.match(/localhost|127\.0\.0/)) {
  socket.emit('ipaddr');
}

/**
* Send message to signaling server
*/
function sendMessage(message, recipient) {
  var payload = {
    recipient: recipient,
    sender: clientId,
    rtcSessionDescription: message,
  };
  console.log('Client sending message: ', payload);
  socket.emit('message', room, payload);
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

// Map from clientId to RTCPeerConnection. 
// For clients this will have only the host.
var peerConns = {};
// dataChannel.label is the clientId of the recipient. useful in onmessage.
var dataChannels = {};

function signalingMessageCallback(message) {
  console.log('Client received message:', message);
  var peerConn = peerConns[isHost ? message.sender : clientId];
  // TODO: if got an offer and isHost, ignore?
  if (message.rtcSessionDescription.type === 'offer') {
    console.log('Got offer. Sending answer to peer.');
    peerConn.setRemoteDescription(new RTCSessionDescription(message.rtcSessionDescription), function() {},
                                  logError);
    peerConn.createAnswer(onLocalSessionCreated(message.sender), logError);

  } else if (message.rtcSessionDescription.type === 'answer') {
    console.log('Got answer.');
    peerConn.setRemoteDescription(new RTCSessionDescription(message.rtcSessionDescription), function() {},
                                  logError);

  } else if (message.rtcSessionDescription.type === 'candidate') {
    
    peerConn.addIceCandidate(new RTCIceCandidate({
      candidate: message.rtcSessionDescription.candidate
    }));

  } else if (message === 'bye') {
    // TODO: cleanup RTC connection?
  }
}

// clientId: who to connect to?
// isHost: Am I the initiator?
// config: for RTCPeerConnection, contains STUN/TURN servers.
function createPeerConnection(isHost, config, recipientClientId) {
  console.log('Creating Peer connection. isHost?', isHost, 'recipient', recipientClientId, 'config:',
              config);
  peerConns[recipientClientId] = new RTCPeerConnection(config);

  // send any ice candidates to the other peer
  peerConns[recipientClientId].onicecandidate = function(event) {
    console.log('icecandidate event:', event);
    if (event.candidate) {
      sendMessage({
	type: 'candidate',
	label: event.candidate.sdpMLineIndex,
	id: event.candidate.sdpMid,
	candidate: event.candidate.candidate
      }, recipientClientId);
    } else {
      console.log('End of candidates.');
    }
  };

  if (isHost) {
    console.log('Creating Data Channel');
    dataChannels[recipientClientId] = peerConns[recipientClientId].createDataChannel(recipientClientId);
    onDataChannelCreated(dataChannels[recipientClientId]);

    console.log('Creating an offer');
    peerConns[recipientClientId].createOffer(onLocalSessionCreated(recipientClientId), logError);
  } else {
    peerConns[recipientClientId].ondatachannel = (event) => {
      console.log('ondatachannel:', event.channel);
      dataChannels[recipientClientId] = event.channel;
      onDataChannelCreated(dataChannels[recipientClientId]);
    };
  }
}

function onLocalSessionCreated(recipientClientId) {
  return (desc) => {
    var peerConn = peerConns[isHost ? recipientClientId : clientId];
    console.log('local session created:', desc);
    peerConn.setLocalDescription(desc, () => {
      console.log('sending local desc:', peerConn.localDescription);
      sendMessage(peerConn.localDescription, recipientClientId);
    }, logError);
  };
}

function onDataChannelCreated(channel) {
  console.log('onDataChannelCreated:', channel);

  channel.onopen = () => {
    console.log('Data channel opened to ' + channel.label);
    if (AUTO_PING) {
      // As long as the channel is open, send a message 1/sec to
      // measure latency and verify everything works
      var cancel = window.setInterval(() => {
	try {
	  channel.send(JSON.stringify({
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
      channel.send(JSON.stringify(x));
    } else if (x.action == 'text') {
      console.log(x.data);
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
* Aux functions
****************************************************************************/


function randomToken() {
  return Math.floor((1 + Math.random()) * 1e16).toString(16).substring(1);
}

function logError(err) {
  console.log(err.toString(), err);
}
