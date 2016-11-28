import * as client from '../scripts/client';
import * as webtendo from '../scripts/webtendo';

var bid = 0;
var minimumBid = 0;
var name = 'Your Name Here';
var isMyTurn = false;

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
    if(!isMyTurn)return;
    client.sendToHost({
      controlName: region,
      controlValue: bid,
    });
    document.body.style.backgroundColor = '#404040';
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
  let text = bid;
  if (newBid >= 1e6) {
    text = 'ALL IN';
  }
  document.getElementById('bet').innerText = `$${text}`;
}

webtendo.callbacks.onMessageReceived = function(x) {
  // TODO: do something with message from host.
  console.log(x);
  if(x.minimumBid!==undefined){//turn indicator message
    if(x.whoseTurn==name){//if it's my turn
      minimumBid = x.minimumBid;
      if(x.minimumBid != minimumBid)
        bid = minimumBid;
      updateBid(bid);
      document.body.style.backgroundColor = '#03a9f4';//blue
      if (!isMyTurn) {
        window.navigator.vibrate([150, 150, 150, 150, 150]);
      }
      isMyTurn = true;
    }else{
      isMyTurn = false;
      document.body.style.backgroundColor = '#404040';//gray
    }
  }else if(x.hello!==undefined){//name sending message
    name = x.hello;
    document.getElementById('name').innerText = name;
  }else if(x.handText!==undefined){
    document.getElementById('hand').innerText = x.handText;
  }
}
