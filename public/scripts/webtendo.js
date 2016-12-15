'use strict';

import io from 'socket.io-client';
import 'webrtc-adapter';

/****************************************************************************
 * Public interface
 ****************************************************************************/

// TODO: make onConnected/Disconnected take an obj
export var callbacks = {
  // Called when a message is received. Host can check message.clientId for sender.
  onMessageReceived: undefined, 
  // Called when a data channel opens, passing clientId as argument.
  onConnected: undefined,
  // Called when a data channel closes, passing clientId as argument.
  onDisconnected: undefined,
};

// Am I the host?
export var isHost;
// My ID.
export var clientId;
// Send a message to a particular client.
export function sendToClient(recipientId, obj) {
  try {
    return dataChannels[recipientId].send(JSON.stringify(obj));
  } catch (e) {
    console.log('couldnt send', e, e.stack);
  }
}
// Send a message to all clients.
export function broadcast(obj) {
  return getClients().map(client => sendToClient(client, obj));
}
// Get a list of all the clients connected.
export function getClients() {
  return Object.keys(dataChannels);
}

// Running dev server.
export const IS_LOCAL = window.location.hostname.match(/localhost|127\.0\.0/);

// Measure latency at 1Hz.
const AUTO_PING = false;
const VERBOSE = false;

/****************************************************************************
 * Initial setup
 ****************************************************************************/

let useBridge = false;
var configuration = {
  'iceServers': [
    {
      "urls":[
        "turn:74.125.28.127:19305?transport=udp",
        "turn:[2607:F8B0:400E:C00::7F]:19305?transport=udp",
        "turn:74.125.28.127:443?transport=tcp",
        "turn:[2607:F8B0:400E:C00::7F]:443?transport=tcp"
      ],
      "username":"CKnUk8IFEgbDVfpkrmUYzc/s6OMT",
      "credential":"Ww6o1xX5o4igYQgmiPWvXMFLQIQ="},
    {"urls":["stun:stun.l.google.com:19302"]},
  ]
};


// Create a random room if not already present in the URL.
isHost = window.location.pathname.includes('host');
var room = window.location.hash.replace('#', '');
// Use session storage to maintain connections across refresh but allow
// multiple tabs in the same browser for testing purposes.
// Not to be confused with socket ID.
// TODO: use localStorage instead for ReactNative?
let storage = IS_LOCAL ? sessionStorage : localStorage;
clientId = storage.getItem('clientId');
if (!clientId) {
  clientId = Math.random().toString(36).substr(2, 10);
  storage.setItem('clientId', clientId);
}
maybeLog()('Session clientId ' + clientId);

/****************************************************************************
 * Signaling server
 ****************************************************************************/

// Connect to the signaling server if we have webrtc access.
let socket;
try {
  new RTCSessionDescription();
  socket = io.connect();
  attachListeners(socket);
} catch (e) {
  console.log('No WebRTC detected, checking for ReactNative.');
  setTimeout(() => {
    try {
      WebViewBridge.onMessage = function (stringifiedMessage) {
        // Awful hack since Safari doesn't like parsing "sdp" field.
        let sdp = /"sdp"\:"(:?[\s\S]*)",/g.exec(stringifiedMessage);
        if (sdp) {
          stringifiedMessage = stringifiedMessage.replace(sdp[0], "");
        }
        let x = JSON.parse(stringifiedMessage);
        if (sdp) {
          x.rtcSessionDescription.sdp = sdp[1];
        }
        
        if (callbacks[x.webrtcAction] !== undefined) {
          let action = x.webrtcAction;
          delete x.webrtcAction;
          callbacks[action](x);
          if (action === 'onMessageReceived' && x.hello) {
            document.getElementById('latency').innerText = 'Connected';
          }
        } else if (x.webrtcAction == 'signal') {
          sendMessage(x.rtcSessionDescription, x.recipient);
        } else {
          console.warn('unexpected message', x);
        }
      };
      sendToClient = function(recipientId, message) {
        message.recipientId = recipientId;
        message.webrtcAction = 'send';
        WebViewBridge.send(JSON.stringify(message));
      };
      console.log('Found ReactNative.');
      
      socket = io.connect();
      useBridge = true;
      attachListeners(socket);
    } catch (e) {
      console.warn('This doesn\'t look like ReactNative');
      // TODO: redirect to app store?
      alert('This browser is not supported. Please use Android Chrome or iOS native app.');
    }
  }, 500);
}

// If useBridge is true, use WebViewBridge for WebRTC.
function attachListeners(socket) {
  socket.on('ipaddr', function(ipaddr) {
    maybeLog()('Server IP address is: ' + ipaddr);
    if (isHost) {
      document.getElementById('ip').innerText = 'Clients connect to ' + ipaddr;
    }
  });

  socket.on('created', function(room, hostClientId) {
    maybeLog()('Created room', room, '- my client ID is', clientId);
    if (!isHost) {
      // Get dangling clients to reconnect if a host stutters.
      if (useBridge) {
        WebViewBridge.send(JSON.stringify({webrtcAction: 'created', isHost: isHost, clientId: clientId}))
      } else {
        peerConns = {};
        dataChannels = {};
      }
      socket.emit('create or join', room, clientId, isHost);
    }
  });

  socket.on('full', function(room) {
    maybeLog()('server thinks room is full');
    alert(`Room ${room} looks full`);
  });

  socket.on('joined', function(room, clientId) {
    maybeLog()(clientId, 'joined', room);
    if (useBridge) {
      WebViewBridge.send(JSON.stringify({webrtcAction: 'joined', configuration: configuration, clientId: clientId, isHost: isHost}))
    } else {
      createPeerConnection(isHost, configuration, clientId);
    }
  });

  socket.on('log', function(array) {
    console.log.apply(console, array);
  });

  socket.on('disconnected', clientId => {
    if (callbacks.onDisconnected) {
      callbacks.onDisconnected({clientId: clientId});
    }
  });

  socket.on('message', signalingMessageCallback);

  socket.on('nohost', room => {
    console.error('No host for', room);
    alert(`No host for room ${room}. Please open a host on your laptop.`);
  });

  // Join a room
  socket.emit('create or join', room, clientId, isHost);

  if (IS_LOCAL) {
    socket.emit('ipaddr');
  }
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
  maybeLog()('Client sending message: ', payload);
  socket.emit('message', payload);
}

/****************************************************************************
 * WebRTC peer connection and data channel
 ****************************************************************************/

// Map from clientId to RTCPeerConnection. 
// For clients this will have only the host.
var peerConns = {};
// dataChannel.label is the clientId of the recipient. useful in onmessage.
var dataChannels = {};

function signalingMessageCallback(message) {
  maybeLog()('Client received message:', message);
  if (useBridge) {
    message.webrtcAction = 'message';
    WebViewBridge.send(JSON.stringify(message));
    return;
  }

  var peerConn = peerConns[isHost ? message.sender : clientId];
  // TODO: if got an offer and isHost, ignore?
  if (message.rtcSessionDescription.type === 'offer') {
    maybeLog()('Got offer. Sending answer to peer.');
    peerConn.setRemoteDescription(new RTCSessionDescription(message.rtcSessionDescription), function() {},
                                  logError());
    peerConn.createAnswer(onLocalSessionCreated(message.sender), logError());

  } else if (message.rtcSessionDescription.type === 'answer') {
    maybeLog()('Got answer.');
    peerConn.setRemoteDescription(new RTCSessionDescription(message.rtcSessionDescription), function() {},
                                  logError());

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
  maybeLog()('Creating Peer connection. isHost?', isHost, 'recipient', recipientClientId, 'config:',
             config);
  peerConns[recipientClientId] = new RTCPeerConnection(config);

  // send any ice candidates to the other peer
  peerConns[recipientClientId].onicecandidate = function(event) {
    maybeLog()('icecandidate event:', event);
    if (event.candidate) {
      sendMessage({
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      }, recipientClientId);
    } else {
      maybeLog()('End of candidates.');
    }
  };

  if (isHost) {
    maybeLog()('Creating Data Channel');
    dataChannels[recipientClientId] = peerConns[recipientClientId].createDataChannel(recipientClientId);
    onDataChannelCreated(dataChannels[recipientClientId]);

    maybeLog()('Creating an offer');
    peerConns[recipientClientId].createOffer(onLocalSessionCreated(recipientClientId), logError());
  } else {
    peerConns[recipientClientId].ondatachannel = (event) => {
      maybeLog()('ondatachannel:', event.channel);
      dataChannels[recipientClientId] = event.channel;
      onDataChannelCreated(dataChannels[recipientClientId]);
    };
  }
}

function onLocalSessionCreated(recipientClientId) {
  return (desc) => {
    var peerConn = peerConns[isHost ? recipientClientId : clientId];
    maybeLog()('local session created:', desc);
    peerConn.setLocalDescription(desc, () => {
      maybeLog()('sending local desc:', peerConn.localDescription);
      sendMessage(peerConn.localDescription, recipientClientId);
    }, logError());
  };
}

function onDataChannelCreated(channel) {
  maybeLog()('onDataChannelCreated:', channel);

  channel.onclose = () => {
    if (callbacks.onDisconnected) {
      callbacks.onDisconnected({clientId: channel.label});
    }
  };
  channel.onopen = () => {
    if (callbacks.onConnected) {
      callbacks.onConnected({clientId: channel.label});
    }
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
    } else {
      document.getElementById('latency').innerText = 'Connected';
    }
  };

  channel.onmessage = (event) => {
    // maybeLog()(event);
    var x = JSON.parse(event.data);
    if (x.action === 'echo') {
      x.action = 'lag';
      channel.send(JSON.stringify(x));
    } else if (x.action == 'text') {
      maybeLog()(x.data);
    } else if (x.action == 'lag') {
      var str = 'round trip latency ' + (performance.now() - x.time).toFixed(2) + ' ms';
      // maybeLog()(str);
      document.getElementById('latency').innerText = str;
    } else if (callbacks.onMessageReceived) {
      if (x.hello) {
        document.getElementById('latency').innerText = 'Connected';
      }
      x.clientId = channel.label;
      callbacks.onMessageReceived(x);
    } else {
      maybeLog()('unknown action');
    }
  };
}


/****************************************************************************
 * Aux functions
 ****************************************************************************/


function randomToken() {
  return Math.floor((1 + Math.random()) * 1e16).toString(16).substring(1);
}

function logError() {
  return console.error
}

function maybeLog() {
  if (VERBOSE) {
    if (useBridge) {
      return function(...args) {
        console.log(args);
        WebViewBridge.send(JSON.stringify({
          webrtcAction: 'log', flat: JSON.stringify(args), log: args}));
      }
    }
    return console.log;
  }
  return function(){};
}
