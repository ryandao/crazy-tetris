var _ = require('underscore');
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

  // Let the client know its sid and game configuration.
  socket.emit('connectionAck', _.extend({ sId: sId}, gameLogic.getGameConfig()));

  // Start the game for the client.
  socket.on('play', function(playerType) {
    player = new Player(gameLogic, sId, parseInt(playerType));
    gameLogic.addPlayer(player);
    socket.emit('playACK');
  });

  // Handle user action
  socket.on('userAction', function(action) {
    player.addAction(action);
  });

  // If client disconnects, remove the player.
  socket.on('disconnect', function() {
    console.log('disconnect');
    gameLogic.removePlayer(sId);
  });
});

function run() {
  gameLogic.onEndGame = function(winningPlayerType) {
    var players = gameLogic.getPlayers();
    for (var i = 0; i < players.length; i++) {
      var msg = players[i].playerType === winningPlayerType ? 'win' : 'lost';
      io.sockets.socket(players[i].id).emit(msg);
    }

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
