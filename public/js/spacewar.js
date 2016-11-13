'use strict';

var then;
var ctx;
var players = {};
var bullets = [];
var colors = ['red', 'green', 'blue', 'yellow', 'purple', 'white', 'lightblue', 'pink'];
var canvas;

document.addEventListener("DOMContentLoaded", function(event) {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext("2d");
  // Awful hack from stackoverflow to increase canvas resolution.
  const ratio = window.devicePixelRatio, w = canvas.offsetWidth, h = canvas.offsetHeight;
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  then = Date.now();
  main();
});

// Update positions.
function update(modifier) {
  for (var i = bullets.length - 1; i >= 0; i--) {
    let bullet = bullets[i];
    bullet.x += bullet.vx * 300 * modifier;
    bullet.y += bullet.vy * 300 * modifier;
    // Despawn bullets that have gone off the map.
    // Consider tracking bullet travel distance and capping range.
    if (bullet.x < 0 || bullet.x > canvas.offsetWidth || bullet.y < 0 || bullet.y > canvas.offsetHeight) {
      bullets.splice(i, 1);
    }
  }
  for (var id in players) {
    let player = players[id];
    if (player.a) { // Boost!
      player.speed = 200;
    } else {
      player.speed = 100;
    }
    if (player.b) {
      // Fire weapon.
      bullets.push({
        x: player.x + Math.cos(player.theta) * 40,
        y: player.y + Math.sin(player.theta) * 40,
        // Force velocity to sum to 1.
        vx: Math.cos(player.theta),
        vy: Math.sin(player.theta),
        // Who to give points for a kill.
        owner: id,
      });
      // Consume touch so we only fire 1 bullet per press.
      delete player.b;
    }
    if (player.stick) {
      player.x += player.stick.position.x * player.speed * modifier;
      player.y += player.stick.position.y * player.speed * modifier;
      player.theta = Math.atan2(player.stick.position.y, player.stick.position.x);
    }
    // Bounds.
    player.x = Math.min(Math.max(0, player.x), canvas.offsetWidth);
    player.y = Math.min(Math.max(0, player.y), canvas.offsetHeight);
    // TODO: if intersecting a bullet, update score & reset position
  }
}

// The main game loop
function main() {
  var now = Date.now();
  var delta = now - then;

  update(delta / 1000);
  render();

  then = now;

  // Request to do this again ASAP
  requestAnimationFrame(main);
};

function getRandomPosition() {
  // TODO: also account for obj size
  return {x: Math.random() * canvas.offsetWidth, y: Math.random() * canvas.offsetHeight};
}

// Draw everything
var render = function () {
  // Clear
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // TODO: make classes for players and bullets and just call their render methods.
  bullets.forEach(bullet => {
    const R = 5;
    // Fill circle.
    ctx.beginPath();
    ctx.fillStyle = 'red';
    ctx.arc(bullet.x, bullet.y, R,0,2*Math.PI);
    ctx.fill();
  });
  for (let id in players) {
    let player = players[id];
    const R = 15;
    // Stroke circle.
    ctx.beginPath();
    ctx.arc(player.x, player.y, R,0,2*Math.PI);
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();
    // Fill circle.
    ctx.beginPath();
    ctx.fillStyle = player.color;
    ctx.arc(player.x, player.y, R,0,2*Math.PI);
    ctx.fill();
    // Triangle
    ctx.beginPath();
    ctx.fillStyle = 'black';
    // TODO: fix these.
    let h = R*2;
    ctx.moveTo(player.x + R * Math.cos(player.theta - Math.PI/2), player.y + R * Math.sin(player.theta - Math.PI/2));
    ctx.lineTo(player.x + h * Math.cos(player.theta), player.y + h * Math.sin(player.theta));
    ctx.lineTo(player.x + R * Math.cos(player.theta + Math.PI/2), player.y + R * Math.sin(player.theta + Math.PI/2));
    ctx.stroke();
    // Rectangles.
    // ctx.fillRect(player.x, player.y, 30, 30);
    // ctx.strokeRect(player.x,player.y, 30,30);
    // ctx.drawImage(heroImage, hero.x, hero.y);
  }

  // Scoreboard
  ctx.fillStyle = "black";
  ctx.font = "24px Helvetica";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  // Wow I'm lazy.
  ctx.fillText(JSON.stringify(Object.keys(players).map(id=>players[id].color + ': ' + players[id].score)), 0, 0);
};


onMessageReceived = function(x) {
  // console.log(x);
  let player = players[x.clientId];
  if (x.action === 'touchend') {
    delete player[x.value];
  } else {
    player[x.value] = x;
  }
}

onConnected = function(id) {
  console.log(id, 'connected');
  sendToClient(id, {hello: 'client'});
  if (!players[id]) {
    players[id] = {
      color: colors.pop(),
      score: 0,
      theta: Math.random() * Math.PI * 2,
      speed: 100, // px/second
    };
    Object.assign(players[id], getRandomPosition());
  }
}
