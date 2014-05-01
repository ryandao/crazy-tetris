(function() {
  window.Renderer = function(canvas) {
    //-------------------------------------------------------------------------
    // game constants
    //-------------------------------------------------------------------------

    var nx = 20, // width of tetris court (in blocks)
        ny = 20, // height of tetris court (in blocks)
        ctx = canvas.getContext('2d'),
        myColor = 'green',
        allyColor = 'yellow',
        foeColor = 'red',
        blockColor = 'gray';

    //-------------------------------------------------------------------------
    // game variables (initialized during reset)
    // TODO: Take this from the game logic configuration part.
    //-------------------------------------------------------------------------

    var dx, dy,        // pixel size of a single tetris block
        blocks,        // 2 dimensional array (nx*ny) representing tetris court - either empty block or occupied by a 'piece'
        actions,       // queue of user actions (inputs)
        playing= true, // true|false - game is in progress
        dt,            // time since starting this game
        currentPieces, // the list of current pieces of all players
        next,          // the next piece
        rows,          // number of completed rows in the current game
        step,          // how long before current piece drops by 1 row
        pid;           // the pid of the player's piece

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

    var i = { id: 'i', size: 4, blocks: [0x0F00, 0x2222, 0x00F0, 0x4444] };
    var j = { id: 'j', size: 3, blocks: [0x44C0, 0x8E00, 0x6440, 0x0E20] };
    var l = { id: 'l', size: 3, blocks: [0x4460, 0x0E80, 0xC440, 0x2E00] };
    var o = { id: 'o', size: 2, blocks: [0xCC00, 0xCC00, 0xCC00, 0xCC00] };
    var s = { id: 's', size: 3, blocks: [0x06C0, 0x8C40, 0x6C00, 0x4620] };
    var t = { id: 't', size: 3, blocks: [0x0E40, 0x4C40, 0x4E00, 0x4640] };
    var z = { id: 'z', size: 3, blocks: [0x0C60, 0x4C80, 0xC600, 0x2640] };

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

    function setPid(_pid) {
      pid = _pid;
    }

    function setBlocks(_blocks) {
      blocks = _blocks;
    };

    function setCurrentPieces(_currentPiences) {
      currentPieces = _currentPiences;
    };

    function setPlaying(_playing) {
      playing = _playing;
    }

    function resize() {
      canvas.width   = canvas.clientWidth;  // set canvas logical size equal to its physical size
      canvas.height  = canvas.clientHeight; // (ditto)
      dx = canvas.width  / nx; // pixel size of a single tetris block
      dy = canvas.height / ny; // (ditto)
      invalidate();
      invalidateNext();
    };

    //-------------------------------------------------------------------------
    // RENDERING
    //-------------------------------------------------------------------------

    var invalid = {};

    function invalidate()         { invalid.court  = true; }
    function invalidateNext()     { invalid.next   = true; }
    function invalidateRows()     { invalid.rows   = true; }

    function getBlock(x,y) {
      return (blocks && blocks[x] ? blocks[x][y] : null);
    };

    function draw() {
      ctx.save();
      ctx.lineWidth = 1;
      ctx.translate(0.5, 0.5); // for crisp 1px black lines
      drawCourt();
      // drawNext();
      // drawRows();
      ctx.restore();
    };

    function drawFrame() {
      invalidate();
      draw();
    }

    function drawCourt() {
      var x, y, block;

      if (invalid.court) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (playing) {
          // Draw all players' pieces
          for (var _pid in currentPieces) {
            if (currentPieces.hasOwnProperty(_pid)) {
              var piece = currentPieces[_pid];
              var color;
              if (_pid === pid) {
                color = myColor;
              } else {
                color = allyColor;
              }

              drawPiece(ctx, piece.type, piece.x, piece.y, piece.dir, color);
            }
          }
        }

        for(y = 0 ; y < ny ; y++) {
          for (x = 0 ; x < nx ; x++) {
            if (block = getBlock(x, y))
              drawBlock(ctx, x, y, blockColor);
          }
        }

        ctx.strokeRect(0, 0, nx*dx - 1, ny*dy - 1); // court boundary
        invalid.court = false;
      }
    };

    function drawPiece(ctx, type, x, y, dir, color) {
      eachblock(type, x, y, dir, function(x, y) {
        drawBlock(ctx, x, y, color);
      });
    };

    function drawBlock(ctx, x, y, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x*dx, y*dy, dx, dy);
      ctx.strokeRect(x*dx, y*dy, dx, dy)
    };

    // public declaration
    this.setPid = setPid;
    this.setBlocks = setBlocks;
    this.setCurrentPieces = setCurrentPieces;
    this.setPlaying = setPlaying;
    this.ctx = ctx;
    this.drawFrame = drawFrame;
    this.resize = resize;
  };
})();
