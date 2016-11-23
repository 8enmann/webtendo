import * as client from '../scripts/client';

var bid = 0;

client.callbacks.onTouch = function(e, touch, region) {
  // Ignore everything other than touchend
  // TODO: fix highlighting
  if (e.type !== 'touchend') {
    return;
  }
  console.log(region);
  if (region === 'toggleHand') {
    var handEl = document.getElementById('hand');
    handEl.style.display = handEl.style.display == '' ? 'none' : '';
    document.getElementById('handVerb').innerText = handEl.style.display ? 'VIEW' : 'HIDE';
    return;
  }
  if (region === 'commit' || region === 'fold') {
    client.sendToHost({
      controlName: region,
      controlValue: bid,
    });
    updateBid(0);
    return;
  }
  if (region !== undefined) {
    let newBid = parseInt(region);
    if (newBid === 0) {
      updateBid(0);
    } else {
      updateBid(newBid + bid);
    }
  }
}

function updateBid(newBid) {
  bid = newBid;
  let text = bid;
  if (newBid >= 1e6) {
    text = 'ALL IN';
  }
  document.getElementById('bet').innerText = `$${text}`;
}
