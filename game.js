//-------------------------------------------------------------------------
// Multiplayer server setup
//-------------------------------------------------------------------------

var http = require('http');
var io = require('socket.io').listen(http.createServer().listen(8080));
var MAX_CLIENTS = 10; // quality control
var colors = ['cyan', 'blue', 'orange', 'green', 'purple', 'red', 'yellow'];
var clients = [];
var current;

var getNextColor = (function() {
  var index = -1;

  return function() {
    index ++;

    if (index >= colors.length) {
      index = 0;
    }

    return colors[index];
  }
})();

io.sockets.on('connection', function (socket) {
  var sId = socket.id;
  current = randomPiece();
  clients[sId] = {};
  clients[sId].socket = socket;
  clients[sId].currentPiece = current;

  // Let the client know its sid and color, and the current blocks
  socket.emit('connectionAck', {
    sId: sId,
    color: getNextColor(),
    blocks: blocks,
    current: clients[sId].currentPiece
  });

  socket.on('currentPieceChanged', function(data) {
    // Data is the change of the current piece position,
    // or the entire currentPiece object itself.
    _.extend(clients[sId].currentPiece, data);

    // Broadcast the change of the current piece to other clients
    var userData = {};
    userData[sId] = clients[sId].currentPiece;
    socket.broadcast.emit('otherPlayerPieceChanged', userData);
  });

  socket.on('blocksChanged', function(data) {
    // Data is the change in the blocks array
    // {x: 1, y: 1, type: true}
    blocks[data.x] = blocks[data.x] || [];
    blocks[data.x][data.y] = data.type;

    socket.broadcast.emit('blocksChanged', blocks);
  });

  socket.on('userAction', function(action) {
    console.log(action);
    actions.push(action);
  });
});

//-------------------------------------------------------------------------
// game constants
//-------------------------------------------------------------------------

var speed   = { start: 0.6, decrement: 0.005, min: 0.1 }, // how long before piece drops by 1 row (seconds)
    nx      = 20, // width of tetris court (in blocks)
    ny      = 20, // height of tetris court (in blocks)
    DIR     = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3 };

//-------------------------------------------------------------------------
// game variables (initialized during reset)
//-------------------------------------------------------------------------

var dx, dy,        // pixel size of a single tetris block
    blocks,        // 2 dimensional array (nx*ny) representing tetris court - either empty block or occupied by a 'piece'
    actions,       // queue of user actions (inputs)
    playing,       // true|false - game is in progress
    dt,            // time since starting this game
    current,       // the current piece
    next,          // the next piece
    rows,          // number of completed rows in the current game
    step = speed.start,          // how long before current piece drops by 1 row
    lines;         // linked list representing the court rows including deleted rows

//-------------------------------------------------------------------------
// tetris pieces
//
// blocks: each element represents a rotation of the piece (0, 90, 180, 270)
//         each element is a 16 bit integer where the 16 bits represent
//         a 4x4 set of blocks, e.g. j.blocks[0] = 0x44C0
//
//             0100 = 0x4 << 3 = 0x4000
//             0100 = 0x4 << 2 = 0x0400
//             1100 = 0xC << 1 = 0x00C0
//             0000 = 0x0 << 0 = 0x0000
//                               ------
//                               0x44C0
//
//-------------------------------------------------------------------------

var i = { id: 'i', size: 4, blocks: [0x0F00, 0x2222, 0x00F0, 0x4444], color: 'cyan'   };
var j = { id: 'j', size: 3, blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20], color: 'blue'   };
var l = { id: 'l', size: 3, blocks: [0x4460, 0x0E80, 0xC440, 0x2E00], color: 'orange' };
var o = { id: 'o', size: 2, blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00], color: 'yellow' };
var s = { id: 's', size: 3, blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620], color: 'green'  };
var t = { id: 't', size: 3, blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640], color: 'purple' };
var z = { id: 'z', size: 3, blocks: [0x0C60, 0x4C80, 0xC600, 0x2640], color: 'red'    };

//------------------------------------------------
// do the bit manipulation and iterate through each
// occupied block (x,y) for a given piece
//------------------------------------------------
function eachblock(type, x, y, dir, fn) {
  var bit, result, row = 0, col = 0, blocks = type.blocks[dir];
  for(bit = 0x8000 ; bit > 0 ; bit = bit >> 1) {
    if (blocks & bit) {
      fn(x + col, y + row);
    }
    if (++col === 4) {
      col = 0;
      ++row;
    }
  }
};

//-----------------------------------------------------
// check if a piece can fit into a position in the grid
//-----------------------------------------------------
function occupied(type, x, y, dir) {
  var result = false;

  eachblock(type, x, y, dir, function(x, y) {
    if ((x < 0) || (x >= nx) || (y < 0) || (y >= ny) || getBlock(x,y)) {
      result = true;
    }
  });

  return result;
};

function unoccupied(type, x, y, dir) {
  return !occupied(type, x, y, dir);
};

function hitTheGround(type, x, y, dir) {
  var result = false;
  eachblock(type, x, y, dir, function(x, y) {
    if ((y < 0) || (y >= ny) || getBlock(x, y)) {
      result = true;
    }
  });

  return result;
}

//-----------------------------------------
// start with 4 instances of each piece and
// pick randomly until the 'bag is empty'
//-----------------------------------------
var pieces = [];

function random(min, max) {
  return (min + (Math.random() * (max - min)));
};

function randomPiece() {
  if (pieces.length == 0)
    pieces = [i,i,i,i,j,j,j,j,l,l,l,l,o,o,o,o,s,s,s,s,t,t,t,t,z,z,z,z];
  var type = pieces.splice(random(0, pieces.length-1), 1)[0];

  return { type: type, dir: DIR.UP, x: Math.round(random(0, nx - type.size)), y: 0 };
};


//-------------------------------------------------------------------------
// GAME LOOP
//-------------------------------------------------------------------------

function run() {
  play();
  tick(); // start the first frame

  setInterval(tick, 100);
};

function tick() {
  console.log('tick');
  update(100 / 1000);
  io.sockets.emit('tick', { blocks: blocks, current: current });
};

//-------------------------------------------------------------------------
// GAME LOGIC
//-------------------------------------------------------------------------

function play() {
  reset();
  playing = true;
};

function lose() {
  console.log('lose');
  playing = false;
};

function clearRows() {
  setRows(0);
};

function setRows(n) {
  rows = n;
  step = Math.max(speed.min, speed.start - (speed.decrement*rows));
};

function addRows(n) {
  setRows(rows + n);
};

function getBlock(x,y) {
  return (blocks && blocks[x] ? blocks[x][y] : null);
};

function setBlock(x,y,type)     {
  blocks[x] = blocks[x] || [];
  blocks[x][y] = type;
};

function clearBlocks() {
  blocks = [];
};

function clearActions() {
  actions = [];
};

function setCurrentPiece(piece) {
  current = piece || randomPiece();
};

function setNextPiece(piece) {
  next = piece || randomPiece();
};

function reset() {
  dt = 0;
  clearActions();
  clearBlocks();
  clearRows();
  setCurrentPiece(next);
  setNextPiece();
};

function update(idt) {
  if (playing) {
    handle(actions.shift());
    dt = dt + idt;
    if (dt > step) {
      dt = dt - step;
      drop();
    }
  }
};

function handle(action) {
  switch(action) {
    case DIR.LEFT:  move(DIR.LEFT);  break;
    case DIR.RIGHT: move(DIR.RIGHT); break;
    case DIR.UP:    rotate();        break;
    case DIR.DOWN:  drop();          break;
  }
};

function move(dir) {
  var x = current.x, y = current.y;

  switch(dir) {
    case DIR.RIGHT: x = x + 1; break;
    case DIR.LEFT:  x = x - 1; break;
    case DIR.DOWN:  y = y + 1; break;
  }

  if (unoccupied(current.type, x, y, current.dir)) {
    current.x = x;
    current.y = y;

    return true;
  }

  // HACK Return null if the piece hits the ground
  //   so that we can distinguish between other collision
  else {
    return false;
  }
};

function rotate(dir) {
  var newdir = (current.dir == DIR.MAX ? DIR.MIN : current.dir + 1);
  if (unoccupied(current.type, current.x, current.y, newdir)) {
    current.dir = newdir;
  }
};

function drop() {
  if (!move(DIR.DOWN)) {
    // Make sure it cannot move because hitting the ground
    if (hitTheGround(current.type, current.x, current.y + 1, current.dir)) {
      dropPiece();
      removeLines();
      setCurrentPiece(next);
      setNextPiece(randomPiece());
      clearActions();
      if (occupied(current.type, current.x, current.y, current.dir)) {
        lose();
      }
    }
  }
};

function dropPiece() {
  eachblock(current.type, current.x, current.y, current.dir, function(x, y) {
    setBlock(x, y, true);
  });
};

function removeLines() {
  var x, y, complete, n = 0;
  for(y = ny ; y > 0 ; --y) {
    complete = true;
    for(x = 0 ; x < nx ; ++x) {
      if (!getBlock(x, y))
        complete = false;
    }
    if (complete) {
      removeLine(y);
      y = y + 1; // recheck same line
      n++;
    }
  }
  if (n > 0) {
    addRows(n);
  }
};

function removeLine(n) {
  var x, y;
  for(y = n ; y >= 0 ; --y) {
    for(x = 0 ; x < nx ; ++x)
      setBlock(x, y, (y == 0) ? null : getBlock(x, y-1));
  }
};

run();
