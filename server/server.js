var http = require('http');
var socket = require('socket.io');
var fs = require('fs');
var _ = require('underscore');

var handler = function(req, res) {
  fs.readFile(__dirname + '/../client/index.html', function(err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }

    res.writeHead(200);
    res.end(data);
  });
};

var app = http.createServer(handler);
var io = socket.listen(app);

app.listen(8080);

var clients = {};
var blocks = [];
var gameData = {
  nx: 40, // width of tetris court (in blocks)
  ny: 20, // height of tetris court (in blocks)
};
var MAX_CLIENTS = 10; // quality control
var colors = ['cyan', 'blue', 'orange', 'green', 'purple', 'red', 'yellow'];

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
  clients[sId] = {};
  clients[sId].socket = socket;
  clients[sId].currentPiece = {};

  // Let the client know its sid and color, and the current blocks
  socket.emit('connectionAck', {
    sId: sId,
    color: getNextColor(),
    blocks: blocks
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
});