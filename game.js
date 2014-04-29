var http = require('http');
var _ = require('underscore');
var io = require('socket.io').listen(http.createServer().listen(8080));
var MAX_CLIENTS = 10; // quality control
var colors = ['cyan', 'blue', 'orange', 'green', 'purple', 'red', 'yellow'];
var gameLogic = new (require('./game/game_logic').GameLogic)();
var fps = 60;

io.sockets.on('connection', function (socket) {
  var sId = socket.id;
  gameLogic.setRandomPiece(sId);

  // Let the client know its sid, and the current game state.
  // TODO: No need to push game state.
  socket.emit('connectionAck', _.extend({ sId: sId }, gameLogic.getGameState()));

  // Handle user action
  socket.on('userAction', function(action) {
    gameLogic.addAction(action, sId);
  });
});

function run() {
  gameLogic.play();
  tick(); // start the first frame
  setInterval(tick, 1000 / fps);
};

function tick() {
  gameLogic.update(1000 / fps);
  io.sockets.emit('tick', gameLogic.getGameState());
};

run();
