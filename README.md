# webtendo
Multiplayer JS game platform

# Run
```bash
npm install
node index.js
```

Visit http://localhost:8080 in two tabs

# Features
- [x] Signaling server + WebRTC
- [x] Send data directly between local network devices
- [x] Performance analysis
- [x] Master/slave mode
- [x] Multiple clients
- [x] Automatic connection integrity (refresh robust)
- [x] Standard "controller" w/ forwarded touch events
- [ ] Automatic/manual room determination based on external IP
- [ ] Example game
- [ ] Game save API
- [ ] Heroku deployment

# Comms flow

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