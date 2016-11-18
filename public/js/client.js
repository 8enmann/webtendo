'use strict';

/****************************************************************************
 * Public interface
 ****************************************************************************/
// Called whenever body is touched. Args are event and the data-buttonvalue of
// elements with class touch-region, if any.
var onTouch;
// Convenience wrapper for sendToClient (and to avoid confusion).
var sendToHost = function(obj) {
  return sendToClient(clientId, obj);
}

/****************************************************************************
 * Private
 ****************************************************************************/

function getRegion(x, y) {
  let regions = document.getElementsByClassName('touch-region');
  let check = (x, left, width) => x >= left && x <= left + width;
  for (var i = 0; i < regions.length; i++) {
    let region = regions[i];
    if (check(x, region.offsetLeft, region.offsetWidth) && check(y, region.offsetTop, region.offsetHeight)) {
      return region.dataset.buttonvalue;
    }
  }
}

function handleTouch(e) {
  e.preventDefault();
  // console.log(e);
  let touches = e.changedTouches;
  for (var i = 0; i < touches.length; i++) {
    // Any touches elsewhere while a finger is down on the joystick will
    // block input on the rest of the screen.
    let region = getRegion(touches[i].pageX, touches[i].pageY);
    if (onTouch) {
      onTouch(e, touches[i], region);
    }
    // return true;
  }
}

function init() {
  document.body.addEventListener('touchstart', handleTouch);
  document.body.addEventListener('touchmove', handleTouch);
  document.body.addEventListener('touchend', handleTouch);
  document.getElementById('fullscreen').addEventListener('touchstart', fullscreen);
  // Disable zoom on iOS 10.
  document.addEventListener('gesturestart', function (e) {
    e.preventDefault();
  });
}

// TODO: replace this with sindresorhus/screenfull.js
var fullscreenButton = document.getElementById('fullscreen');
if (fullscreenButton) {
  fullscreenButton.addEventListener('touchstart', fullscreen);
  function fullscreen(e) {
    document.documentElement.webkitRequestFullScreen();
    if (!screen.orientation.type.includes('landscape')) {
      screen.orientation.lock('landscape')
            .then(()=> console.log('switched to landscape'),
                  err => {
                    console.error(err);
                    window.alert('please rotate device');
                  });
    }
  }
}


