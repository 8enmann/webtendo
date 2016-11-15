# webtendo
Nintendo is great because everyone sits in a room and plays games together, but why buy a console? Why limit to 4 players? Everyone has a phone that can turn into a controller, and at least a laptop for the main screen. Let's bring in-person multiplayer to the web!

[Heroku demo](http://webtendo.herokuapp.com) (iOS is broken since it doesn't support browser WebRTC)

# Run
```bash
npm install
node index.js
```

Visit [http://localhost:8080](http://localhost:8080) in two tabs

# Features
- [x] Signaling server + WebRTC
- [x] Send data directly between local network devices
- [x] Performance analysis
- [x] Master/slave mode
- [x] Multiple clients
- [x] Automatic connection integrity (refresh robust)
- [x] Standard "controller" w/ forwarded touch events
- [x] Example game
- [x] Heroku deployment
- [ ] Native client (in progress at 8enmann/WebtendoClient)
- [ ] Game hosting and selection
- [ ] Automatic/manual room determination based on external IP
- [ ] Game save API


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