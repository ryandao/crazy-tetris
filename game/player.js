(function() {
  var Player = function(_gameLogic, _id, _playerType) {
    var PLAYER_TYPE = { BUILDER: 0, DESTROYER: 1 };
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

  var DestroyerAI = function(gameLogic, piece) {
    var DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3 };

    var run = function() {
      var actions = getActions();
      for (var i = 0; i < actions.length; i++) {
        gameLogic.addAction(actions[i], piece.pid);
      }
    };

    var getActions = function() {
      var actions = [];
      for (var i = 0; i < gameLogic.ny; i++) {
        actions.push(DIR.DOWN);
      }

      return actions;
    };

    // Public declaration
    this.run = run;
  };

  exports.Player = Player;
  exports.DestroyerAI = DestroyerAI;
})();
