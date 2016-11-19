import * as webtendo from './webtendo';
import _ from 'underscore';
import $ from 'jquery';

function assert(condition, message) {
  if (!condition) {
    throw message || "Assertion failed";
  }
}

var newHand = function(hand) {
  $("#hand").empty();
  _.each(hand, function(letter, index) {
    $letter = createLetterDiv(letter, index);
    $("#hand").append($letter);
  });
}

var createLetterDiv = function(letter, index) {
  var id = "letter_" + index;
  var $letter = $("<div />", {
    class: 'letter touch-region',
  });
  $letter.text(letter);
  $letter.attr('id', id);
  $letter.attr('data-buttonvalue', "id=" + id + ",letter=" + letter);
  return $letter;
}

var getLetterFromDiv = function($div) {
  var params = $div.attr('data-buttonvalue').split(',');
  return _.filter(params, function(p) {
    return p.split('=')[0] == 'letter';
  })[0].split('=')[1];
}

var selectLetter = function(id) {
  _.each($("#hand").children(), function(letterDiv) {
    if ($(letterDiv).attr('id') == id) {
      $(letterDiv).addClass('selected');
    } else {
      $(letterDiv).removeClass('selected');
    }
  });
}

var playLetter = function() {
  var $selected = $("#hand .selected");
  if ($selected.length == 0) {
    alert("Please select a letter to play!");
    return;
  }
  var selectedLetterIndex = parseInt($selected.attr('id').slice(-1));
  dataChannels[clientId].send(JSON.stringify({
    letter: getLetterFromDiv($selected),
    index: selectedLetterIndex,
  }));
}

var finishTurn = function() {
  dataChannels[clientId].send(JSON.stringify({
    finish_turn: true,
  }));
}

var players = {};
var playerList = []; // need the ordering to know who goes when
var gameStarted = false;
var scrabbleBag = [];
var currentPlayer; // index
var playerColors = ["#FF0000", // red
                    "#0000FF", // blue
                    "#008000", // green
                    "#FFFF00", // yellow
                    "#FFA500", // orange
                    "#800080", // purple
                   ];
var board;

var createScrabbleBoard = function() {
  var rows = 15;
  var columns = 15;
  board = new Array(rows);
  for (var i = 0; i < rows; i++) {
    board[i] = new Array(columns);
  }
  var $row = $("<div />", {
    class: 'row',
  });

  for (var i = 0; i < columns; i++) {
    var $square = $("<div />", {
      class: 'square col_' + i,
    });
    $row.append($square);
  }
  for (var i = 0; i < rows; i++) {
    var $currRow = $row.clone();
    $currRow.addClass('row_' + i);
    $("#main").append($currRow);
  }
}

function updateScrabbleBoard() {
  _.each(board, function(r, x) {
    _.each(r, function(c, y) {
      if (!_.isUndefined(c) && !_.isNull(c)) {
        var $tile = $('.row_' + y + ' > .col_' + x);
        $tile.text(c.letter);
        $tile.css('background-color', players[c.player].color);
      }
    });
  });
}

var addPlayer = function(id) {
  if (id in players) {
    return;
  }
  players[id] = {color: playerColors[playerList.length]};
  playerList.push(id);
  $(".player_list").empty();
  _.each(playerList, function(player, index) {
    $(".player_list").append("<li style='color: " + players[player].color + "'>" + player + "</li>");
  });
  if (playerList.length >= 2) {
    $(".start_button").show();
  }
}

function shuffle(a) {
  for (let i = a.length; i; i--) {
    let j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]];
  }
}

function start() {
  if (gameStarted || Object.keys(players).length < 2) {
    return;
  }
  gameStarted = true;
  initScrabbleBag();
  shuffle(scrabbleBag);
  for (var id in players) {
    var hand = [];
    for (var j = 0; j < 7; j++) {
      hand.push(scrabbleBag.pop());
    }
    players[id].hand = hand;
    webtendo.sendToClient(id, {
      hand: hand,
    });
  }
  currentPlayer = -1;
  nextPlayer();
  resetPosition();
}

function selectTile(x, y) {
  _.each($(".row .square"), function(e) {
    $(e).removeClass('selected');
  });
  $(".row_" + y + " > .col_" + x).addClass('selected');
}

function nextPlayer() {
  currentPlayer = (currentPlayer + 1) % playerList.length;
  $(".curr_player").text(playerList[currentPlayer]);
  resetPosition();
  currWordPositions = [];
}

function resetPosition() {
  position = {x: 7, y: 7};
  selectTile(position.x, position.y);
}

function getPossiblePositions() {
  if (currWordPositions.length == 0) {
    return null; // world is your oyster!
  } else if (currWordPositions.length == 1) {
    var origin = currWordPositions[0];
    return [
      {x: origin.x, y: origin.y + 1},
      {x: origin.x, y: origin.y - 1},
      {x: origin.x + 1, y: origin.y},
      {x: origin.x - 1, y: origin.y},
    ];
  } else {
    //figure out direction (up or down?)
  }
}

function maybeMoveToPosition(x, y) {
  var possiblePositions = getPossiblePositions();
  if (_.isNull(possiblePositions) || _.some(possiblePositions, function(p) {
      return x == p.x && y == p.y;
    })) {
    position.x = x;
    position.y = y;
    selectTile(position.x, position.y);
  }
}

function movePosition(direction) {
  if (direction == 'R') {
    if (position.x < 14) {
      var i = position.x + 1;
      while (_.find(currWordPositions, function(pos) {
        return pos.x == i && pos.y == position.y;
      }) && i <= 14) {
        i += 1;
      }
      if (i <= 14) {
        maybeMoveToPosition(i, position.y);
      }
    }
  } else if (direction == 'L') {
    if (position.x > 0) {
      var i = position.x - 1;
      while (_.find(currWordPositions, function(pos) {
        return pos.x == i && pos.y == position.y;
      }) && i >= 0) {
        i -= 1;
      }
      if (i >= 0) {
        console.log("move from : " + position + " to (" + i + ", " + position.y + ")");
        maybeMoveToPosition(i, position.y);
      }
    }
  } else if (direction == 'U') {
    if (position.y > 0) {
      var i = position.y - 1;
      while (_.find(currWordPositions, function(pos) {
        return pos.x == pos.x && pos.y == i;
      }) && i >= 0) {
        i -= 1;
      }
      if (i >= 0) {
        maybeMoveToPosition(position.x, i);
      }
    }
  } else if (direction == 'D') {
    if (position.y < 14) {
      var i = position.y + 1;
      while (_.find(currWordPositions, function(pos) {
        return pos.x == pos.x && pos.y == i;
      }) && i <= 14) {
        i += 1;
      }
      if (i <= 14) {
        maybeMoveToPosition(position.x, i);
      }
    }
  }
  
}
                  
var playLetter = function(player, letter, index) {
  // check that the spot isn't already taken
  // TODO: Make it so the joystick never ends in an unavailable position.
  if (!_.isUndefined(board[position.x][position.y])) {
    alert("This spot is already taken!");
    return;
  }
  board[position.x][position.y] = {player: player, letter: letter};
  currWordPositions.push({x: position.x, y: position.y});
  updateScrabbleBoard();
  // remove letter from player's board, and give a new one.
  var hand = players[player].hand;
  if (scrabbleBag.length > 0) {
    hand[index] = scrabbleBag.pop();
  } else {
    hand.splice(index, 0);
  }
  webtendo.sendToClient(player, {
    hand: hand,
  });
}

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

// these are the vars that store current user's turn
var position;
var lastMoveTimestamp = 0;
var numConsecutiveMoves;
var currWordPositions = []; // array of positions where characters have been placed.

var handleJoystickMoved = function(x, y) {
  if (x == 0 && y == 0) {
    // no movement, don't do anything.
    return;
  }
  var direction;
  // get direction
  if (Math.abs(x) > Math.abs(y)) {
    // left or right
    if (x < 0) {
      direction = 'L';
    } else {
      direction = 'R';
    }
  } else {
    // up or down
    if (y > 0) {
      direction = 'D';
    } else {
      direction = 'U';
    }
  }
  movePosition(direction);
}

var finishTurn = function() {
  // TODO: check the word is valid and accept/reject + reward points.
  nextPlayer();
}

var hasGameStarted = function() {
  return gameStarted;
}

var getCurrentPlayer = function() {
  return playerList[currentPlayer];
}

var numPlayers = function() {
  return playerList.length;
}

webtendo.callbacks.onMessageReceived = function(x) {
  // TODO: do something with message from client.
  if (x.clientId !== getCurrentPlayer()) {
    return;
  }
  if (x.value == 'stick') {
    // joystick moved.
    //if (x.action == "touchstart") {
      handleJoystickMoved(x.position.x, x.position.y);
    //}
  } else if (x.letter) {
    console.log("player " + x.clientId + " played " + x.letter);
    playLetter(x.clientId, x.letter, x.index);
  } else if (x.finish_turn) {
    finishTurn(); 
  }
}

$(".start_button").click(function() {
  start();
});

webtendo.callbacks.onConnected = function(id) {
  if (gameStarted) {
    // reject player
    webtendo.sendToClient(id, {error: 'Sorry, a game is already in session!'});
    return;
  } else if (numPlayers() == 6) {
    // reject player
    webtendo.sendToClient(id, {error: 'Sorry, this game is at capacity!'});
    return;
  }
  console.log(id, 'connected');
  addPlayer(id);
  webtendo.sendToClient(id, {hello: 'welcome to Frabble!'});
}
console.log("hi!");
console.log(webtendo.callbacks.onConnected);

window.onload = function() {
  createScrabbleBoard();
};