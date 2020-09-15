let games = [];

// map of room names to interval IDs
let pendingRemovals = {};

const addGame = (room, users, scores, puddingCounts, leftoverCards, prevGameNumber) => {
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
    handSize: null,
    gameNumber: prevGameNumber ? parseInt(prevGameNumber) + 1 : 1,
    leftoverCards: leftoverCards || []
  }
  games.push(newGame)
  return games;
}

const checkRoundFinished = (room) => {
  let game = games.find((game) => game.id === room);
  return game.currentRound + 1 === game.handSize;
}

const restartGame = (room, users) => {
  const gameToRemove = games.findIndex((game) => game.id == room);
  if (gameToRemove === -1) {
    return
  }
  games.splice(gameToRemove, 1);
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
  let cardsCopy = game.leftoverCards.length > 0 ? game.leftoverCards.slice() : game.cards.slice();
  let numUsers = game.userCount;
  let cardsPerPile;
  if (numUsers === 2) {
    cardsPerPile = 10;
    game.hands = [[], []];
    game.scores = game.scores ? game.scores.map((s) => parseInt(s)) : [0, 0];
    game.puddingCounts = game.puddingCounts ? game.puddingCounts.map((c) => parseInt(c)) : [0, 0];
  } else if (numUsers === 3) {
    cardsPerPile = 9;
    game.hands = [[], [], []];
    game.scores = game.scores ? game.scores.map((s) => parseInt(s)) : [0, 0, 0];
    game.puddingCounts = game.puddingCounts ? game.puddingCounts.map((c) => parseInt(c)) : [0, 0, 0];
  } else if (numUsers === 4) {
    cardsPerPile = 8;
    game.hands = [[], [], [], []];
    game.scores = game.scores ? game.scores.map((s) => parseInt(s)) : [0, 0, 0, 0];
    game.puddingCounts = game.puddingCounts ? game.puddingCounts.map((c) => parseInt(c)) : [0, 0, 0, 0];
  } else {
    cardsPerPile = 7;
    game.hands = [[], [], [], [], []];
    game.scores = game.scores ? game.scores.map((s) => parseInt(s)) : [0, 0, 0, 0, 0];
    game.puddingCounts = game.puddingCounts ? game.puddingCounts.map((c) => parseInt(c)) : [0, 0, 0, 0, 0];
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
  game.leftoverCards = cardsCopy;
  return game;
}

const updateTile = (room, id, x, y, user) => {
  let game = games.find((game) => game.id === room);
  if (game && game.cards) {
    card = game.cards.find((card) => card.id === id);
    card.x = x;
    card.y = y;
    card.user = user;
  }
  if (game && game.hands) {
    card = game.hands[user.orderIndex].find((card) => card.id === id);
    if (card) {
      card.x = x;
      card.y = y;
      card.user = user;
    }
  }
  if (game && game.piles) {
    card = game.piles[(user.orderIndex + game.currentRound) % game.userCount].find((card) => card.id === id);
    if (card) {
      card.x = x;
      card.y = y;
      card.user = user;
    }
  }
}

const updateCard = (room, userIndex, cardsInHand, cardsInPile) => {
  let game = games.find((game) => game.id === room);

  if (game && game.hands) {
    game.hands[userIndex] = cardsInHand;
  }
  if (game && game.piles) {
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
    games.splice(index, 1)[0];
  }
}

const scheduleRemoveGame = (room, getUsersInRoom) => {
  let intervalId = setInterval(() => {
    const index = games.findIndex((game) => game.id === room);

    if (index !== -1) {
      const users = getUsersInRoom(room)
      if (users.length > 0) {
        return;
      } else {
        //delete the room for real
        console.log('deleting this room for real:', room.id)
        games.splice(index, 1)[0];
        let intervalToStop = pendingRemovals[room];
        if (intervalToStop) {
          clearInterval(intervalToStop);
          delete pendingRemovals[room];
        }
      }
    }

  }, 5400000) // check 1.5 hours
  pendingRemovals[room] = intervalId;
}

module.exports = { addGame, getGame, restartGame, removeGame, scheduleRemoveGame, dealCards, updateTile, rollDice, endGame, updateCard, nextRound, notNextRound, checkRoundFinished, updateScore, updatePuddingCount };