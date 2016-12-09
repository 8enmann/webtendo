'use strict';

import * as webtendo from '../scripts/webtendo';
import _ from 'underscore';
import $ from 'jquery';

var ctx;
var gameStarted = false;
var players = {};
var playersArray = []; // play order.
var scrabbleBag = [];
var currentPlayer = 0;
var currentlyPlayedPositions = [];
var board = [];
var colors = ["#FF0000", // red
              "#0000FF", // blue
              "#008000", // green
              "#FFFF00", // yellow
              "#FFA500", // orange
              "#800080", // purple
             ];
var names = ["Gabble Scream",
             "Mr Cab Beagles",
             "Brace Gambles",
             "Mrs Abbe Glace",
             "Crab Lamb Gees",
             "Crabs Bagel Me"
            ];
var currentPosition = {x: 7, y: 7};

function initScrabbleBag() {
  var scrabbleFrequencies = {
    'E': 12,
    'A': 9,
    'I': 9,
    'O': 8,
    'N': 6,
    'R': 6,
    'T': 6,
    'L': 4,
    'S': 4,
    'U': 4,
    'D': 4,
    'G': 3,
    'B': 3,
    'C': 3,
    'M': 3,
    'P': 3,
    'F': 2,
    'H': 2,
    'V': 2,
    'W': 2,
    'Y': 2,
    'K': 2,
    'J': 1,
    'X': 1,
    'Q': 1,
    'Z': 1,
  };
  for (var character in scrabbleFrequencies) {
    for (var i = 0; i < scrabbleFrequencies[character]; i++) {
      scrabbleBag.push(character);
    }
  }
}

function shuffle(a) {
  for (let i = a.length; i; i--) {
    let j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]];
  }
}

function drawCharacters(count) {
  var chars = [];
  for (var i = 0; i < count; i++) {
    if (scrabbleBag.length) {
      chars.push(scrabbleBag.pop());
    }
  }
  return chars;
}

function maybeStartGame() {
  if (gameStarted || Object.keys(players).length < 2) {
    return;
  }

  // check that every player is ready
  if (!_.every(_.pluck(Object.values(players), 'ready'))) {
    return;
  }

  gameStarted = true;
  initScrabbleBag();
  shuffle(scrabbleBag);
  for (var id in players) {
    players[id].hand = drawCharacters(7);
    webtendo.sendToClient(id, players[id]);
  }
  setCurrentPlayer(0);
}

function setCurrentPlayer(playerIndex) {
  currentPlayer = playerIndex;
  webtendo.sendToClient(playersArray[playerIndex], {message: "Your turn!"});
  drawInfoPanel();
}

function handleJoystickMoved(x, y) {
  if (x == 0 && y == 0) {
    return;
  }
  var direction;
  if (Math.abs(x) > Math.abs(y)) {
    direction = x < 0 ? 'L' : 'R';
  } else {
    direction = y > 0 ? 'D' : 'U';
  }

  // iterate through board to find next available position in the direction
  if (direction === 'L') {
    for (var i = currentPosition.x - 1; i >= 0; i--) {
      if (maybeMoveCursor({x: i, y: currentPosition.y})) { return; }
    }
  } else if (direction === 'R') {
    for (var i = currentPosition.x + 1; i <= 14; i++) {
      if (maybeMoveCursor({x: i, y: currentPosition.y})) { return; }
    }
  } else if (direction === 'D') {
    for (var i = currentPosition.y + 1; i <= 14; i++) {
      if (maybeMoveCursor({x: currentPosition.x, y: i})) { return; }
    }
  } else if (direction === 'U') {
    for (var i = currentPosition.y - 1; i >= 0; i--) {
      if (maybeMoveCursor({x: currentPosition.x, y: i})) { return; }
    }
  }
}

function maybeMoveCursor(pos) {
  if (isAvailable(pos)) {
    moveCursor(pos);
    return true;
  }
  return false;
}

function isAvailable(position) {
  if (_.isUndefined(board[position.x]) || _.isNull(board[position.x])) {
    return true;
  }
  var b = board[position.x][position.y];
  return _.isUndefined(b) || _.isNull(b);
}

function playLetter(letter) {
  // confirm letter is in current player's hand
  var currPlayerID = playersArray[currentPlayer];
  if (!isAvailable(currentPosition)) {
    webtendo.sendToClient(currPlayerID, {error: "This spot is already taken!"});
    return;
  }
  var hand = players[currPlayerID].hand;
  if (!_.contains(hand, letter)) {
    webtendo.sendToClient(currPlayerID, {error: "Player played a letter not in hand. How did this happen?"});
    return;
  }
  hand.splice(_.indexOf(hand, letter), 1);
  players[currPlayerID].hand = hand;
  if (_.isUndefined(board[currentPosition.x])) {
    board[currentPosition.x] = [];
  }
  board[currentPosition.x][currentPosition.y] = letter;
  currentlyPlayedPositions.push(currentPosition);
  moveCursor({x: currentPosition.x + 1, y: currentPosition.y});  // TODO: Move cursor to closest unfilled position.
  renderBoard();
  webtendo.sendToClient(currPlayerID, players[currPlayerID]);
}

webtendo.callbacks.onMessageReceived = function(x) {
  console.log(x);
  if (x.hello === "host") {
    // hello!
    return;
  }
  if (!gameStarted) {
    if (x.action === "ready") {
      players[x.clientId].ready = x.value;
    }
    maybeStartGame();
    return;
  }

  if (x.clientId != playersArray[currentPlayer]) {
    webtendo.sendToClient(x.clientId, {error: "It's not your turn!"});
    return;
  }
  if (x.value === 'stick') {
    handleJoystickMoved(x.position.x, x.position.y);
  } else if (x.action === "play_letter") {
    playLetter(x.value);
  } else if (x.action === "finish_turn") {
    // TODO: Check turn was valid here. either reject all characters or allow and finish turn

    // draw new tiles
    var hand = players[x.clientId].hand;
    for (var i = 0; scrabbleBag.length > 0 && i < currentlyPlayedPositions.length; i++) {
      hand.push(scrabbleBag.pop());
    }
    players[x.clientId].hand = hand;
    webtendo.sendToClient(x.clientId, players[x.clientId]);
    currentlyPlayedPositions = [];
    currentPosition = {x: 7, y: 7};
    renderBoard();
    setCurrentPlayer((currentPlayer + 1) % playersArray.length);
  }
}

webtendo.callbacks.onConnected = function(id) {
  console.log(id + " connected");
  if (players[id]) {
    // player reconnected. give the player their hand
    webtendo.sendToClient(id, players[id]);
    return;
  }
  if (gameStarted) {
    webtendo.sendToClient(id, {error: 'Sorry, a game is already in session.'});
    return;
  }
  if (players.length >= 6) {
    webtendo.sendToClient(id, {error: 'Sorry, this game is at capacity.'});
    return;
  }
  // else, add the new player!
  var currNumPlayers = Object.keys(players).length;
  players[id] = {
    color: colors[currNumPlayers],
    name: names[currNumPlayers],
  }
  webtendo.sendToClient(id, players[id]);
  playersArray.push(id);
  drawInfoPanel();
}

function drawInfoPanel() {
  ctx.clearRect(0, 0, 299, canvas.offsetHeight);
  ctx.fillStyle = "white";
  ctx.font = "24px Courier New";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  var yOffset = 0;
  ctx.fillText("Scrabble", 0, 0);
  yOffset += 24;

  ctx.fillText("Players List", 0, yOffset);
  _.each(playersArray, function(playerId, index) {
    yOffset += 24;
    var p = players[playerId];
    ctx.fillText((currentPlayer == index ? "> " : "") + p.name, 5, yOffset);
  });
}

var offsetX = 300;
function moveCursor(position) {
  currentPosition = position;
  renderBoard();
}

function drawBoard() {
  moveCursor({x: 7, y: 7});
  renderBoard();
}

function renderBoard() {
  for (var i = 0; i < 15; i++) {
    for (var j = 0; j < 15; j++) {
      var pos = {x: i, y: j};
      var letter = undefined;
      if (!isAvailable(pos)) {
        letter = board[i][j];
      }
      renderSquare(pos, "white", letter);
    }
  }
  // TODO stroke currently played words.
  _.each(currentlyPlayedPositions, function(position) {
    renderSquare(position, "yellow", undefined);
  });

  // stroke current position
  renderSquare(currentPosition, "red", undefined);
}

function renderSquare(position, strokeColor, letter) {
  if (!_.isUndefined(letter) && !_.isNull(letter)) {
    // render the character
    ctx.font = "18px Courier New";
    ctx.fillStyle = "white";
    ctx.fillText(letter, offsetX + 40 * position.x + 24 + 1, 40 * position.y + 13 + 1);
  }
  ctx.beginPath();
  ctx.moveTo(offsetX + 40 * position.x + 10, 40 * position.y + 10);
  ctx.lineTo(offsetX + 40 * position.x + 10 + 40, 40 * position.y + 10);
  ctx.lineTo(offsetX + 40 * position.x + 10 + 40, 40 * position.y + 10 + 40);
  ctx.lineTo(offsetX + 40 * position.x + 10, 40 * position.y + 10 + 40);
  ctx.lineTo(offsetX + 40 * position.x + 10, 40 * position.y + 10);
  ctx.closePath();
  ctx.strokeStyle = strokeColor;
  ctx.stroke();
}

function main() {
  drawInfoPanel();
  drawBoard();
}

(function init() {
  var canvas = document.getElementById('canvas');
  if (canvas.getContext) {
    ctx = canvas.getContext('2d');
    // Awful hack from stackoverflow to increase canvas resolution.
    const ratio = window.devicePixelRatio, w = canvas.offsetWidth, h = canvas.offsetHeight;
    canvas.width = w * ratio;
    canvas.height = h * ratio;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    main();
  }
})();