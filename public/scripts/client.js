'use strict';

import * as webtendo from './webtendo';
import $ from 'jquery';

/****************************************************************************
 * Public interface
 ****************************************************************************/
// Called whenever body is touched. Args are event and the data-buttonvalue of
// elements with class touch-region, if any.
export var callbacks = {onTouch: undefined};
// Convenience wrapper for sendToClient (and to avoid confusion).
export var sendToHost = function(obj) {
  return webtendo.sendToClient(webtendo.clientId, obj);
}

// Tell user to rotate screen.
export function checkOrientation(orientation = 'landscape') {
  // if (!window.matchMedia(`(orientation: ${orientation})`).matches) {
  if (orientation == 'portrait' ?
      window.innerHeight < window.innerWidth :
      window.innerHeight > window.innerWidth) {
    alert('Please rotate your device');
  }
}

// Simple 3 buzz convenience wrapper.
export function vibrate() {
  window.navigator.vibrate([150, 150, 150, 150, 150]);
}


/****************************************************************************
 * Private
 ****************************************************************************/

function getRegion(x, y) {
  let regions = document.getElementsByClassName('touch-region');
  let check = (x, left, width) => x >= left && x <= left + width;
  let pxToNum = x => Number.parseInt(x.replace('px', ''));
  for (var i = 0; i < regions.length; i++) {
    let region = $(regions[i]);
    // Handle d-pad nastiness.
    let width = region.width() || (pxToNum(region.css('border-left-width')) +
                                   pxToNum(region.css('border-right-width')));
    let height = region.height() || (pxToNum(region.css('border-top-width')) +
                                     pxToNum(region.css('border-bottom-width')));
    if (check(x, region.offset().left, width) &&
        check(y, region.offset().top, height)) {
      return {value: regions[i].dataset.buttonvalue, el: regions[i]};
    }
  }
}

function touchFeedback(region, type) {
  if (region === undefined) {
    return;
  } else if (type === 'touchstart') {
    region.el.style.opacity = .6;
  } else if (type === 'touchend') {
    region.el.style.opacity = 1;
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
    touchFeedback(region, e.type);
    if (region !== undefined && callbacks.onTouch) {
      callbacks.onTouch(e, touches[i], region.value);
    }
    // return true;
  }
}

const CLICK_TYPES = {
  mousedown: 'touchstart',
  mousemove: 'touchmove',
  mouseup: 'touchend',
}

// Compatibility for testing or sad people.
let mouseDown = false;
function handleClick(e) {
  e.preventDefault();
  if (e.type === 'mousedown') {
    mouseDown = true;
  } else if (e.type === 'mouseup') {
    mouseDown = false;
  } else if (e.type === 'mousemove' && !mouseDown) {
    return;
  }
  let region = getRegion(e.pageX, e.pageY);
  // console.log(e)
  var copy = {type: CLICK_TYPES[e.type],
              target: e.target,
              pageX: e.pageX, pageY: e.pageY};
  touchFeedback(region, copy.type);
  if (region !== undefined && callbacks.onTouch) {
    callbacks.onTouch(copy, copy, region.value);
  }
}
  
  
document.body.addEventListener('touchstart', handleTouch);
document.body.addEventListener('touchmove', handleTouch);
document.body.addEventListener('touchend', handleTouch);
document.body.addEventListener('mousedown', handleClick);
document.body.addEventListener('mouseup', handleClick);
document.body.addEventListener('mousemove', handleClick);

// Disable zoom on iOS 10.
document.addEventListener('gesturestart', function (e) {
  e.preventDefault();
});
// TODO: replace this with sindresorhus/screenfull.js
var fullscreenButton = document.getElementById('fullscreen');
if (fullscreenButton) {
  fullscreenButton.addEventListener('touchstart', fullscreen);
  function fullscreen(e) {
    if (!document.documentElement.webkitRequestFullScreen) {
      return;
    }
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

webtendo.callbacks.onMessageReceived = function(x) {
  // TODO: do something with message from host.
  console.log(x);
}

webtendo.callbacks.onConnected = function(id) {
  console.log(id, 'connected');
  sendToHost({hello: 'host'});
}
