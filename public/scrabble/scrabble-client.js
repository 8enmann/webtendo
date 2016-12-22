import * as webtendo from '../scripts/webtendo';
import * as client from '../scripts/client';
import _ from 'underscore';
import $ from 'jquery';

var name = "Your name here";
var letters = [];
var points = 0;
var numTilesLeft = 100;
var playerReady = false;
var everyoneReady = false;
var gameStarted = false;

var letterToPointsMap = {
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

function updateHand(hand) {
  $("#hand").empty();
  if (hand.length > 0) {
    gameStarted = true;
  }

  _.each(hand, function(character, index) {
    var $letter = createCharacterTile(character);
    $("#hand").append($letter);
  });
  updateInfo();
  updateActionButtons();
}

function createCharacterTile(character) {
  var $tile = $("<div />", {
    class: 'letter-tile touch-region',
  });
  $tile.attr('data-buttonvalue', 'character=' + character);
  var $character = $("<div />", {
    class: 'letter',
  });
  $character.text(character);
  $tile.append($character);

  var $points = $("<div />", {
    class: 'points',
  });
  $points.text(letterToPointsMap[character]);
  $tile.append($points);
  return $tile;
}

function updateInfo() {
  $("#info").empty();
  $("#info").append(`<div class="info touch-region" data-buttonvalue="name"><span>Name</span><span id="name">${name}</span></div>`);
  if (gameStarted) {
    $("#info").append(`
        <div class=info><span>Points</span><span>${points}</span></div>
        <div class=info><span>Tiles left</span><span>${numTilesLeft}</div>
      `);
  } else { // game hasn't started. display player ready state
    if (playerReady) {
      $("#info").append("<div class=info>Waiting for other players..</div>");
    } else {
      $("#info").append("<div class=info>Press Ready when ready to play!</div>");
    }
  }
}

function updateActionButtons() {
  $("#action_buttons").empty();
  if (gameStarted) { //$("#hand").children().length > 0) {
    // play buttons
    $("#action_buttons").append(" \
        <i class='fa fa-undo ctrl-btn btn-danger touch-region' data-buttonvalue='reset=true' aria-hidden='true'></i> \
        <i class='fa fa-play ctrl-btn btn-play touch-region' data-buttonvalue='play=true' aria-hidden='true'></i> \
        <button class='ctrl-btn btn-play touch-region' data-buttonvalue='submit=true'>Done</button>");
  } else if (everyoneReady) {
    $("#action_buttons").append(" \
        <button class='ctrl-btn btn-play touch-region' data-buttonvalue='start=true'>Start Game!</button>");
  } else {
    $("#action_buttons").append(" \
        <button class='ctrl-btn btn-play touch-region' data-buttonvalue='ready=true'>Ready</button>");
  }
}
updateInfo();
updateActionButtons();

webtendo.callbacks.onMessageReceived = function(x) {
  console.log(x);

  if (x.error) {
    showMessage(x.error);
    return;
  }

  if (x.ready) {
    everyoneReady = true;
    updateActionButtons();
  }

  if (x.hand) {
    // render new hand
    updateHand(x.hand);
  }

  if (x.name) {
    name = x.name;
    updateInfo();
  }

  if (x.points) {
    // TODO points animation
    points = x.score;
    updateInfo();
  }

  if (x.message) {
    client.vibrate();
    showMessage(x.message);
  }
}

function showMessage(message) {
  var butterbar = $(`<div class="butterbar">${message}</div>`);
  $("body").prepend(butterbar);
  butterbar.slideDown("slow");
  setTimeout(function() {
    butterbar.slideUp("slow", function() {
      butterbar.remove();
    });
  }, 2000);
}

function setName() {
  let newName = prompt('Edit name');
  if (newName) {
    newName = newName.trim();
  }
  if (newName.length > 40) {
    alert('Pick a shorter name!');
    return;
  } else if (!newName) {
    return;
  }
  client.sendToHost({name: newName});
  $('#name').text(newName);  
}

var dpad = document.getElementById('dpad');

client.callbacks.onTouch = function(e, touch, region) {
  if (region.indexOf('dpad-') === 0) {
    if (e.type === 'touchend') {
      client.sendToHost({
        action: "moveCursor",
        value: region.substring(5),
      });
    }
  } else {
    // character tiles part of screen
    if (e.type !== 'touchend' || region === '') {
      return;
    }
    if (region === 'name') {
      setName();
      return;
    }
    // which character?
    var params = {};
    _.each(region.split(','), function(a) {
      var b = a.split('=');
      params[b[0]] = b[1];
    });

    if (params['ready']) {
      client.sendToHost({
        action: 'ready',
        value: true
      });
      playerReady = true;
      updateInfo();
    } else if (params['character']) {
      selectCharacter(e, params['character']);
    } else if (params['reset']) {
      client.sendToHost({
        action: 'reset',
        value: true,
      });
      return;
    } else if (params['play']) {
      if (_.isUndefined(selectedCharacter) || _.isNull(selectedCharacter)) {
        alert("Please select a character first!");
        return;
      }
      client.sendToHost({
        action: 'play_letter',
        value: selectedCharacter
      });
      unselectAllCharacters();
      selectedCharacter = null;
    } else if (params['start']) {
      client.sendToHost({
        action: 'start',
        value: true,
      });
    } else if (params['submit']) {
      client.sendToHost({
        action: 'finish_turn',
        value: true
      })
    }
  }
}

function unselectAllCharacters() {
  _.each($("#hand").children(), function(charDiv) {
    $(charDiv).removeClass("selected");
  });
}
var selectedCharacter;
function selectCharacter(e, character) {
  unselectAllCharacters();
  selectedCharacter = character;
  $(e.target).closest('.letter-tile').toggleClass('selected');
}
