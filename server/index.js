const express = require('express');
// const Sentry = require('@sentry/node');
const socketio = require('socket.io');
const http = require('http');
const cors = require('cors');

const { addUser, getUser, getUsersInRoom, setReadyToPlay, setReadyToRestart, setAllNotReadyToRestart, checkAllReadyToPlay, checkAllReadyToRestart, scheduleRemoveUser, setUserSubmitted, checkAllSubmitted, setAllUsersNotSubmitted } = require('./users.js');
const { addGame, getGame, restartGame, removeGame, scheduleRemoveGame, nextTurn, dealCards, updateTile, rollDice, endGame, updateCard, nextRound, notNextRound, checkRoundFinished, updateScore, updatePuddingCount } = require('./games.js');

const PORT = process.env.PORT || 5000;

const router = require('./router');
const { ENGINE_METHOD_PKEY_ASN1_METHS } = require('constants');

const app = express();

// Sentry.init({ dsn: 'https://e056aabec1b343c58f3b1ce6ee82ca89@o422420.ingest.sentry.io/5348508' });

// The request handler must be the first middleware on the app
// app.use(Sentry.Handlers.requestHandler());


const server = http.createServer(app);
const io = socketio(server);

const corsOptions = {
  origin: 'http://draw.nataliewee.com',
  optionsSuccessStatus: 200
}
app.options('*', cors())
app.use(cors(corsOptions));
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

 if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Max-Age', 120);
    return res.status(200).json({});
  }

  next();

});
app.use(router);
app.get("/status", (req, res) => {
  res.status(200).send({
    success: true
  })
})
// app.get('/debug-sentry', function mainHandler(req, res) {
//   throw new Error('My first Sentry error!');
// });

// app.use(Sentry.Handlers.errorHandler({
//   shouldHandleError(error) {
//     if (error.status >= 400 && error.status < 600) {
//       return true
//     }
//     return false
//   }
// }));


var shuffle = (array) => {
  var currentIndex = array.length;
  var temporaryValue, randomIndex;
  // While there remain elements to shuffle...
  while (0 !== currentIndex) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
};

io.on('connection', (socket) => {
  console.log('We have a new connection!!');
  
  socket.on('join', ({ name, room }, callback) => {
    try {
      console.log(`adding user with socket id: ${socket.id} name: ${name}, room: ${room}`)
      const { error, user } = addUser({ id: socket.id, name, room });

      if (error) return callback(error);

      socket.emit('message', { user: 'admin', message: `${user.name}, welcome to the room ${user.room}`, messages: [] });
      socket.broadcast.to(user.room).emit('message', { user: 'admin', message: `${user.name} has joined!` });

      socket.join(user.room);

      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
      io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) })

      callback();
    } catch (e) {
      console.log('error in join socket', e)
    }
  });

  socket.on('moveTile', ({el, x, y, settingUp}, callback) => {
    try {
      const user = getUser(socket.id);
      console.log('in movetile socket', user, el, x, y, settingUp)
      updateTile(user.room, el, x, y, user);
      io.to(user.room).emit('tileMoved', {room: user.room, el, x, y, user: user, settingUp: settingUp});
      // io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) })
      callback();
    } catch (e) {
      console.log('error in moveTile socket', e);
    }
  })

  socket.on('rollDice', (callback) => {
    try {
      const user = getUser(socket.id);
      rollDice(user.room);
      io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) })
    } catch (e) {
      console.log('error in rollDice socket', e);
    }
  })

  socket.on('showAllTiles', (callback) => {
    try {
      const user = getUser(socket.id);
      endGame(user.room);
      io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) });
    } catch (e) {
      console.log('error in showAllTiles', e);
    }
  })

  socket.on('setReadyToPlay', (callback) => {
    try {
      const user = getUser(socket.id);
      setReadyToPlay(socket.id);

      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

      //check if all users in room have set ready to play
      if (checkAllReadyToPlay(user.room)) {
        console.log("ALL USERS READY TO PLAY")
        io.to(user.room).emit('startGame', { room: user.room, users: getUsersInRoom(user.room) });
      } else {
        console.log("NOT ALL USERS READY TO PLAY")
      }

      callback();
    } catch (e) {
      console.log('error in setReadyToPlay socket', e)
    }
  })

  socket.on('submitTurn', ({cardsInHand, cardsInPile}, callback) => {
    try {
      const user = getUser(socket.id);
      setUserSubmitted(user.id);
      console.log("ORDER INDEX?", user.orderIndex)
      updateCard(user.room, user.orderIndex, cardsInHand, cardsInPile);
      if (checkAllSubmitted(user.room)) {
        if (checkRoundFinished(user.room)) {
          endGame(user.room);
          io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
          io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) })
          return;
        }
        nextRound(user.room);
        setAllUsersNotSubmitted(user.room);
      } else {
        notNextRound(user.room);
      }
      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
      io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) })
      callback();
    } catch (e) {
      console.log('error in submitTurn socket', e);
    }
  })

  socket.on('setReadyToRestart', ({cards}, callback) => {
    try {
      const user = getUser(socket.id);
      setReadyToRestart(socket.id);

      io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

      //check if all users in room have set ready to restart
      if (checkAllReadyToRestart(user.room)) {

        let prevScores = getGame(user.room).scores;
        let prevPuddings = getGame(user.room).puddingCounts;
        console.log('prevscores', prevScores)
        console.log('prevpuddings', prevPuddings)
        restartGame(user.room, getUsersInRoom(user.room));
        const games = addGame(user.room, getUsersInRoom(user.room), prevScores, prevPuddings)
        let currentGame = getGame(user.room);
        if (currentGame && currentGame.cards.length === 0) {
          dealCards(user.room, shuffle(cards));
        }
        io.to(user.room).emit('gameRestarted', {room: user.room, users: getUsersInRoom(user.room)})
        setAllNotReadyToRestart(user.room);
        if (!!games) {
          io.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });
          io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) })
        }
      }

      callback();

    } catch (e) {
      console.log('error in setReadyToRestart socket', e)
    }
  })

  socket.on('updateScore', ({userId, score}, callback) => {
    try {
      const user = getUser(socket.id);
      updateScore(user.room, userId, score);
      io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) })
    } catch (e) {
      console.log('error in updateScore socket', e)
    }
  })

  socket.on('updatePuddingCount', ({userId, puddingCount}, callback) => {
    try {
      const user = getUser(socket.id);
      updatePuddingCount(user.room, userId, puddingCount);
      io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) })
    } catch (e) {
      console.log('error in updatePuddingCount socket', e)
    }
  })

  socket.on('initiateGame', ({cards}, callback) => {
    try {
      const user = getUser(socket.id);
      const games = addGame(user.room, getUsersInRoom(user.room));
      let currentGame = getGame(user.room);
      if (currentGame && currentGame.cards.length === 0) {
        dealCards(user.room, shuffle(cards));
      }
      scheduleRemoveGame(user.room, getUsersInRoom)
      if (!!games) {
        callback();
      }
    } catch (e) {
      console.log('error in initiateGame socket', e)
    }
  })

  socket.on('restartGame', (callback) => {
    try {
      const user = getUser(socket.id);
      let prevScores = getGame(user.room).scores;
      let prevPuddings = getGame(user.room).puddingCounts;
      console.log('prevscores', prevScores)
      console.log('prevpuddings', prevPuddings)
      restartGame(user.room, getUsersInRoom(user.room));
      const games = addGame(user.room, getUsersInRoom(user.room), prevScores, prevPuddings)
      io.to(user.room).emit('gameRestarted', {room: user.room, users: getUsersInRoom(user.room)})
      if (!!games) {
        callback();
      }
    } catch (e) {
      console.log('error in restartGame socket', e)
    }
  })

  socket.on('fetchGame', (callback) => {
    try {
      const user = getUser(socket.id)

      io.to(user.room).emit('gameStatus', { room: user.room, game: getGame(user.room) })

      callback();
    } catch (e) {
      console.log('error in fetchGame socket', e)
    }
  })

  socket.on('disconnect', ({messages}, callback) => {
    try {
      const user = scheduleRemoveUser(socket.id);

      if (user) {
        console.log('disconnect user', user.name, socket.id)
        if (getUsersInRoom(user.room).length === 0) { //there is a room and you are the only user left
          console.log('remove the last user from the room')
          removeGame(user.room)
        } else {
          console.log('there are still ppl in the room', user.name, user.room)
          io.to(user.room).emit('message', {user: 'admin', message: `${user.name} has left`, messages: messages})
        }
      }
    } catch (e) {
      console.log('error in disconnect socket', e)
    }
  });

  socket.on('frontEndReconnect', ({name, room}, callback) => {
    try {
      console.log('try to reconnect from the front end now!', name, room)
    } catch (e) {
      console.log('error in frontEndReconnect socket', e)
    }
  })

  socket.on('reconnect', () => {
    try {
      console.log('reconnect now!', socket.id)
    } catch (e) {
      console.log('error in reconnect socket', e)
    }
  })
})

server.listen(PORT, () => console.log(`Server has started on port ${PORT}`));
