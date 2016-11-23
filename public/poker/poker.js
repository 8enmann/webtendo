'use strict';
import * as webtendo from '../scripts/webtendo';
import {Card,Hand,Deck} from './libpoker';

var then;
var ctx;
var players = {};//dict
var names = ['Angalope','Goofball','Lumpy','Beefsteak','Strongarm'];//list
var currentPlayerIndex = 0;
var currentBigBlindIndex = 0;
var canvas;
var columnWidth = 100;
var rowHeight = 24;
var yOffset = rowHeight*3;
var xOffset = rowHeight;
var widthList = [0.75,2,1,1,1,1,1,1,1,1];
var revealHand = false;
var stages = ['Deal','Bet','3','Bet','1','Bet','1','Bet','Reveal'];
var currentStageIndex = 0;
var deck = new Deck();
var sharedHand = new Hand([]);

class Player {
  //commit: number;
  constructor(id) {
    this.name = names.pop();
    this.money = 1000;
    this.score = 0;
    this.committedBet = 0;//this.commit stored in this.committedBet
    this.folded = false;//this.fold stored in this.folded
    this.betAlready = false;
    this.hand = undefined;
    this.id = id;
  }

  render(ctx,playerIndex) {
    
    let verticalPosition = rowHeight*playerIndex+yOffset
    rowText(ctx,xOffset,verticalPosition,columnWidth
            ,widthList
            ,[playerIndex==currentPlayerIndex?">":""
              ,this.name
              ,this.score
              ,this.money
              ,this.committedBet
              ,this.folded?'Fold':'In'
              ,this.hand.toString()
             ]);
    //put ante type
  }
  isDoneBetting(currentHighestBet){//conditions when you can't bet:
    return this.folded//out of the game
      ||(this.betAlready&&this.committedBet==currentHighestBet)//you've already matched the current highest bet
      ||this.committedBet==this.money//you're all-in
      ||this.hand==undefined;//you never got dealt cards
  }
  update(currentHighestBet) {
    if (this.commit!==undefined) { // commit a bet
      
      this.committedBet=Math.min[this.committedBet+this.commit,this.money];//you can bet at most the amount you have
      if(this.money>=currentHighestBet){//if you have enough, bid at least the minimum.
        this.committedBet = Math.max(this.committedBet,currentHighestBet);
      }
      this.betAlready = true;
      delete this.commit;//clear the commit command
    } else if (this.fold!==undefined){//fold this round
      this.folded = true;
      delete this.fold//clear the fold command
    }
  }
}

function rowText(ctx,xStart,yPosition,xIncrement,relativeWidths,textList){
  let xPosition = xStart;
  for(let i=0;i<textList.length;i++){
    ctx.fillText(textList[i],xPosition,yPosition);
    xPosition+=xIncrement*relativeWidths[i];
  }
}

function update(modifier) {
  let ids = Object.keys(players);//get a list of player ids
  currentPlayerIndex = currentPlayerIndex%ids.length;//wrap current player index
  let currentPlayer = players[ids[currentPlayerIndex]];
  //check the game phase
  //deal -> get new deck and deal two cards to each player
  if(stages[currentStageIndex]=='Deal'){
    //a new deck is made on host start and after reveal
    //todo: setup blind when players join or after reveal
    //todo: reset fold status after reveal
    //todo: reset betAlready=false after betting
    //deal two cards to each player that does not have cards
    Object.values(players).forEach(function(player){
      if(!player.hand)
        player.hand=new Hand([deck.drawCard(),deck.drawCard()])
    });
    //wait for more players. A bet commit advances to the next stage.
    //todo: each new player should be sent the big blind as minimum bet (to start)
    if(currentPlayer!==undefined){//if there are any players
      if(currentPlayer.commit){//see if the current player has committed
        currentStageIndex++;
      }
    }
  }else if(stages[currentStageIndex]=='Bet'){
    //find the minimum bet
    let currentHighestBet = 0;
    Object.values(players).forEach(function(player){currentHighestBet=Math.max(currentHighestBet,player.committedBet)});
    //check if all players have bet, or folded, or have no hand
    let allPlayersDone = true;
    Object.values(players).forEach(function(player){allPlayersDone = allPlayersDone&&player.isDoneBetting(currentHighestBet)});
    if(allPlayersDone)
      currentStageIndex++;//move to next phase
    //todo: send the current highest bet to clients
    //skip a player who is all-in, or folded, or done (somehow)
    if(currentPlayer.isDoneBetting)
      currentPlayerIndex++;
    //process commit from current player
    if(currentPlayer.commit||currentPlayer.fold){
      currentPlayer.update(currentHighestBet);
      currentPlayerIndex++;
    }
  }else if(stages[currentStageIndex]=='3'||stages[currentStageIndex]=='1'){
    //reveal some cards
    let newCards = [];
    for(let i=0;i<Number(stages[currentStageIndex]);i++){
      newCards.push(deck.drawCard());
    }
    sharedHand.addSharedCards(new Hand(newCards));
    currentStageIndex++;//advance to next stage
  }else if(stages[currentStageIndex]=='Reveal'){
    
  }
  //bet -> acquire inputs from currentPlayer, with timeout
  //  advanced to next player to get his bet
  //  todo: player fold status indicator
  //  ignore players with no hand; they will be dealt in next round
  //  betting stops when all bets equal, or no hand, or all in, or fold
  //numeral -> add this many cards to shared hand
  //reveal -> show only best hand, distribute the pot, and repeat if any of the pot is left (sub-pot runoff).
  
  for (var id in players) {
    players[id].update(modifier);
  }
}

// The main game loop
function main() {
  var now = Date.now();
  var delta = now - then;

  update(delta / 1000);
  render();

  then = now;

  // Request to do this again ASAP
  requestAnimationFrame(main);
};

// Draw everything
var render = function () {
  // Clear
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Scoreboard
  ctx.fillStyle = "white";
  ctx.font = "24px Courier New";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  let ids = Object.keys(players);
  for (let i=0;i<ids.length;i++){
    players[ids[i]].render(ctx,i);
  }
  rowText(ctx,xOffset,yOffset-rowHeight,columnWidth
            ,widthList
          ,["Turn" ,"Name" ,"Score" ,"Funds","Commit" ,"Status","Hand"]);

  ctx.fillText("Poker", 0, 0);
  //list stages
  rowText(ctx,rowHeight*5,0,rowHeight*4,[1,1,1,1,1,1,1,1,1,1],stages);
  rowText(ctx,rowHeight*5+currentStageIndex*rowHeight*4,rowHeight,rowHeight*4,[1],["^"]);//indicate current stage
  //show shared cards
  ctx.fillText("Shared Cards:",800,rowHeight*2);
  ctx.fillText(sharedHand.toString(),800,rowHeight*3);
};

webtendo.callbacks.onMessageReceived = function(x) {
  let player = players[x.clientId];
  player[x.controlName]=x.controlValue;//expects x.commit and x.fold
  //x.commit carries a controlValue which is the next bet amount
  //x.fold does not use the controlValue
};

webtendo.callbacks.onConnected = function(id) {
  console.log(id, 'connected');
  webtendo.sendToClient(id, {hello: 'client'});
  if (!players[id]) {
    players[id] = new Player(id);
  }
};

webtendo.callbacks.onDisconnected = function(id) {
  console.log(id, 'disconnected');
  // TODO: find out why ios disconnects. maybe just simulator?
  // delete players[id];
};

(function init() {
  //set up canvas
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext("2d");
  // Awful hack from stackoverflow to increase canvas resolution.
  const ratio = window.devicePixelRatio, w = canvas.offsetWidth, h = canvas.offsetHeight;
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  //initialize deck of cards
  //deck = new Deck();
  //draw = deck.drawCard();
  //console.log(draw.toString());

  //test the hand sorting and evaluation
  //var sharedHand = new Hand([new Card(8,0),new Card(7,2),new Card(8,2),new Card(9,2),new Card(11,2)]);
  //var playerHand = new Hand([new Card(10,2),new Card(12,2)]);
  //var combinedHand = playerHand.addSharedCards(sharedHand);
  //console.log(playerHand.toString());
  //console.log(sharedHand.toString());
  //console.log(combinedHand.toString());
  //console.log(hand);
  //var sets = hand.combinations();
  //for(let set of sets){
  //  console.log(set.toString());
  //}
  //console.log(combinedHand.getBestHand().toString());
  //start game loop
  then = Date.now();
  main();
})();
