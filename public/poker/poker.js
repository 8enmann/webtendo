'use strict'
import * as webtendo from '../scripts/webtendo'
import {Card, Hand, Deck} from './libpoker'
import Vue from 'vue'

var then
var names = ['Phillips', 'Ahaltimof', 'Fghulds', 'Argyle', 'Angalope', 'Goofball', 'Lumpy', 'Beefsteak', 'Strongarm']
var currentPlayerIndex = 0
var currentBigBlindIndex = 0
var revealHand = false
const stages = ['Deal', 'Bet', '3', 'Bet', '1', 'Bet', '1', 'Bet', 'Reveal', 'Post', 'Reset']
var deck = new Deck()
var bigBlindIndex = 0
var lastMessageDate = 0
const STARTING_MONEY = 200
const AUTO_BETTING = false

let app = new Vue({
  el: '#app',
  data: {
    stages: stages,
    currentStageIndex: 0,
    players: {},
    currentPlayerId: undefined,
    sharedHand: new Hand([])
  }
})

class Player {
  // commit: number;
  constructor (id) {
    this.name = names.pop()
    this.money = STARTING_MONEY
    this.score = 0
    this.committedBet = 0// this.commit stored in this.committedBet
    this.folded = false// this.fold stored in this.folded
    this.betAlready = false
    this.hand = new Hand([])
    this.finalHand = new Hand([])
    this.id = id
    this.recentWinnings = 0
    this.lastTurnMessage = 0
  }
  notDoneBetting (currentHighestBet) {
    return (!this.finishedBetting(currentHighestBet)) && this.canBet()
  }
  finishedBetting (currentHighestBet) {
    return (this.betAlready && this.committedBet >= currentHighestBet)// you've already matched the current highest bet
  }
  canBet () {
    return !(this.folded// out of the game
           || this.money == 0// you're all-in
           || this.hand.cards.length == 0)// you never got dealt cards
  }
  commitBet (additionalAmount, currentHighestBet) { // this function is also used to commit little and big blinds
    let newBet = 0
    newBet = Math.min(additionalAmount, this.money)// you can bet at most the amount you have
    if (this.money >= currentHighestBet - this.committedBet) { // if you have enough, bid at least the minimum.
      newBet = Math.max(newBet, currentHighestBet - this.committedBet)
    } else { // if you haven't enough, you must go all in
      newBet = this.money
    }
    this.money -= newBet// subtract new bet from funds
    this.committedBet += newBet// update to new committed bet amount
  }

  update (currentHighestBet) {
    if (this.commit !== undefined) { // commit a bet
      this.commitBet(this.commit - this.committedBet, currentHighestBet)
      this.betAlready = true
      delete this.commit// clear the commit command
    } else if (this.fold !== undefined) { // fold this round
      this.folded = true
      delete this.fold// clear the fold command
    }
  }
}

function update (modifier) {
  let ids = Object.keys(app.players)// get a list of player ids
  if (ids.length == 0) {
    currentPlayerIndex = 0
    app.currentPlayerId = undefined
  } else {
    currentPlayerIndex = currentPlayerIndex % ids.length// wrap current player index
    app.currentPlayerId = ids[currentPlayerIndex]
  }

  let currentPlayer = app.players[app.currentPlayerId]
  if (currentPlayer !== undefined) {
    if (AUTO_BETTING) {
      if (currentPlayer.name == 'Beefsteak') { // ||currentPlayer.name=='Strongarm'){
        currentPlayer.fold = 1
      } else {
        currentPlayer.commit = 10// todo: debug auto-betting
      }
    }
    // remind all players whether it is their turn
    if (Date.now() - lastMessageDate > 500) {
      webtendo.broadcast({whoseTurn: currentPlayer.name, minimumBid: getHighestBet()})// send message to the next player saying it's his turn
      // also send all players their hands
      Object.values(app.players).forEach(player => {
        webtendo.sendToClient(player.id, {handText: player.hand.toString()})
      })
      lastMessageDate = Date.now()
    }
  }
  // check the game phase
  // deal -> get new deck and deal two cards to each player
  if (stages[app.currentStageIndex] == 'Deal') {
    // a new deck is made on host start and after reveal
    // deal two cards to each player that does not have cards
    for (let i = 0; i < ids.length; i++) {
      let player = app.players[ids[i]]
      if (player.hand.cards.length == 0) {
        player.hand = new Hand([deck.drawCard(), deck.drawCard()])
        if (i == bigBlindIndex) {
          player.commitBet(2, 0)// pay big blind
        } else if (i == (bigBlindIndex - 1 + ids.length) % ids.length) {
          player.commitBet(1, 0)// pay little blind
        }
      }
    }
    // wait for more players. A bet commit advances to the next stage.
    if (ids.length > 1) { // if there are at least two players
      if (currentPlayer.commit !== undefined || currentPlayer.fold !== undefined) { // see if the current player has committed
        app.currentStageIndex++
      }
    }
  } else if (stages[app.currentStageIndex] == 'Bet') {
    let currentHighestBet = getHighestBet()
    // check if all players have bet, or folded, or have no hand
    let howManyNotDoneBetting = 0
    let stillInGame = 0
    Object.values(app.players).forEach(function (player) {
      if (player.notDoneBetting(currentHighestBet))howManyNotDoneBetting++
      if (player.canBet())stillInGame++
    })
    if (stillInGame == 1) { // if this player is the only one who could bet more,
      if (currentPlayer.committedBet == currentHighestBet) { // and if he has already matched the highest bet, then skip him.
        howManyNotDoneBetting = 0
      }
    }
    if (howManyNotDoneBetting == 0) {
      // set who is betting first next round
      if (app.currentStageIndex == 1) { // in the first betting round, the big blind
        currentPlayerIndex = bigBlindIndex + 1
        app.currentPlayerId = ids[currentPlayerIndex]
      } else {
        currentPlayerIndex = (bigBlindIndex - 1 + ids.length) % ids.length// the little blind is big blind index -1
        app.currentPlayerId = ids[currentPlayerIndex]
      }
      app.currentStageIndex++// move to next phase
      Object.values(app.players).forEach(function (player) { player.betAlready = false })// reset 'already bet' flags
    } else {
      // todo: setTimeout to limit player betting time
      // process commit from current player
      if (currentPlayer.commit !== undefined || currentPlayer.fold !== undefined) {
        currentPlayer.update(currentHighestBet)// process this player's inputs
        // Object.values(players).forEach(function(player){delete player.commit; delete player.fold;});//clear other players' inputs
      }
    }
    // skip a player who is all-in, or folded, or done (somehow)
    if (!currentPlayer.notDoneBetting(currentHighestBet)) {
      currentPlayerIndex++
      app.currentPlayerId = ids[currentPlayerIndex]
    }
  } else if (stages[app.currentStageIndex] == '3' || stages[app.currentStageIndex] == '1') {
    // reveal some cards
    for (let i = 0; i < Number(stages[app.currentStageIndex]); i++) {
      app.sharedHand.cards.push(deck.drawCard())// add a card without resorting the hand
    }
    app.currentStageIndex++// advance to next stage
  } else if (stages[app.currentStageIndex] == 'Reveal') {
    determineWinners()
  } else if (stages[app.currentStageIndex] == 'Reset') {
    let onePlayerHasNoMoney = false
    // dump recent winnings into money
    Object.values(app.players).forEach(function (player) {
      player.money += player.recentWinnings
      player.recentWinnings = 0
      if (player.money == 0)onePlayerHasNoMoney = true
      player.hand = new Hand([])// clear their hand
      player.finalHand = new Hand([])
      player.folded = false
    })
    // if any one player has zero money, dump money into score and reset money
    if (onePlayerHasNoMoney) {
      Object.values(app.players).forEach(player => {
        player.score += player.money
        player.money = STARTING_MONEY
      })
    }

    // reset the deck
    deck = new Deck()
    // clear the shared cards
    app.sharedHand = new Hand([])
    app.currentStageIndex = 0
    // advance the big blind
    bigBlindIndex = (bigBlindIndex + 1) % ids.length
  } else if (stages[app.currentStageIndex] == 'Post') {
    // wait for a player to push commit to move to the next betting round
    if (currentPlayer.commit !== undefined) {
      app.currentStageIndex++
      delete currentPlayer.commit
    }
  }
}
function findSubPotWinners (players) {
  // the players list is sorted by hand value already
  // search the players list to find the first player who has commitBet>0 (there must be at least one)
  // it may not be the 0th player (best hand), since he may be all-in with a small amount, and not participating in this sub-pot
  let winnerList = []
  for (let i = 0; i < players.length; i++) {
    if (players[i].committedBet > 0 && players[i].folded == false) {
      winnerList.push(players[i])
      break
    }
  }
  //* *a player can only win (part of) a subpot if he is invested in it (i.e. committedBet>0).
  let bestHandValue = winnerList[0].finalHand.handValue
  for (let i = 1; i < players.length; i++) {
    if (players[i].finalHand.handValue == bestHandValue && players[i].committedBet > 0 && players[i].folded == false) { winnerList.push(players[i]) }
  }
  return winnerList
}

function findSmallestCommittedBet (players) {
  // the committedBets are not all zero (checked before this function is called)
  // find the smallest committedBet that is not zero
  let smallestCommittedBet = 10000000
  for (let player of players) {
    if (player.committedBet < smallestCommittedBet && player.committedBet !== 0) {
      smallestCommittedBet = player.committedBet
    }
  }
  return smallestCommittedBet
}
function allCommittedBetsAreZero (players) {
  for (let player of players) {
    if (player.committedBet !== 0) return false
  }
  return true
}

function determineWinners () {
  // determine who has the best hand
  let playerList = []// prepare to sort players by hand quality
  Object.values(app.players).forEach(function (player) { // get each player's best possible hand
    if (player.folded == false && player.hand.cards.length > 0) { // you can only win if you have been dealt a hand and have not folded
      let combinedHand = player.hand.cloneAndCombine(app.sharedHand)
      let bestHand = combinedHand.getBestHand()
      player.finalHand = bestHand
      playerList.push(player)
    } else { // if you're not in the game, you will lose your committedBet. Your hand score is -1.
      player.finalHand = new Hand([])
      player.finalHand.handValue = -1
      playerList.push(player)
    }
  })
  // sort by best hand
  playerList.sort(function (a, b) {
    return b.finalHand.handValue - a.finalHand.handValue
  })
  while (!allCommittedBetsAreZero(playerList)) { // until all the committedBets are zero:
    // find the smallest nonzero committedBet. This is the subpot commit.
    let subPotCommit = findSmallestCommittedBet(playerList)
    // get a list of players who tied for first place; these must have nonzero committedBets
    let subPotWinners = findSubPotWinners(playerList)
    // subtract from each committedBet the subpot commit. Increment the subpot.
    let subPot = 0
    for (let player of playerList) {
      if (player.committedBet >= subPotCommit) {
        player.committedBet -= subPotCommit
        subPot += subPotCommit
      }
    }
    // Divide the subpot among the players who tied for first place. Put money in player.recentWinnings.
    for (let winner of subPotWinners) {
      winner.recentWinnings += subPot / subPotWinners.length
    }
  }
  // todo: round recentWinnings down to zero
  for (let player of playerList) {
    player.recentWinnings = Math.floor(player.recentWinnings)
  }
  // go to next stage
  app.currentStageIndex++
  // setTimeout(function(){app.currentStageIndex++;},6000);//wait a bit so people can see the result
}

// The main game loop
function main () {
  var now = Date.now()
  var delta = now - then

  update(delta / 1000)

  then = now

  // Request to do this again in 100 ms (10 Hz).
  window.setTimeout(main.bind(this), 100)
};

function getHighestBet () {
  // find the minimum bet
  let currentHighestBet = 0
  for (let player of Object.values(app.players)) {
    currentHighestBet = Math.max(currentHighestBet, player.committedBet)
  }
  return currentHighestBet
}

webtendo.callbacks.onMessageReceived = function (x) {
  // console.log(x);
  let player = app.players[x.clientId]
  player[x.controlName] = x.controlValue// expects x.commit and x.fold
  // x.commit carries a controlValue which is the next bet amount
  // x.fold does not use the controlValue
}

webtendo.callbacks.onConnected = function (x) {
  let id = x.clientId
  console.log(id, 'connected')
  if (!app.players[id]) {
    app.$set(app.players, id, new Player(id))
  }
  webtendo.sendToClient(id, {hello: app.players[id].name})
}

webtendo.callbacks.onDisconnected = function (x) {
  let id = x.clientId
  console.log(id, 'disconnected')
  // TODO: find out why ios disconnects. maybe just simulator?
  // delete players[id];
};

(function init () {
  // autorun();
  // start game loop
  then = Date.now()
  main()
})()

function autorun () {
  // initialize deck of cards
  deck = new Deck()
  draw = deck.drawCard()
  console.log(draw.toString())

  // test the hand sorting and evaluation
  app.sharedHand = new Hand([new Card(8, 0), new Card(7, 2), new Card(8, 2), new Card(9, 2), new Card(11, 2)])
  var playerHand = new Hand([new Card(10, 2), new Card(12, 2)])
  var combinedHand = playerHand.addSharedCards(app.sharedHand)
  console.log(playerHand.toString())
  console.log(app.sharedHand.toString())
  console.log(combinedHand.toString())
  console.log(hand)
  var sets = hand.combinations()
  for (let set of sets) {
    console.log(set.toString())
  }
  console.log(combinedHand.getBestHand().toString())
  var hand1 = new Hand([new Card(8, 0), new Card(8, 1), new Card(7, 0), new Card(12, 2), new Card(10, 2)])
  var hand2 = new Hand([new Card(9, 0), new Card(9, 1), new Card(7, 0), new Card(11, 2), new Card(10, 2)])
  hand1.assessFiveCardHand()
  hand2.assessFiveCardHand()
  console.log(hand1.toLine())
  console.log(hand2.toLine())
}
