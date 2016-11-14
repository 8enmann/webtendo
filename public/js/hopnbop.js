const MAP_CONFIG = {
  TILE_WIDTH: 20,
  N_TILES_WIDE: 35,
  N_TILES_HIGH: 20,
  CANVAS_ID: 'canvas',
  MOVEMENT_SPEED: {
    JUMP: 7,
    LEFT: 0.7,
    RIGHT: 0.7
  },
  VELOCITY_LIMIT: {
    X: 3,
    Y: 16
  },
  GRAVITY: {
    X: 0,
    Y: 0.5
  },
  FRICTION: {
    X: 0.95,
    Y: 1
  },
  KILL_BOUNCE: 3
};

const canvas = document.getElementById(MAP_CONFIG.CANVAS_ID);
const ctx = canvas.getContext('2d');

canvas.width = MAP_CONFIG.TILE_WIDTH * MAP_CONFIG.N_TILES_WIDE;
canvas.height = MAP_CONFIG.TILE_WIDTH * MAP_CONFIG.N_TILES_HIGH;

const map1 = {
  tileTypes: [
    {color: '#eee', isSolid: false},
    {color: '#aba', isSolid: true}
  ],
  data: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1],
    
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    
    [1,1,1,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ]
};

function PlatformerEngine() {
  this.players = new Map();

  this.map = {
    data: [[]]
  };
};

PlatformerEngine.prototype.loadMap = function(map) {
  this.map = map;
};

/**
 * get the tileType at (x,y) == (col, row)
 */
PlatformerEngine.prototype.getTile = function(col, row) {
  const tileType = this.map.tileTypes[this.map.data[row][col]];
  return {
    isSolid: tileType.isSolid,
    col: col,
    row: row
  };
};

PlatformerEngine.prototype.update = function() {
  this.players.forEach(function(player) {
    player.update();
  });
  
  this.movePlayers();
};

PlatformerEngine.prototype.movePlayers = function() {
  this.players.forEach(player => {
    let nextX = player.location.x + player.velocity.x;
    let nextY = player.location.y + player.velocity.y;

    let offset = Math.round((MAP_CONFIG.TILE_WIDTH / 2) - 1);

    let tile = this.getTile(
        Math.round(player.location.x / MAP_CONFIG.TILE_WIDTH),
        Math.round(player.location.y / MAP_CONFIG.TILE_WIDTH)
    );
     
    if (tile.gravity) {
        player.velocity.x += tile.gravity.x;
        player.velocity.y += tile.gravity.y;
    } else {
        player.velocity.x += MAP_CONFIG.GRAVITY.X;
        player.velocity.y += MAP_CONFIG.GRAVITY.Y;
    }
    
    if (tile.friction) {
        player.velocity.x *= tile.friction.x;
        player.velocity.y *= tile.friction.y;
    } else {
        player.velocity.x *= MAP_CONFIG.FRICTION.X;
        player.velocity.y *= MAP_CONFIG.FRICTION.Y;
    }

    let t_y_up   = Math.floor(nextY / MAP_CONFIG.TILE_WIDTH);
    let t_y_down = Math.ceil(nextY / MAP_CONFIG.TILE_WIDTH);
    let y_near1  = Math.round((player.location.y - offset) / MAP_CONFIG.TILE_WIDTH);
    let y_near2  = Math.round((player.location.y + offset) / MAP_CONFIG.TILE_WIDTH);

    let t_x_left  = Math.floor(nextX / MAP_CONFIG.TILE_WIDTH);
    let t_x_right = Math.ceil(nextX / MAP_CONFIG.TILE_WIDTH);
    let x_near1   = Math.round((player.location.x - offset) / MAP_CONFIG.TILE_WIDTH);
    let x_near2   = Math.round((player.location.x + offset) / MAP_CONFIG.TILE_WIDTH);

    let top1    = this.getTile(x_near1, t_y_up);
    let top2    = this.getTile(x_near2, t_y_up);
    let bottom1 = this.getTile(x_near1, t_y_down);
    let bottom2 = this.getTile(x_near2, t_y_down);
    let left1   = this.getTile(t_x_left, y_near1);
    let left2   = this.getTile(t_x_left, y_near2);
    let right1  = this.getTile(t_x_right, y_near1);
    let right2  = this.getTile(t_x_right, y_near2);


    if (tile.jump && this.jump_switch > 15) {
        player.canJump = true;
        
        this.jump_switch = 0;
        
    } else this.jump_switch++;
    
    player.velocity.x = Math.min(Math.max(player.velocity.x, -MAP_CONFIG.VELOCITY_LIMIT.X), MAP_CONFIG.VELOCITY_LIMIT.X);
    player.velocity.y = Math.min(Math.max(player.velocity.y, -MAP_CONFIG.VELOCITY_LIMIT.Y), MAP_CONFIG.VELOCITY_LIMIT.Y);
    
    player.location.x += player.velocity.x;
    player.location.y += player.velocity.y;
    
    player.velocity.x *= .9;

    // TODO refactor into function
    if (left1.isSolid || left2.isSolid || right1.isSolid || right2.isSolid) {

        /* fix overlap */
        while (this.getTile(Math.floor(player.location.x / MAP_CONFIG.TILE_WIDTH), y_near1).isSolid
            || this.getTile(Math.floor(player.location.x / MAP_CONFIG.TILE_WIDTH), y_near2).isSolid)
            player.location.x += 0.1;

        while (this.getTile(Math.ceil(player.location.x / MAP_CONFIG.TILE_WIDTH), y_near1).isSolid
            || this.getTile(Math.ceil(player.location.x / MAP_CONFIG.TILE_WIDTH), y_near2).isSolid)
            player.location.x -= 0.1;

        /* tile bounce */

        let bounce = 0;

        if (left1.isSolid && left1.bounce > bounce) bounce = left1.bounce;
        if (left2.isSolid && left2.bounce > bounce) bounce = left2.bounce;
        if (right1.isSolid && right1.bounce > bounce) bounce = right1.bounce;
        if (right2.isSolid && right2.bounce > bounce) bounce = right2.bounce;

        player.velocity.x *= -bounce || 0;
        
    }
    
    if (top1.isSolid || top2.isSolid || bottom1.isSolid || bottom2.isSolid) {

        /* fix overlap */
        
        while (this.getTile(x_near1, Math.floor(player.location.y / MAP_CONFIG.TILE_WIDTH)).isSolid
            || this.getTile(x_near2, Math.floor(player.location.y / MAP_CONFIG.TILE_WIDTH)).isSolid)
            player.location.y += 0.1;

        while (this.getTile(x_near1, Math.ceil(player.location.y / MAP_CONFIG.TILE_WIDTH)).isSolid
            || this.getTile(x_near2, Math.ceil(player.location.y / MAP_CONFIG.TILE_WIDTH)).isSolid)
            player.location.y -= 0.1;

        /* tile bounce */
        
        let bounce = 0;
        
        if (top1.isSolid && top1.bounce > bounce) bounce = top1.bounce;
        if (top2.isSolid && top2.bounce > bounce) bounce = top2.bounce;
        if (bottom1.isSolid && bottom1.bounce > bounce) bounce = bottom1.bounce;
        if (bottom2.isSolid && bottom2.bounce > bounce) bounce = bottom2.bounce;
        
        player.velocity.y *= -bounce || 0;

        if ((bottom1.isSolid || bottom2.isSolid) && !tile.jump) {
            
            player.on_floor = true;
            player.canJump = true;
        }
        
    }
    
    // // adjust camera

    // let c_x = Math.round(this.player.location.x - this.viewport.x/2);
    // let c_y = Math.round(this.player.location.y - this.viewport.y/2);
    // let x_dif = Math.abs(c_x - this.camera.x);
    // let y_dif = Math.abs(c_y - this.camera.y);
    
    // if(x_dif > 5) {
        
    //     let mag = Math.round(Math.max(1, x_dif * 0.1));
    
    //     if(c_x != this.camera.x) {
            
    //         this.camera.x += c_x > this.camera.x ? mag : -mag;
            
    //         if(this.limit_viewport) {
                
    //             this.camera.x = 
    //                 Math.min(
    //                     this.current_map.width_p - this.viewport.x + MAP_CONFIG.TILE_WIDTH,
    //                     this.camera.x
    //                 );
                
    //             this.camera.x = 
    //                 Math.max(
    //                     0,
    //                     this.camera.x
    //                 );
    //         }
    //     }
    // }
    
    // if(y_dif > 5) {
        
    //     let mag = Math.round(Math.max(1, y_dif * 0.1));
        
    //     if(c_y != this.camera.y) {
            
    //         this.camera.y += c_y > this.camera.y ? mag : -mag;
        
    //         if(this.limit_viewport) {
                
    //             this.camera.y = 
    //                 Math.min(
    //                     this.current_map.height_p - this.viewport.y + MAP_CONFIG.TILE_WIDTH,
    //                     this.camera.y
    //                 );
                
    //             this.camera.y = 
    //                 Math.max(
    //                     0,
    //                     this.camera.y
    //                 );
    //         }
    //     }
    // }
    
    // if(this.last_tile != tile.id && tile.script) {
    
    //     eval(this.current_map.scripts[tile.script]);
    // }
    
    // this.last_tile = tile.id;
  });


  let getRespawnableLocation = () => {

    let col = Math.floor(Math.random() * MAP_CONFIG.N_TILES_WIDE);
    let row = Math.floor(Math.random() * MAP_CONFIG.N_TILES_HIGH);

    let x = MAP_CONFIG.TILE_WIDTH * col;
    let y = MAP_CONFIG.TILE_WIDTH * row;

    let tile = this.getTile(
        col,
        row
    );
     
    if (tile.isSolid) {
      return getRespawnableLocation();
    }
    return {x, y};
  };
  
  // TODO don't make it n^2
  this.players.forEach(player => {
    this.players.forEach(opponent => {
      if (player === opponent) {
        return;
      }

      // check if jumping on opponent
      if (player.doesCollide(opponent) && 
        player.velocity.y > MAP_CONFIG.GRAVITY.Y) {

        /* fix overlap */
        player.location.y = opponent.location.y - player.height;

        /* tile bounce */
        let bounce = MAP_CONFIG.KILL_BOUNCE;
        
        player.velocity.y = -bounce;

        let respawnLocation = getRespawnableLocation();
        opponent.respawn(respawnLocation);
        player.addKillTally(opponent);
      }

    });
  });
};

/**
 * @param message {value: string ('a', 'b', 'stick'), 
 *            action: ('touchend', 'touchstart', 'touchmove'), 
 *            position: {x: float [-1, 1], y: float [-1, 1]},
 *            clientId: string (who is the sender)}
 */
PlatformerEngine.prototype.onMessageReceived = function(message) {
  console.log(message);

  let player = this.players.get(message.clientId);
  if (message.action === 'touchend') {
    player.clientAction[message.value] = undefined;
  } else {
    player.clientAction[message.value] = message;
  }
};

PlatformerEngine.prototype.onConnected = function(id) {
  console.log(id, 'connected');
  window.sendToClient(id, {hello: 'client'});

  const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'brown', 'black', 'gray'];

  if (!this.players.has(id)) {
    let playerColor = COLORS[this.players.size];
    this.players.set(id, new Bunny(playerColor));
  }
};

PlatformerEngine.prototype.draw = function(context) {
  this.drawMap(context);
  this.drawPlayers(context);
  // this.drawScore();
};

PlatformerEngine.prototype.drawMap = function(context) {
  const tileTypes = this.map.tileTypes;
  this.map.data.forEach(function(rowData, rowIndex) {
    rowData.forEach(function(tileType, columnIndex) {
      context.fillStyle = tileTypes[tileType].color;
      context.fillRect(
        columnIndex * MAP_CONFIG.TILE_WIDTH,
        rowIndex * MAP_CONFIG.TILE_WIDTH,
        MAP_CONFIG.TILE_WIDTH,
        MAP_CONFIG.TILE_WIDTH);
    });
  });
};

PlatformerEngine.prototype.drawPlayers = function(context) {
  this.players.forEach(function(player) {
    player.draw(context);
  });
};

PlatformerEngine.prototype.drawScore = function() {
  let players = document.getElementById('players');
  while (players.hasChildNodes()) {
      players.removeChild(players.lastChild);
  }

  this.players.forEach(player => {
    let playerLi = document.createElement('li');
    playerLi.className = 'player';
    let scoreText = document.createTextNode(`${player.color}: ${player.killCount}`); 
    playerLi.appendChild(scoreText);
    players.appendChild(playerLi);
  });
};

function GameObject() {
  this.location = {
    x: canvas.width/2,
    y: canvas.height - (MAP_CONFIG.TILE_WIDTH * 2)
  };
  this.velocity = {
    x: 0,
    y: 0
  };
  this.width = MAP_CONFIG.TILE_WIDTH;
  this.height = MAP_CONFIG.TILE_WIDTH;
  this.isVisible = true;
  this.color = 'black';
}

GameObject.prototype.doesCollide = function(obj) {
  if (this.isVisible && obj.isVisible) {
    // check hit box
    if (Math.round(this.location.x) > Math.round(obj.location.x + obj.width)) {
      return false;
    } else if (Math.round(this.location.x + this.width) < Math.round(obj.location.x)) {
      return false;
    } else if (Math.round(this.location.y) > Math.round(obj.location.y + obj.height)) {
      return false;
    } else if (Math.round(this.location.y + this.height) < Math.round(obj.location.y)) {
      return false;
    }
  
    return true;
  } else {
    return false;
  }
};

GameObject.prototype.draw = function(context) {
  if (this.isVisible) {
    context.fillStyle = this.color;

    context.beginPath();

    context.arc(
        this.location.x + MAP_CONFIG.TILE_WIDTH / 2,
        this.location.y + MAP_CONFIG.TILE_WIDTH / 2,
        MAP_CONFIG.TILE_WIDTH / 2 - 1,
        0,
        Math.PI * 2
    );

    context.fill();

  }
};

GameObject.prototype.update = function() {};

function GamePlayer(color) {
  GameObject.call(this);

  this.clientAction = {};
  this.canJump = true;
  this.color = color;
}

GamePlayer.prototype = Object.create(GameObject.prototype); // See note below
GamePlayer.prototype.constructor = GamePlayer;
GamePlayer.prototype.update = function() {
  if (this.clientAction.stick) {
    const stickAction = this.clientAction.stick;
    if (stickAction.position.x < 0) {
      if (this.velocity.x > -MAP_CONFIG.VELOCITY_LIMIT.X) {
          this.velocity.x += (stickAction.position.x * MAP_CONFIG.MOVEMENT_SPEED.LEFT);
      }
    }

    if (stickAction.position.x > 0) {
      if (this.velocity.x < MAP_CONFIG.VELOCITY_LIMIT.X) {
          this.velocity.x += (stickAction.position.x * MAP_CONFIG.MOVEMENT_SPEED.RIGHT);
      }
    }
  }

  if (this.clientAction.a) {
    if (this.canJump && this.velocity.y > -MAP_CONFIG.VELOCITY_LIMIT.Y) {
        this.velocity.y -= MAP_CONFIG.MOVEMENT_SPEED.JUMP;
        this.canJump = false;
    }
  } else {
    this.canJump = true;
  }
};

function Bunny() {
  GamePlayer.apply(this, arguments);
  this.killCount = 0;
  this.killTally = {

  };
}

Bunny.prototype = Object.create(GamePlayer.prototype);
Bunny.prototype.constructor = Bunny;
Bunny.prototype.addKillTally = function(player) {
  if (this.killTally[player.color]) {
    this.killTally[player.color]++;
  } else {
    this.killTally[player.color] = 1;
  }
  this.killCount++;
}

Bunny.prototype.respawn = function(location) {
  this.velocity = {
    x: MAP_CONFIG.GRAVITY.X,
    y: MAP_CONFIG.GRAVITY.Y
  };

  this.location = location;
}

function run() {
  window.requestAnimFrame =
    window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.oRequestAnimationFrame ||
    window.msRequestAnimationFrame ||
    function(callback) {
      return window.setTimeout(callback, 1000 / 60);
    };
  
  // make canvas focusable, then give it focus!
  canvas.setAttribute('tabindex','0');
  // canvas.focus();
  
  const game = new PlatformerEngine();
  window.onMessageReceived = game.onMessageReceived.bind(game);
  window.onConnected = game.onConnected.bind(game);
  
  game.loadMap(map1);
   
  let Loop = function() {

    ctx.fillStyle = '#ddd';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    game.update();
    game.draw(ctx);

    window.requestAnimFrame(Loop);
  };
  
  Loop();
}

run();