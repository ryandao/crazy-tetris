(function() {
  exports.DestroyerAI = function(gameLogic, pid) {
    var DIR = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3, MIN: 0, MAX: 3 };

    var run = function() {
      var actions = getActions();
      for (var i = 0; i < actions.length; i++) {
        gameLogic.addAction(actions[i], pid);
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
})();
