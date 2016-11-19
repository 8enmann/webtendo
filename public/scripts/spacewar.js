'use strict';
import * as webtendo from './webtendo';

const numCollisionRows = 4;
const numCollisionColumns = 6;

var then;
var ctx;
var players = {};
var bullets = [];
var stars = [];
var colors = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'brown', 'black', 'gray'];
var canvas;
var collisionSections;

class Circle {
  constructor(x, y, r) {
    this.x = x;
    this.y = y;
    this.r = r;
  }

  get sectionIndices() {
    return [sectionForCoordinate(this.x, this.y)];
  }

  intersects(other) {
    return this.distanceTo(other) < this.r + other.r;
  }

  distanceTo(other) {
    var a = this.x - other.x;
    var b = this.y - other.y;
    return Math.sqrt(a*a + b*b);
  }
}

class Star extends Circle {
  constructor() {
    let p = getRandomPosition();
    super(p.x, p.y, 1);
  }

  render(ctx) {
    ctx.beginPath();
    ctx.fillStyle = 'white';
    ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
    ctx.fill();
  }
}
  
class Player extends Circle {
  constructor(id) {
    let p = getRandomPosition();
    super(p.x, p.y, 15);

    this.color = colors.pop();
    this.theta = Math.random() * Math.PI * 2;
    this.score = 0;
    this.speed = 100; // px/second
    this.id = id;
  }

  render(ctx) {

    for (var i = 0; i < 2; i++) {
      // Triangle
      ctx.beginPath();

      let h = this.r * 2;
      ctx.moveTo(this.x + h * Math.cos(this.theta), this.y + h * Math.sin(this.theta));
      ctx.lineTo(this.x + this.r * Math.cos(this.theta - 2*Math.PI/3), this.y + this.r * Math.sin(this.theta - 2*Math.PI/3));
      ctx.lineTo(this.x + this.r * Math.cos(this.theta + 2*Math.PI/3), this.y + this.r * Math.sin(this.theta + 2*Math.PI/3));
      ctx.lineTo(this.x + h * Math.cos(this.theta), this.y + h * Math.sin(this.theta));
      if (i == 0) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = this.color;
        ctx.fill();
      }
    }
  }

  update(modifier) {
    if (this.a) { // Boost!
      this.speed = 200;
    } else {
      this.speed = 100;
    }
    if (this.b) {
      // Fire weapon.
      bullets.push(new Bullet(
        this.x + Math.cos(this.theta) * 35,
        this.y + Math.sin(this.theta) * 35,
        // Force velocity to sum to 1.
        Math.cos(this.theta),
        Math.sin(this.theta),
        // Who to give points for a kill.
        this.id
      ));
      // Consume touch so we only fire 1 bullet per press.
      delete this.b;
    }
    if (this.stick) {
      this.x += this.stick.position.x * this.speed * modifier;
      this.y += this.stick.position.y * this.speed * modifier;
      this.theta = Math.atan2(this.stick.position.y, this.stick.position.x);
    }
    // Bounds.
    this.x = Math.min(Math.max(0, this.x), canvas.offsetWidth);
    this.y = Math.min(Math.max(0, this.y), canvas.offsetHeight);
  }

  respawn() {
    let p = getRandomPosition();
    this.x = p.x;
    this.y = p.y;
    this.theta = Math.random() * Math.PI * 2;
  }
}

class Bullet extends Circle {

  constructor(x, y, vx, vy, owner) {
    super(x, y, 5);

    this.vx = vx;
    this.vy = vy;
    this.owner = owner;
  }

  render(ctx) {
    // Fill circle.
    ctx.beginPath();
    ctx.fillStyle = 'red';
    ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
    ctx.fill();
  }

  update(modifier, index) {
    this.x += this.vx * 300 * modifier;
    this.y += this.vy * 300 * modifier;

    // Handle first collision
    let collided = false;
    for (var i of this.sectionIndices) {
      let section = collisionSections[i];

      if (collided) {
        break;
      }

      for (var player of section.players) {
        if (this.intersects(player)) {
          collided = true;
          players[this.owner].score++;
          player.respawn();
          break;
        }
      }

      for (var bullet of section.bullets) {
        if (this.x == bullet.x && this.y == bullet.y && this.owner == bullet.owner) {
          continue;
        }
        if (this.intersects(bullet)) {
          collided = true;
        }
      }
    }

    // Despawn bullets that have gone off the map.
    // Consider tracking bullet travel distance and capping range.
    let isOutOfBounds = this.x < 0 || this.x > canvas.offsetWidth || this.y < 0 || this.y > canvas.offsetHeight;
    if (isOutOfBounds || collided) {
      bullets.splice(index, 1);
    }
  }
}

function blankCollisionSections() {
  var sections = new Array();
  for (var i = 0; i < numCollisionRows * numCollisionColumns; i++) {
    sections.push({
      'players': [],
      'bullets': []
    });
  }
  return sections;
}

function createCollisionSections() {
  var newSections = blankCollisionSections();

  for (var i = bullets.length - 1; i >= 0; i--) {
    let bullet = bullets[i];
    bullet.sectionIndices.forEach(function(i) {
      newSections[i]['bullets'].push(bullet);
    });
  }

  for (var id in players) {
    let player = players[id];
    player.sectionIndices.forEach(function(i) {
      newSections[i]['players'].push(player);
    });
  }

  return newSections;
}

// Update positions.
function update(modifier) {
  collisionSections = createCollisionSections();

  for (var i = bullets.length - 1; i >= 0; i--) {
    bullets[i].update(modifier, i);
  }

  for (var id in players) {
    players[id].update(modifier);
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
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  stars.forEach(star => star.render(ctx));
  bullets.forEach(bullet => bullet.render(ctx));
  Object.values(players).forEach(player => player.render(ctx));

  // Scoreboard
  ctx.fillStyle = "white";
  ctx.font = "24px Helvetica";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  // Wow I'm lazy.
  ctx.fillText(JSON.stringify(Object.keys(players).map(id=>players[id].color + ': ' + players[id].score)), 0, 0);
};


webtendo.callbacks.onMessageReceived = function(x) {
  // console.log(x);
  let player = players[x.clientId];
  if (x.action === 'touchend') {
    delete player[x.value];
  } else {
    player[x.value] = x;
  }
};

webtendo.callbacks.onConnected = function(id) {
  console.log(id, 'connected');
  webtendo.sendToClient(id, {hello: 'client'});
  if (!players[id]) {
    players[id] = new Player(id);
  }
};

webtendo.callbacks.onDisconnected = function(id) {
  console.log(id, 'disconnected');
  // TODO: find out why ios disconnects. maybe just simulator?
  // delete players[id];
};

function sectionForCoordinate(x, y) {
  x = Math.max(0, Math.min(x, canvas.offsetWidth - 1));
  y = Math.max(0, Math.min(y, canvas.offsetHeight - 1));

  let rowHeight = canvas.offsetHeight / numCollisionRows;
  let columnWidth = canvas.offsetWidth / numCollisionColumns;

  let row = Math.floor(y / rowHeight);
  let column = Math.floor(x / columnWidth);

  return column + row * (numCollisionColumns);
};

(function init() {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext("2d");
  // Awful hack from stackoverflow to increase canvas resolution.
  const ratio = window.devicePixelRatio, w = canvas.offsetWidth, h = canvas.offsetHeight;
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);


  for (var i = 0; i < 100; i++) {
    stars.push(new Star());
  }


  then = Date.now();
  main();
})();
