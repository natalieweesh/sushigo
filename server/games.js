let games = [];

// map of room names to interval IDs
let pendingRemovals = {};

const addGame = (room, users, scores, puddingCounts) => {
  
  // console.log('room', room)
  // console.log('find anything?', games.find((game) => game.id == room))
  if (games.find((game) => game.id == room)) {
    console.log('already started game with id', room)
    return;
  }
  const newCards = [];
  const newGame = {
    id: room,
    cards: newCards,
    hands: [],
    piles: [],
    newRound: false,
    finishedGame: false,
    currentRound: 0,
    scores: scores || null,
    puddingCounts: puddingCounts || null,
    userCount: users.length,
    handSize: null
  }
  games.push(newGame)
  console.log('games', games);
  console.log('users', users)
  return games;
}

const checkRoundFinished = (room) => {
  let game = games.find((game) => game.id === room);
  return game.currentRound + 1 === game.handSize;
}

const restartGame = (room, users) => {
  const gameToRemove = games.findIndex((game) => game.id == room);
  console.log('game to remove', gameToRemove)
  if (gameToRemove === -1) {
    return
  }
  console.log('games length', games.length)
  games.splice(gameToRemove, 1);
  console.log('games length after', games.length)
  users.map((u) => {
    u.answerSubmitted = false;
  })
  return games;
}

const getGame = (id) => games.find((game) => game.id === id);

const nextRound = (room) => {
  let game = games.find((game) => game.id === room);
  game.currentRound += 1;
  game.newRound = true;
}

const notNextRound = (room) => {
  let game = games.find((game) => game.id === room);
  game.newRound = false;
}

const updateScore = (room, userIndex, score) => {
  let game = games.find((game) => game.id === room);
  game.scores[userIndex] = score;
}

const updatePuddingCount = (room, userIndex, puddingCount) => {
  let game = games.find((game) => game.id === room);
  game.puddingCounts[userIndex] = puddingCount;
}

const dealCards = (room, cards) => {
  let game = games.find((game) => game.id === room);
  game.cards = cards;
  let cardsCopy = cards.slice();
  let puddingsUsed = game.puddingCounts ? game.puddingCounts.reduce((a, b) => a + b, 0) : 0;
  if (puddingsUsed > 0) { // remove used puddings from cards
    for (let i=0; i < puddingsUsed; i++) {
      let puddingIdx = cardsCopy.findIndex((c) => c.type === 'pudding');
      cardsCopy.splice(puddingIdx, 1);
    }
  }
  let numUsers = game.userCount;
  let cardsPerPile;
  if (numUsers === 2) {
    cardsPerPile = 10;
    game.hands = [[], []];
    game.scores = [0, 0];
    game.puddingCounts = [0, 0];
  } else if (numUsers === 3) {
    cardsPerPile = 9;
    game.hands = [[], [], []];
    game.scores = game.scores || [0, 0, 0];
    game.puddingCounts = game.puddingCounts || [0, 0, 0];
  } else if (numUsers === 4) {
    cardsPerPile = 8;
    game.hands = [[], [], [], []];
    game.scores = game.scores || [0, 0, 0, 0];
    game.puddingCounts = game.puddingCounts || [0, 0, 0, 0];
  } else {
    cardsPerPile = 7;
    game.hands = [[], [], [], [], []];
    game.scores = game.scores || [0, 0, 0, 0, 0];
    game.puddingCounts = game.puddingCounts || [0, 0, 0, 0, 0];
  }
  game.handSize = cardsPerPile;
  let piles = [];
  for (let j=0; j < numUsers; j++) {
    piles.push([]);
    for (let k=0; k < cardsPerPile; k++) {
      let randIdx = Math.floor(Math.random() * cardsCopy.length);
      piles[j].push(cardsCopy[randIdx]);
      cardsCopy.splice(randIdx, 1);
    }
  }
  game.piles = piles;
  return game;
}

const updateTile = (room, id, x, y, user) => {
  console.log('Update Tile', id, x, y)
  let game = games.find((game) => game.id === room);
  // console.log('user?', user)
  if (game && game.cards) {
    card = game.cards.find((card) => card.id === id);
    card.x = x;
    card.y = y;
    card.user = user;
  }
  if (game && game.hands) {
    // console.log("hands?", game.hands)
    card = game.hands[user.orderIndex].find((card) => card.id === id);
    if (card) {
      card.x = x;
      card.y = y;
      card.user = user;
    }
  }
  if (game && game.piles) {
    // console.log('piles??', game.piles)
    // console.log('indexxx', (user.orderIndex + game.currentRound) % game.userCount);
    card = game.piles[(user.orderIndex + game.currentRound) % game.userCount].find((card) => card.id === id);
    // console.log("CARD", card)
    if (card) {
      card.x = x;
      card.y = y;
      card.user = user;
    }
  }
}

const updateCard = (room, userIndex, cardsInHand, cardsInPile) => {
  let game = games.find((game) => game.id === room);
  console.log('updateCard in room', game)

  if (game && game.hands) {
    console.log('hands??', cardsInHand)
    game.hands[userIndex] = cardsInHand;
  }
  if (game && game.piles) {
    console.log('pile???', cardsInPile)
    console.log(
      'pile index to update', (userIndex + game.currentRound) % game.userCount
    )
    game.piles[(userIndex + game.currentRound) % game.userCount] = cardsInPile;
  }
  return game;
}

const rollDice = (room) => {
  let game = games.find((game) => game.id === room);
  const roll1 = Math.floor(Math.random() * 6) + 1;
  const roll2 = Math.floor(Math.random() * 6) + 1;
  game.dice = [roll1, roll2];
  return game;
}

const endGame = (room) => {
  let game = games.find((game) => game.id === room);
  game.finishedGame = true;
  return game;
}

const removeGame = (room) => {
  const index = games.findIndex((game) => game.id === room);

  if (index !== -1) {
    console.log('games before deleting', games)
    games.splice(index, 1)[0];
    console.log('games after deleting', games)
  }
}

const scheduleRemoveGame = (room, getUsersInRoom) => {
  let intervalId = setInterval(() => {
    console.log('deleting this room', room);
    const index = games.findIndex((game) => game.id === room);

    if (index !== -1) {
      const users = getUsersInRoom(room)
      if (users.length > 0) {
        console.log('there are still users in the room so do not delete it')
        return;
      } else {
        //delete the room for real
        console.log('games before deleting', games)
        games.splice(index, 1)[0];
        let intervalToStop = pendingRemovals[room];
        if (intervalToStop) {
          clearInterval(intervalToStop);
          delete pendingRemovals[room];
        }
        console.log('games after deleting', games)
      }
    }

  }, 5400000) // check 1.5 hours
  pendingRemovals[room] = intervalId;
}

module.exports = { addGame, getGame, restartGame, removeGame, scheduleRemoveGame, dealCards, updateTile, rollDice, endGame, updateCard, nextRound, notNextRound, checkRoundFinished, updateScore, updatePuddingCount };