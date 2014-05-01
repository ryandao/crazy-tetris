var http = require('http');
var io = require('socket.io').listen(http.createServer().listen(8080));
var MAX_CLIENTS = 10; // quality control
var colors = ['cyan', 'blue', 'orange', 'green', 'purple', 'red', 'yellow'];
var gameLogic = new (require('./game/game_logic').GameLogic)();
var fps = 60;
var clientCount = 0;

io.sockets.on('connection', function (socket) {
  clientCount ++;
  var playerType = (clientCount % 2 === 0) ? gameLogic.PLAYER.BUILDER : gameLogic.PLAYER.DESTROYER;
  console.log(playerType);
  var sId = socket.id;
  gameLogic.setRandomPiece(sId, playerType);

  // Let the client know its sid.
  socket.emit('connectionAck', { sId: sId });

  // Handle user action
  socket.on('userAction', function(action) {
    gameLogic.addAction(action, sId);
  });
});

function run() {
  gameLogic.onLose = function() {
    io.sockets.emit('lose', null);
    clearInterval(interval);
  };

  gameLogic.play();
  tick(); // start the first frame
  var interval = setInterval(tick, 1000 / fps);
};

function tick() {
  gameLogic.update(1000 / fps);
  io.sockets.emit('tick', gameLogic.getGameState());
};

run();
