(function() {
  var KEY = { ESC: 27, SPACE: 32, LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40 };
  var DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3 };
  var renderer = new Renderer(document.getElementById('canvas'));
  window.renderer = renderer;
  var socket = io.connect('http://localhost:8080');
  var sId;

  socket.on('connectionAck', function(data) {
    sId = data.sId;
    run();
  });

  function run() {
    addEvents(); // attach keydown and resize events
    renderer.resize();
    renderer.drawFrame();

    socket.on('tick', function(data) {
      renderer.setBlocks(data.blocks);
      renderer.setCurrentPieces(data.currentPieces);
      renderer.drawFrame();
    });
  };

  function addEvents() {
    document.addEventListener('keydown', keydown, false);
    window.addEventListener('resize', renderer.resize, false);
  };

  function keydown(ev) {
    switch(ev.keyCode) {
      case KEY.LEFT:   sendAction(DIR.LEFT); break;
      case KEY.RIGHT:  sendAction(DIR.RIGHT); break;
      case KEY.UP:     sendAction(DIR.UP); break;
      case KEY.DOWN:   sendAction(DIR.DOWN); break;
      case KEY.ESC:    lose(); break;
    }

    ev.preventDefault(); // prevent arrow keys from scrolling the page (supported in IE9+ and all other browsers)
  };

  function sendAction(action) {
    socket.emit('userAction', action);
  }
})();
