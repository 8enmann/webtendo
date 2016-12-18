import * as client from '../scripts/client';
import * as webtendo from '../scripts/webtendo';

let bid = 0;
let minimumBid = 0;
let name = 'Connecting...';
let isMyTurn = false;

client.callbacks.onTouch = function(e, touch, region) {
  // Ignore everything other than touchend
  if (e.type !== 'touchend') {
    return;
  }
  console.log(region);
  if (region === 'toggleHand') {
    var handEl = document.getElementById('hand');
    handEl.style.opacity = handEl.style.opacity !== '0' ? '0' : '1';
    document.getElementById('handVerb').innerText = handEl.style.opacity == '0' ? 'VIEW' : 'HIDE';
    return;
  }
  if (region === 'commit' || region === 'fold') {
    if (!isMyTurn)return;
    client.sendToHost({
      controlName: region,
      controlValue: bid,
    });
    document.getElementById('namebox').style.backgroundColor = '#404040';
    updateBid(0);
    isMyTurn = false;
    return;
  }
  if (region !== undefined) {
    let newBid = parseInt(region);
    if (newBid === 0) {//see
      updateBid(minimumBid);
    } else {
      updateBid(newBid + bid);
    }
  }
}

function updateBid(newBid) {
  bid = newBid;
  let text = `$${bid}`;
  if (newBid >= 1e6) {
    text = 'ALL IN';
  }
  document.getElementById('bet').innerText = text;
}

webtendo.callbacks.onMessageReceived = function(x) {
  console.log(x);
  if (x.minimumBid !== undefined) {//turn indicator message
    if (x.whoseTurn == name) {//if it's my turn
      if (x.minimumBid !== minimumBid) {
        bid = x.minimumBid;
      }
      minimumBid = x.minimumBid;
      updateBid(bid);
      document.getElementById('namebox').style.backgroundColor = '#03a9f4';//blue
      if (!isMyTurn) {
        client.vibrate();
      }
      isMyTurn = true;
    } else {
      isMyTurn = false;
      document.getElementById('namebox').style.backgroundColor = '#404040';//gray
    }
  } else if (x.hello!==undefined) {//name sending message
    name = x.hello;
    document.getElementById('name').innerText = name;
  } else if (x.handText !== undefined) {
    document.getElementById('hand').innerText = x.handText;
  }
}

client.checkOrientation();
