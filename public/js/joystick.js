'use strict';
var joystick = document.getElementById('joystick');
var stick = document.getElementById('stick');
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
    x: Math.max(-maxDistance, Math.min(maxDistance, relativeX + Math.sign(relativeX) * stick.offsetWidth / 2)) / maxDistance,
    y: Math.max(-maxDistance, Math.min(maxDistance, relativeY + Math.sign(relativeY) * stick.offsetWidth / 2)) / maxDistance,
  };
}

onTouch = function(e, touch, region) {
  // In joystick part of screen.
  if (region === 'stick') {
    let position = {x: 0, y: 0};
    if (e.type === 'touchend') {
      resetStick();
    } else {
      position = moveStick(touch.pageX - joystick.offsetLeft, touch.pageY - joystick.offsetTop);
    }
    sendToHost({
      action: e.type,
      value: region,
      position: position,
    });
  } else {
    // In button part of screen. Ignore moves.
    // TODO: fix highlighting.
    if (e.type !== 'touchmove') {
      sendToHost({
        action: e.type,
        value: region,
      });
    }
  }
}
function resetStick() {
  moveStick(joystick.offsetHeight/2, joystick.offsetWidth/2);
}
// TODO: call this again on screen orientation change.
resetStick();
