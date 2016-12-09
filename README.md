# webtendo
Nintendo is great because everyone sits in a room and plays games together, but why buy a console? Why limit to 4 players? Everyone has a phone that can turn into a controller, and at least a laptop for the main screen. Let's bring in-person multiplayer to the web!

[Heroku demo](http://webtendo.herokuapp.com) (iOS browser is broken since it doesn't support browser WebRTC, [native app on iTunes]()([src](https://github.com/8enmann/WebtendoClient))

## Run
```bash
npm install
npm start
```

Visit [http://localhost:8080](http://localhost:8080) in two tabs.

If you're making changes to hosts/controllers, use
```bash
npm run webpack
```

If you're making changes to `server.js` consider
```bash
devtool server.js -w
```

## Add a new game
* First fork the repo
* Copy an existing game
```bash
cp -r public/spacewar public/mynewgame
```
* You'll need a host and a client. Pay particular attention to the transport hooks. See `public/scripts/webtendo.js` for documentation.
```javascript
import * as webtendo from '../scripts/webtendo';
webtendo.callbacks.onMessageReceived = x => { ... };
webtendo.callbacks.onConnected = id => { ... };
webtendo.sendToClient(recipientId, obj);

// Client library
import * as client from '../scripts/client';
client.callbacks.onTouch = function(e, touch, region) { ... };
client.sendToHost(obj);
```
* Add an entry for your host and client to `webpack.config.js`
* Restart the webpack watcher if it's already running, or start it with `npm run webpack`
* Add your new host and client entries to `public/index.html`
* Send a pull request!

## Features
- [x] Signaling server + WebRTC
- [x] Send data directly between local network devices
- [x] Performance analysis
- [x] Master/slave mode
- [x] Multiple clients
- [x] Automatic connection integrity (refresh robust)
- [x] Standard "controller" w/ forwarded touch events
- [x] Example game
- [x] Heroku deployment
- [x] Game selection
- [x] Automatic/manual room determination based on external IP
- [x] Native client (at 8enmann/WebtendoClient)
- [ ] autotrack.js integration
- [ ] Game rating


## Comms flow
In `public/scripts/webtendo.js`
1. Socket connection to server
1. Host asks server to join a room (emit 'create or join')
1. Get back 'created'
1. Client asks to join
1. Host & client get 'joined' event
1. Everyone creates a peer connection and sends ICE candidates to other listeners through server.
1. Host creates a data channel.
1. Host creates an offer and sends it through the server to clients.
1. Clients receive offer and send an answer through the server.
1. Host receives answer and data channel opens.
