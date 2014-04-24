var socket = io.connect('http://localhost:8080');
window.userPieces = {};

socket.on('connectionAck', function(data) {
  window.sId = data.sId;
  window.color = data.color;
  // window.blocks = data.blocks;

  // Run the game
  run();
});

socket.on('otherPlayerPieceChanged', function(data) {
  _.extend(window.userPieces, data);
});