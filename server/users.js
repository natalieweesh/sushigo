let users = [];

// Map of usernames to timeout IDs. When user disconnects, schedule
// removal here. When user reconnects within time limit, remove entry.
let pendingRemovals = {};

const addUser = ({ id, name, room }) => {
  name = name.trim().toLowerCase();
  room = room.trim().toLowerCase();

  const existingUser = users.find((user) => user.room === room && user.name === name);
  // users can claim their username
  if (existingUser) {
    console.log('found existing user', name, room)
    let timeoutId = pendingRemovals[existingUser.name];
    console.log('there is an existing user with that name', existingUser)
    if (timeoutId !== undefined) {
      console.log('delete the pending remova for that user')
      clearTimeout(timeoutId);
      delete pendingRemovals[existingUser.name];
    }

    // Note that this allows account takeovers. Have fun!
    // existingUser.id = id;
    users.find((u) => u.room === room && u.name === name).id = id;
    // return { user: existingUser }
    return { user: users.find((u) => u.room === room && u.name === name) }
  } else {
    console.log('did not find existing user', name, room)
  }

  const usersInRoom = getUsersInRoom(room).length;
  if (usersInRoom > 0 && checkAllReadyToPlay(room)) {
    return { error: 'Sorry, that game already started! Please join a new game' }
  }
  const user = { id, name, room,
    readyToPlay: false,
    orderIndex: usersInRoom,
    answerSubmitted: false,
    readyToRestart: false,
  };
  console.log('adding a new user', user)
  users.push(user);
  return { user };
}

const scheduleRemoveUser = (socketId) => {
  let userToRemove = users.find((user) => user.id === socketId);

  if (userToRemove === undefined) {
    return
  }

  let timeoutId = setTimeout(() => {
    console.log('removing this user for real', userToRemove.name, userToRemove.id)
    removeUserByUsername(userToRemove.name);
    delete pendingRemovals[userToRemove.name];
  }, 600000) // after 10 minutes
  pendingRemovals[userToRemove.name] = timeoutId;

  return userToRemove;
}

const removeUserByUsername = (username) => {
  const index = users.findIndex((user) => user.name === username);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

const getUser = (id) => users.find((user) => user.id === id);

const getUsersInRoom = (room) => users.filter((user) => user.room === room).sort((a, b) => a.orderIndex - b.orderIndex);

const shuffleAndGetUsersInRoom = (room) => {
  const roomUsers = users.filter((u) => u.room === room);
  console.log('users before', roomUsers)
  const numUsers = roomUsers.length;
  let randomNums = [];
  for (let i=0; i<numUsers; i++) {
    randomNums.push(i);
  }
  for (let j=0; j < numUsers; j++) {
    const r = Math.floor(Math.random() * randomNums.length);
    const randIdx = randomNums[r];
    const userId = roomUsers[j]['id'];
    users.find((u) => u.id === userId).orderIndex = randIdx;
    randomNums.splice(r, 1);
  }
  console.log('users after', users.filter((u) => u.room === room));
  return users.filter((u) => u.room === room).sort((a, b) => a.orderIndex - b.orderIndex);
}

const setUserSubmitted = (id) => {
  console.log('setUserSubmitted: id', id)
  let myUser = users.find((user) => {
    user.id === id
  })
  users.find((user) => user.id === id).answerSubmitted = true;
  console.log('myuser', myUser)
}

const setAllUsersNotSubmitted = (room) => {
  users.filter((user) => user.room === room).map((u) => u.answerSubmitted = false);
}

const setReadyToPlay = (id) => {
  console.log('setReadyToPlay: id', id)
  let myUser = users.find((user) => {
    user.id === id
  })
  users.find((user) => user.id === id).readyToPlay = true;
  console.log(users.find((user) => user.id === id).readyToPlay)
  console.log('myuser', myUser)
}

const setReadyToRestart = (id) => {
  users.find((user) => user.id === id).readyToRestart = true;
  console.log(users.find((user) => user.id === id).readyToRestart)
}

const setAllNotReadyToRestart = (room) => {
  users.filter((user) => user.room === room).map((u) => u.readyToRestart = false);
}

const checkAllReadyToPlay = (room) => {
  const usersInRoom = users.filter((user) => user.room === room).length;
  const usersReadyToPlay = users.filter((user) => user.room === room && user.readyToPlay).length;
  console.log('all players in room are ready to play', usersInRoom === usersReadyToPlay)
  return usersInRoom === usersReadyToPlay;
}

const checkAllReadyToRestart = (room) => {
  const usersInRoom = users.filter((user) => user.room === room).length;
  const usersReadyToRestart = users.filter((user) => user.room === room && user.readyToRestart).length;
  console.log('all players in room are ready to restart', usersInRoom === usersReadyToRestart)
  return usersInRoom === usersReadyToRestart;
}

const checkAllSubmitted = (room) => {
  const usersInRoom = users.filter((user) => user.room === room).length;
  const usersAllSubmitted = users.filter((user) => user.room === room && user.answerSubmitted).length;
  console.log('all players in room have submitted', usersInRoom === usersAllSubmitted)
  return usersInRoom === usersAllSubmitted;
}

module.exports = { addUser, getUser, getUsersInRoom, setReadyToPlay, setReadyToRestart, setAllNotReadyToRestart, checkAllReadyToPlay, checkAllReadyToRestart, scheduleRemoveUser, removeUserByUsername, shuffleAndGetUsersInRoom, setUserSubmitted, checkAllSubmitted, setAllUsersNotSubmitted };