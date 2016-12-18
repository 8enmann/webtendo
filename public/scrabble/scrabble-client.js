import * as webtendo from '../scripts/webtendo';
import * as client from '../scripts/client';
import _ from 'underscore';
import $ from 'jquery';

var name = "Your name here";
var letters = [];
var points = 0;
var numTilesLeft = 100;
var playerReady = false;

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
  $("#info").append("<div class=info>Player: " + name + "</div>");
  if ($("#hand").children().length > 0) { // game started. display points and stuff
    $("#info").append(" \
        <div class=info>Points: " + points + "</div> \
        <div class=info>Tiles Left: " + numTilesLeft + "</div> \
      ");
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
  if ($("#hand").children().length > 0) {
    // play buttons
    $("#action_buttons").append(" \
        <button class='btn-play touch-region' data-buttonvalue='play=true'>Play Letter</button> \
        <button class='btn-play touch-region' data-buttonvalue='submit=true'>Finish Turn</button>");
  } else {
    $("#action_buttons").append(" \
        <button class='btn-play touch-region' data-buttonvalue='ready=true'>Ready</button>");
  }
}
updateInfo();
updateActionButtons();

webtendo.callbacks.onMessageReceived = function(x) {
  console.log(x);

  if (x.error) {
    alert(x.error);
    return;
  }

  if (x.points) {
    // TODO points animation
    points = x.score;
    updateInfo();
    return;
  }

  if (x.message) {
    client.vibrate();    
    alert(x.message);
    return;
  }

  if (x.name) {
    name = x.name;
    updateInfo();
  }

  if (x.hand) {
    // render new hand
    updateHand(x.hand);
  }
}

var joystick = document.getElementById('joystick');
var stick = document.getElementById('stick');

client.callbacks.onTouch = function(e, touch, region) {
  if (region === 'stick') {
    let position = {x: 0, y: 0};
    if (e.type === 'touchend') {
      resetStick();
    } else {
      position = moveStick(touch.pageX - joystick.offsetLeft, touch.pageY - joystick.offsetTop);
    }

    client.sendToHost({
      action: e.type,
      value: region,
      position: position, 
    });
  } else {
    // character tiles part of screen
    if (e.type !== 'touchend' || region === '') {
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

function moveStick(x,y) {
  let radius = joystick.offsetWidth/2;
  let relativeX = x - radius;
  let relativeY = y - radius;
  // Check to see if the point is out of bounds and if so, clip.
  let distance = Math.sqrt(Math.pow(relativeX, 2) + Math.pow(relativeY, 2));
  let theta = Math.atan2(relativeY, relativeX);
  let maxDistance = radius - stick.offsetWidth/2;
  if (distance > maxDistance) {
    stick.style.backgroundColor = 'red';
    x = maxDistance * Math.cos(theta) + radius;
    y = maxDistance * Math.sin(theta) + radius;
  } else {
    stick.style.backgroundColor = 'white';
  }

  let newLeft = x - stick.offsetWidth / 2;
  let newTop = y - stick.offsetHeight / 2;

  stick.style.left = newLeft + 'px';
  stick.style.top = newTop + 'px';

  return {
    x: Math.min(maxDistance, distance) * Math.cos(theta) / maxDistance,
    y: Math.min(maxDistance, distance) * Math.sin(theta) / maxDistance,
  };
}

function resetStick() {
  moveStick(joystick.offsetHeight/2, joystick.offsetWidth/2);
}
