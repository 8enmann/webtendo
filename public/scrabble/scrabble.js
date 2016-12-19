'use strict';

import * as webtendo from '../scripts/webtendo';
import _ from 'underscore';
import $ from 'jquery';
import Vue from 'vue';

var WORDNIK_API_KEY = "851c7a21454c7fcd0710201ae7106576b60aec3f2b3b628d9";
var WORDNIK_BASE_URL = _.template("http://api.wordnik.com:80/v4/word.json/<%= word %>/definitions?limit=2&includeRelated=false&sourceDictionaries=all&useCanonical=false&includeTags=false&api_key=<%= api_key %>");
var ctx;
var gameStarted = false;
var playersArray = []; // play order.
var scrabbleBag = [];
var currentPlayer = 0;
var currentlyPlayedPositions = [];
var board = [];
var isFirstTurn = true;
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

let app = new Vue({
  el: '#app',
  data: {
    players: {},
    currentPlayerId: undefined,
  },
});


const letterToPointsMap = {
    'E': 1,
    'A': 1,
    'I': 1,
    'O': 1,
    'N': 1,
    'R': 1,
    'T': 1,
    'L': 1,
    'S': 1,
    'U': 1,
    'D': 2,
    'G': 2,
    'B': 3,
    'C': 3,
    'M': 3,
    'P': 3,
    'F': 4,
    'H': 4,
    'V': 4,
    'W': 4,
    'Y': 4,
    'K': 5,
    'J': 8,
    'X': 8,
    'Q': 10,
    'Z': 10,
};

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
  if (gameStarted || Object.keys(app.players).length < 2) {
    return;
  }

  // check that every player is ready
  if (!_.every(_.pluck(Object.values(app.players), 'ready'))) {
    return;
  }

  isFirstTurn = true;
  gameStarted = true;
  initScrabbleBag();
  shuffle(scrabbleBag);
  for (var id in app.players) {
    app.players[id].hand = drawCharacters(7);
    app.players[id].score = 0;
    webtendo.sendToClient(id, app.players[id]);
  }
  setCurrentPlayer(0);
}

function setCurrentPlayer(playerIndex) {
  currentPlayer = playerIndex;
  app.currentPlayerId = playersArray[playerIndex];
  webtendo.sendToClient(playersArray[playerIndex], {message: "Your turn!"});
}

var touchStartTime = 0;
var lastActionTime = 0;
function handleMoveCursor(direction) {
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
  var hand = app.players[currPlayerID].hand;
  if (!_.contains(hand, letter)) {
    webtendo.sendToClient(currPlayerID, {error: "Player played a letter not in hand. How did this happen?"});
    return;
  }
  hand.splice(_.indexOf(hand, letter), 1);
  app.players[currPlayerID].hand = hand;
  if (_.isUndefined(board[currentPosition.x])) {
    board[currentPosition.x] = [];
  }
  board[currentPosition.x][currentPosition.y] = letter;
  currentlyPlayedPositions.push(currentPosition);
  moveCursor({x: currentPosition.x + 1, y: currentPosition.y});
  renderBoard();
  webtendo.sendToClient(currPlayerID, app.players[currPlayerID]);
}

function currentTurn(position) {
  return _.some(currentlyPlayedPositions, function(p) {
    return position.x == p.x && position.y == p.y;
  });
}

function calculatePointsVertical(position) {
  var min = position.y;
  var max = position.y;

  while (min > 0 && !isAvailable({x: position.x, y: min - 1})) {
    min -= 1;
  }
  while (max < 14 && !isAvailable({x: position.x, y: max + 1})) {
    max += 1;
  }
  var word = "";
  var points = 0;
  var wordMultiplier = 1;
  if (max - min < 1) {
    // word needs to be longer than 1 letter
    return {word: null, points: 0};
  }
  for (var i = min; i <= max; i++) {
    var p = {x: position.x, y: i};
    word += board[position.x][i];
    var curr = letterToPointsMap[board[position.x][i]];
    if (currentTurn(p)) {
      // include all the multipliers
      var t = getTileTypeForPoints(p);
      curr *= t.letter_mulltiplier;
      wordMultiplier *= t.word_multiplier;
    }
    points += curr;
  }
  points *= wordMultiplier;
  return {word: word, points: points};
}

function isValidWord(word) {
  var url = WORDNIK_BASE_URL({word: word.toLowerCase(), api_key: WORDNIK_API_KEY});
  return $.getJSON(url).then(function(data) {
    if (data.length > 0) {
      console.log(word + " is valid");
      return true;
    }
    return false;
  });
}

function calculatePointsHorizontal(position) {
  var min = position.x;
  var max = position.x;

  while (min > 0 && !isAvailable({x: min - 1, y: position.y})) {
    min -= 1;
  }
  while (max < 14 && !isAvailable({x: max + 1, y: position.y})) {
    max += 1;
  }
  var word = "";
  var points = 0;
  var wordMultiplier = 1;
  if (max - min < 1) {
    return {word: null, points: 0};
  }
  for (var i = min; i <= max; i++) {
    var p = {x: i, y: position.y};
    word += board[i][position.y];
    var curr = letterToPointsMap[board[i][position.y]];
    if (currentTurn(p)) {
      var t = getTileTypeForPoints(p);
      curr *= t.letter_mulltiplier;
      wordMultiplier *= t.word_multiplier
    }
    points += curr
  }
  points *= wordMultiplier;
  return {word: word, points: points};
}

function calculatePoints() {
  var baseErrorMessage = "Your turn was not valid";
  if (isFirstTurn && currentlyPlayedPositions.length < 2) {
    return {error: baseErrorMessage, points: -1};
  }
  if (currentlyPlayedPositions.length < 1) {
    return {error: baseErrorMessage, points: -1};
  }

  var xs = _.pluck(currentlyPlayedPositions, 'x');
  var ys = _.pluck(currentlyPlayedPositions, 'y');

  if (_.uniq(xs).length != 1 &&
      _.uniq(ys).length != 1) {
    return {error: baseErrorMessage, points: -1};
  }

  // TODO: Make sure there're no gaps between the played characters
  if (_.uniq(xs).length == 1) {
    if (_.some(_.range(_.min(ys), _.max(ys) + 1), function(y) {
      return isAvailable({x: xs[0], y: y});
    })) {
      return {error: baseErrorMessage, points: -1};
    }
  } else {
    if (_.some(_.range(_.min(xs), _.max(xs) + 1), function(x) {
      return isAvailable({x: x, y: ys[0]});
    })) {
      return {error: baseErrorMessage, points: -1};
    }
  }

  var points = 0;
  var words = [];

  var mainWord = {};
  if (_.uniq(xs).length == 1) {
    mainWord = calculatePointsVertical(currentlyPlayedPositions[0]);
  } else {
    mainWord = calculatePointsHorizontal(currentlyPlayedPositions[0]);
  }
  points += mainWord.points;
  words.push(mainWord.word);
  _.each(currentlyPlayedPositions, function(p) {
    var h;
    if (_.uniq(xs).length == 1) {
      h = calculatePointsHorizontal(p);
    } else {
      h = calculatePointsVertical(p);
    }
    points += h.points;
    words.push(h.word);
  });
  words = _.filter(words, function(w) {
    return !_.isNull(w);
  });

  for (var i = 0; i < words.length; i++) {
    if (!isValidWord(words[i])) {
      return {error: `{words[i]} is not a valid word!`, points: -1};
    }
  }
  return {points: points};
}

webtendo.callbacks.onMessageReceived = function(x) {
  console.log(x);
  if (x.hello === "host") {
    // hello!
    return;
  }
  if (!gameStarted) {
    if (x.action === "ready") {
      app.players[x.clientId].ready = x.value;
    } else if (x.action === "start") {
      maybeStartGame();
      return;
    }
    if (_.every(_.values(app.players), function(p) {
      return p.ready;
    })) {
      _.each(_.keys(app.players), function(id) {
        webtendo.sendToClient(id, {ready: true});
      });
    }
    return;
  }
  if (x.name) {
    app.players[x.clientId].name = x.name;
    return;
  }

  if (x.clientId != playersArray[currentPlayer]) {
    webtendo.sendToClient(x.clientId, {error: "It's not your turn!"});
    return;
  }
  if (x.action === "moveCursor") {
    handleMoveCursor(x.value);
  } else if (x.action === "play_letter") {
    playLetter(x.value);
  } else if (x.action === "finish_turn") {
    // TODO: Check turn was valid here. either reject all characters or allow and finish turn
    var result = calculatePoints();
    if (result.points < 0) {
      // reject all tiles that were played
      var hand = app.players[x.clientId].hand;
      _.each(currentlyPlayedPositions, function(p) {
        hand.push(board[p.x][p.y]);
        board[p.x][p.y] = null;
      });
      currentlyPlayedPositions = [];
      webtendo.sendToClient(x.clientId, {error: result.error});
      webtendo.sendToClient(x.clientId, {hand: hand});
      renderBoard();
      return;
    }
    isFirstTurn = false;
    app.players[x.clientId].score = app.players[x.clientId].score + result.points;
    webtendo.sendToClient(x.clientId, {points: result.points, score: app.players[x.clientId].score, message: "You got " + result.points + " points!"});

    // draw new tiles
    var hand = app.players[x.clientId].hand;
    for (var i = 0; scrabbleBag.length > 0 && i < currentlyPlayedPositions.length; i++) {
      hand.push(scrabbleBag.pop());
    }
    app.players[x.clientId].hand = hand;
    webtendo.sendToClient(x.clientId, app.players[x.clientId]);
    currentlyPlayedPositions = [];
    currentPosition = {x: 7, y: 7};
    renderBoard();
    setCurrentPlayer((currentPlayer + 1) % playersArray.length);
  }
}

webtendo.callbacks.onConnected = function(x) {
  let id = x.clientId;
  console.log(id + " connected");
  if (app.players[id]) {
    // player reconnected. give the player their hand
    webtendo.sendToClient(id, app.players[id]);
    return;
  }
  if (gameStarted) {
    webtendo.sendToClient(id, {error: 'Sorry, a game is already in session.'});
    return;
  }
  if (app.players.length >= 6) {
    webtendo.sendToClient(id, {error: 'Sorry, this game is at capacity.'});
    return;
  }
  // else, add the new player!
  var currNumPlayers = Object.keys(app.players).length;
  app.$set(app.players, id, {
    color: colors[currNumPlayers],
    name: names[currNumPlayers],
    id: id,
  });
  webtendo.sendToClient(id, app.players[id]);
  playersArray.push(id);
}

const offsetX = 0;
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
  _.each(currentlyPlayedPositions, function(position) {
    renderSquare(position, "#d89c22", board[position.x][position.y]);
  });

  // stroke current position
  renderSquare(currentPosition, "red", isAvailable(currentPosition) ? null : board[currentPosition.x][currentPosition.y]);
}

var TILE_TYPES = {
  REGULAR: {name: null,
            letter_mulltiplier: 1,
            word_multiplier: 1},
  DOUBLE_LETTER: {positions: [{x: 3, y: 0},
                              {x: 0, y: 3},
                              {x: 11, y: 0},
                              {x: 14, y: 3},
                              {x: 0, y: 11},
                              {x: 14, y: 11},
                              {x: 3, y: 14},
                              {x: 11, y: 14},
                              {x: 6, y: 2},
                              {x: 8, y: 2},
                              {x: 7, y: 3},
                              {x: 2, y: 6},
                              {x: 2, y: 8},
                              {x: 3, y: 7},
                              {x: 6, y: 12},
                              {x: 8, y: 12},
                              {x: 7, y: 11},
                              {x: 12, y: 6},
                              {x: 12, y: 8},
                              {x: 13, y: 7},
                              {x: 6, y: 6},
                              {x: 6, y: 8},
                              {x: 8, y: 6},
                              {x: 8, y: 8},
                              ],
                  bg_color: "#a0aec8",
                  letter_mulltiplier: 2,
                  word_multiplier: 1,
                  name: "DOUBLE LETTER SCORE"},
  DOUBLE_WORD: {positions: [{x: 1, y: 1},
                            {x: 2, y: 2},
                            {x: 3, y: 3},
                            {x: 4, y: 4},
                            {x: 13, y: 1},
                            {x: 12, y: 2},
                            {x: 11, y: 3},
                            {x: 10, y: 4},
                            {x: 13, y: 13},
                            {x: 12, y: 12},
                            {x: 11, y: 11},
                            {x: 10, y: 10},
                            {x: 1, y: 13},
                            {x: 2, y: 12},
                            {x: 3, y: 11},
                            {x: 4, y: 10}],
                bg_color: "#e2f5ff",
                letter_mulltiplier: 1,
                word_multiplier: 2,
                name: "DOUBLE WORD SCORE"},
  TRIPLE_LETTER: {positions: [{x: 1, y: 5},
                              {x: 1, y: 9},
                              {x: 13, y: 5},
                              {x: 13, y: 9},
                              {x: 5, y: 1},
                              {x: 9, y: 1},
                              {x: 5, y: 13},
                              {x: 9, y: 13},
                              {x: 5, y: 5},
                              {x: 5, y: 9},
                              {x: 9, y: 5},
                              {x: 9, y: 9}],
                  bg_color: "#7199b0",
                  letter_mulltiplier: 3,
                  word_multiplier: 1,
                  name: "TRIPLE LETTER SCORE"},
  TRIPLE_WORD: {positions: [{x: 0, y: 0},
                            {x: 0, y: 7},
                            {x: 0, y: 14},
                            {x: 7, y: 0},
                            {x: 7, y: 14},
                            {x: 14, y: 0},
                            {x: 14, y: 7},
                            {x: 14, y: 14}],
                bg_color: "#d07b7b",
                letter_mulltiplier: 1,
                word_multiplier: 3,
                name: "TRIPLE WORD SCORE"},
  CENTER: {positions: [{x: 7, y: 7}],
           bg_color: "#ff9bf3",
           name: "✩",
           letter_mulltiplier: 1,
           word_multiplier: 2},
}

function getTileTypeForPoints(position) {
  // first check if position is one of the currently played letters
  if (!currentTurn(position)) {
    return TILE_TYPES.REGULAR;
  }
  return getTileType(position);
}

function getTileType(position) {
  var tileTypes = Object.keys(TILE_TYPES);
  for (var i = 0; i < tileTypes.length; i++) {
    var type = TILE_TYPES[tileTypes[i]];
    if (!_.isUndefined(type.positions) && _.some(type.positions, function(p) {
      return position.x == p.x && position.y == p.y;
    })) {
      return type;
    }
  }
  // default..
  return TILE_TYPES.REGULAR;
}

function renderSquare(position, edgeStyle, letter) {
  var tileType = getTileType(position);
  if (!_.isUndefined(letter) && !_.isNull(letter)) {
    // black background
    ctx.fillStyle = "black";
    ctx.fillRect(offsetX + 40 * position.x + 10 + 1, 40 * position.y + 10 + 1, 38, 38);
    // render the character
    ctx.font = "18px Courier New";
    ctx.fillStyle = "white";
    ctx.fillText(letter, offsetX + 40 * position.x + 24 + 1, 40 * position.y + 22 + 1);

    ctx.font = "12px Courier New";
    ctx.fillStyle = "white";
    ctx.fillText(letterToPointsMap[letter], offsetX + 40 * position.x + 24 + 1, 40 * position.y + 33 + 1);
  } else if (tileType == TILE_TYPES.REGULAR) {
    ctx.fillStyle = "#fae8dc";
    ctx.fillRect(offsetX + 40 * position.x + 10 + 1, 40 * position.y + 10 + 1, 38, 38);
  } else {
    ctx.fillStyle = tileType.bg_color;
    ctx.fillRect(offsetX + 40 * position.x + 10 + 1, 40 * position.y + 10 + 1, 38, 38);

    ctx.font = "10px Courier New";
    ctx.fillStyle = "black";
    var words = tileType.name.split(' ');
    if (words.length === 3) {
      for (var i = 0; i < words.length; i++) {
        var w = words[i];
        ctx.fillText(w, offsetX + 40 * position.x + 10 + 1, 40 * position.y + 18 + 10 * i + 1);
      }
    } else if (words.length === 1) {
      ctx.fillText(words[0], offsetX + 40 * position.x + 20 + 1, 40 * position.y + 18 + 20 + 1);
    }
  }
  ctx.beginPath();
  ctx.moveTo(offsetX + 40 * position.x + 10, 40 * position.y + 10);
  ctx.lineTo(offsetX + 40 * position.x + 10 + 40, 40 * position.y + 10);
  ctx.lineTo(offsetX + 40 * position.x + 10 + 40, 40 * position.y + 10 + 40);
  ctx.lineTo(offsetX + 40 * position.x + 10, 40 * position.y + 10 + 40);
  ctx.lineTo(offsetX + 40 * position.x + 10, 40 * position.y + 10);
  ctx.closePath();
  ctx.strokeStyle = edgeStyle;
  ctx.stroke();
}

function main() {
  drawBoard();
}

(function init() {
  var canvas = document.getElementById('canvas');
  if (canvas.getContext) {
    ctx = canvas.getContext('2d');
    // Awful hack from stackoverflow to increase canvas resolution.
    const ratio = window.devicePixelRatio;
    let w = canvas.offsetWidth;
    let h = canvas.offsetHeight;
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
