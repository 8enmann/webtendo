'use strict';

// Disable zoom on iOS 10.
document.addEventListener('gesturestart', function (e) {
  e.preventDefault();
});
// TODO: replace this with sindresorhus/screenfull.js
document.getElementById('fullscreen').addEventListener('touchstart', fullscreen);
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

var sendToHost = function(obj) {
  return sendToClient(clientId, obj);
}

let regions = document.getElementsByClassName('touch-region');
function getRegion(x, y) {
  let check = (x, left, width) => x >= left && x <= left + width;
  for (let region of regions) {
    if (check(x, region.offsetLeft, region.offsetWidth) && check(y, region.offsetTop, region.offsetHeight)) {
      return region.dataset.buttonvalue;
    }
  }
}
