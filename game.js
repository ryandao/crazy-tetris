//-------------------------------------------------------------------------
// game constants
//-------------------------------------------------------------------------

var speed   = { start: 600, decrement: 50, min: 100 }, // how long before piece drops by 1 row (milliseconds)
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
    next,          // the next piece
    rows,          // number of completed rows in the current game
    step;          // how long before current piece drops by 1 row

//-------------------------------------------------------------------------
// Multiplayer server setup
//-------------------------------------------------------------------------

var http = require('http');
var io = require('socket.io').listen(http.createServer().listen(8080));
var MAX_CLIENTS = 10; // quality control
var colors = ['cyan', 'blue', 'orange', 'green', 'purple', 'red', 'yellow'];
var currentPieces = {};
var nextPieces = {};

io.sockets.on('connection', function (socket) {
  var sId = socket.id;
  currentPiece = randomPiece();
  currentPieces[sId] = currentPiece;

  // Let the client know its sid and color, and the current blocks
  socket.emit('connectionAck', {
    sId: sId,
    blocks: blocks,
    currentPieces: currentPieces
  });

  socket.on('userAction', function(action) {
    actions = actions ? actions : {};
    actions[sId] = actions[sId] ? actions[sId] : [];
    actions[sId].push(action);
  });
});


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

//-------------------------------------------------------------------------
// Helper methods
//-------------------------------------------------------------------------

/**
 * Do the bit manipulation and iterate through each
 * occupied block (x,y) for a given piece
 */
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

/**
 * Check if a piece can fit into a position in the grid
 */
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

// TODO: Clean up this mess.
function occupiedPlayerBlock(type, x, y, dir, sId) {
  var result = false;

  eachblock(type, x, y, dir, function(x, y) {
    for (var psId in currentPieces) {
      if (currentPieces.hasOwnProperty(psId) && psId !== sId) {
        var piece = currentPieces[psId];

        eachblock(piece.type, piece.x, piece.y, piece.dir, function(px, py) {
          if (px === x && py === y) {
            result = true;
          }
        });

        if (result) { break; }
      }
    }
  });

  return result;
}


function hitTheGround(type, x, y, dir) {
  var result = false;
  eachblock(type, x, y, dir, function(x, y) {
    if ((y < 0) || (y >= ny) || getBlock(x, y)) {
      result = true;
    }
  });

  return result;
}

function random(min, max) {
  return (min + (Math.random() * (max - min)));
};

var pieces = [];

/**
 * Generate a random tetris piece.
 * To ensure fairness, start with 4 instances of each piece and,
 * pick randomly until the bag is empty.
 */
function randomPiece() {
  if (pieces.length == 0) {
    pieces = [i,i,i,i,j,j,j,j,l,l,l,l,o,o,o,o,s,s,s,s,t,t,t,t,z,z,z,z];
  }

  var type = pieces.splice(random(0, pieces.length-1), 1)[0];
  return { type: type, dir: DIR.UP, x: Math.round(random(0, nx - type.size)), y: 0 };
};

//-------------------------------------------------------------------------
// GAME LOOP
//-------------------------------------------------------------------------

function run() {
  play();
  tick(); // start the first frame
  setInterval(tick, 16);
};

function tick() {
  update(16);
  io.sockets.emit('tick', { blocks: blocks, currentPieces: currentPieces });
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

function clearActions(sId) {
  if (sId) {
    actions[sId] = [];
  } else {
    actions = {};
  }
};

function setCurrentPiece(sId, piece) {
  currentPieces[sId] = piece || randomPiece();
};

function resetCurrentPieces() {
  for (var sId in currentPieces) {
    if (currentPieces.hasOwnProperty(sId)) {
      setCurrentPiece(sId, randomPiece());
    }
  }
}

function reset() {
  dt = 0;
  step = speed.start;
  clearActions();
  clearBlocks();
  clearRows();
  resetCurrentPieces();
};

function update(idt) {
  if (playing) {
    handleActions();
    dt = dt + idt;
    if (dt > step) {
      dt = dt - step;
      dropAll();
    }
  }
};

function handleActions() {
  for (var sId in actions) {
    if (actions.hasOwnProperty(sId)) {
      handle(actions[sId].shift(), currentPieces[sId], sId);
    }
  }
};

function handle(action, piece, sId) {
  switch(action) {
    case DIR.LEFT:  move(DIR.LEFT, piece, sId);  break;
    case DIR.RIGHT: move(DIR.RIGHT, piece, sId); break;
    case DIR.UP:    rotate(piece, sId); break;
    case DIR.DOWN:  drop(piece, sId); break;
  }
};

function move(dir, piece, sId) {
  var x = piece.x, y = piece.y;

  switch(dir) {
    case DIR.RIGHT: x = x + 1; break;
    case DIR.LEFT:  x = x - 1; break;
    case DIR.DOWN:  y = y + 1; break;
  }

  if (unoccupied(piece.type, x, y, piece.dir) && ! occupiedPlayerBlock(piece.type, x, y, piece.dir, sId)) {
    piece.x = x;
    piece.y = y;

    return true;
  }

  // HACK Return null if the piece hits the ground
  //   so that we can distinguish between other collision
  else {
    return false;
  }
};

function rotate(piece, sId) {
  var newdir = (piece.dir == DIR.MAX ? DIR.MIN : piece.dir + 1);
  if (unoccupied(piece.type, piece.x, piece.y, newdir) &&
      ! occupiedPlayerBlock(piece.type, piece.x, piece.y, newdir, sId)) {
    piece.dir = newdir;
  }
};

function drop(piece, sId) {
  if (!move(DIR.DOWN, piece, sId)) {
    // Make sure it cannot move because hitting the ground
    if (hitTheGround(piece.type, piece.x, piece.y + 1, piece.dir)) {
      dropPiece(piece);
      removeLines();
      setCurrentPiece(sId, randomPiece());
      clearActions(sId);
      // if (occupied(piece.type, piece.x, piece.y, piece.dir)) {
      //   lose();
      // }
    }
  }
};

function dropAll() {
  for (var sId in currentPieces) {
    if (currentPieces.hasOwnProperty(sId)) {
      drop(currentPieces[sId], sId);
    }
  }
}

function dropPiece(piece) {
  eachblock(piece.type, piece.x, piece.y, piece.dir, function(x, y) {
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
