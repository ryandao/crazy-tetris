(function() {
  var KEY = { ESC: 27, SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 };
  var DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3 };
  var renderer = new Renderer(document.getElementById('canvas'));
  var socket = io.connect('http://localhost:8080');
  var connected = false;

  // Debug logger
  (function() {
    var emit = socket.emit;
    socket.emit = function() {
      console.log('***','emit', Array.prototype.slice.call(arguments));
      emit.apply(socket, arguments);
    };
  })();

  socket.on('connectionAck', function(data) {
    renderer.setPid(data.sId);
    connected = true;
  });

  socket.on('disconnect', function() {
    connected = false;
  });

  socket.on('playACK', function() {
    run();
  });

  document.getElementById('play-btn').addEventListener('click', function() {
    if (connected) {
      var playerType = document.getElementById('player-select').value;
      socket.emit('play', playerType);
    } else {
      alert("Connection to game server was unsuccessful.");
    }
  });

  function run() {
    var playing = true;
    var dataDirty = false;
    var actionClean = false;

    var tick = function() {
      if (playing) {
        if (dataDirty) {
          renderer.drawFrame();
          dataDirty = false;
        }

        requestAnimationFrame(tick);
      }
    };

    addEvents(); // attach keydown and resize events
    renderer.resize();
    requestAnimationFrame(tick);

    socket.on('tick', function(data) {
      renderer.setBlocks(data.blocks);
      renderer.setPlayerPieces(data.playerPieces);
      dataDirty = true;
    });

    socket.on('lost', function() {
      playing = false;
      alert('You lose!');
    });

    socket.on('win', function() {
      renderer.setPlaying(false);
      alert('You win!');
    })
  };

  function addEvents() {
    addActionListener();
    window.addEventListener('resize', renderer.resize, false);
  };

  function addActionListener() {
    var actions = [];
    var addToActions = function(ev) {
      switch(ev.keyCode) {
        case KEY.LEFT:   actions.push(DIR.LEFT); break;
        case KEY.RIGHT:  actions.push(DIR.RIGHT); break;
        case KEY.UP:     actions.push(DIR.UP); break;
        case KEY.DOWN:   actions.push(DIR.DOWN); break;
      }

      ev.preventDefault();
    };

    // Debounce the action listeners so that consecutive actions
    // will only be sent once to save bandwidth.
    // TODO: Add client prediction to make the animation smooth.
    var keydown = (function() {
      var timeout;
      var func = function() {
        if (actions.length !== 0) {
          sendAction(actions);
          actions = [];
        }
      }

      return function(ev) {
        var _this = this;
        addToActions(ev);

        var later = function() {
          timeout = null;
          func.call();
        }

        var callNow = ! timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, 16);
        if (callNow) {
          func.call();
        }
      }
    })();

    document.addEventListener('keydown', keydown, false);
  };

  function sendAction(actions) {
    socket.emit('userAction', actions);
  };
})();
