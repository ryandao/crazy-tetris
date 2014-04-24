window.myRootRef = new Firebase('https://real-time-tetris.firebaseio.com/');
window.blockList = new Firebase('https://real-time-tetris.firebaseio.com/blocks');
window.userList = new Firebase('https://real-time-tetris.firebaseio.com/users')

userList.on('value', function(snapshot) {
  window.userData = snapshot.val();
});

// Conenct user to Firebase
window.user = userList.push(null);
window.userID = user.name();

// If user is disconnected, remove from Firebase
user.onDisconnect().remove();