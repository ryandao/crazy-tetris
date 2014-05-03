var http = require('http');
var io = require('socket.io').listen(http.createServer().listen(8080));
var MAX_CLIENTS = 10; // quality control
var colors = ['cyan', 'blue', 'orange', 'green', 'purple', 'red', 'yellow'];
var Player = require('./game/player').Player;
var DestroyerAI = require('./game/player').DestroyerAI;
var gameLogic = new (require('./game/game_logic').GameLogic)();
var fps = 60;

io.sockets.on('connection', function (socket) {
  var sId = socket.id;
  var player;

  // Let the client know its sid.
  socket.emit('connectionAck', { sId: sId });

  // Start the game for the client.
  socket.on('play', function(playerType) {
    player = new Player(gameLogic, sId, playerType);
    gameLogic.addPlayer(player);
    socket.emit('playACK');
  });

  // Handle user action
  socket.on('userAction', function(action) {
    player.addAction(action);
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
