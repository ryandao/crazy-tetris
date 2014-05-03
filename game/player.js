(function() {
  var PLAYER_TYPE = { BUILDER: 0, DESTROYER: 1 };

  var Player = function(_gameLogic, _id, _playerType) {
    var id = _id,
        gameLogic = _gameLogic,
        playerType = _playerType ? _playerType : PLAYER_TYPE.BUILDER,
        actions = [],
        piece;

    var getPiece = function() {
      return piece;
    };

    var setPiece = function(_piece) {
      piece = _piece;
    };

    var addAction = function(action) {
      actions.push(action);
    };

    var getActions = function() {
      return actions;
    };

    var clearActions = function() {
      actions = [];
    };

    this.PLAYER_TYPE = PLAYER_TYPE;
    this.id = id;
    this.getActions = getActions;
    this.playerType = playerType;
    this.getPiece = getPiece;
    this.setPiece = setPiece;
    this.addAction = addAction;
    this.clearActions = clearActions;
  };

  var DestroyerAI = function(_gameLogic, _piece) {
    var DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3 };
    Player.call(this, _gameLogic, _piece, PLAYER_TYPE.DESTROYER);

    // Override
    this.getActions = function() {
      var actions = [];
      for (var i = 0; i < _gameLogic.ny; i++) {
        actions.push(DIR.DOWN);
      }

      return actions;
    };
  };

  var tmp = function() {};
  tmp.prototype = Player.prototype;
  DestroyerAI.prototype = new tmp();
  DestroyerAI.prototype.constructor = DestroyerAI;

  exports.Player = Player;
  exports.DestroyerAI = DestroyerAI;
})();
