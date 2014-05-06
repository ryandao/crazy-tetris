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

    var addActions = function(_actions) {
      actions = actions.concat(_actions);
    };

    // This is called by the game for every game step
    // to get the list of actions the player's made.
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
    this.addActions = addActions;
    this.clearActions = clearActions;
  };

  var DestroyerAI = function(_gameLogic, _piece) {
    var DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3 };
    var STEPS_PER_ACTION = 4; // number of game steps before an action is taken.
    var cur = 0, last = 0;

    // Initialization
    Player.call(this, _gameLogic, _piece, PLAYER_TYPE.DESTROYER);

    // Override
    this.getActions = function() {
      cur ++;
      if (cur - last == STEPS_PER_ACTION) {
        last = cur;
        return [DIR.DOWN];
      } else {
        return [];
      }
    };
  };

  // Inheritance
  var tmp = function() {};
  tmp.prototype = Player.prototype;
  DestroyerAI.prototype = new tmp();
  DestroyerAI.prototype.constructor = DestroyerAI;

  exports.Player = Player;
  exports.DestroyerAI = DestroyerAI;
})();
