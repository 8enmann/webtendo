// @flow
var suitChars = ['\u2660','\u2665','\u2666','\u2663'];
var valueChars = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
var handTypes = ['High Card','One Pair','Two Pair','Three','Straight','Flush','Full House','Four','Straight Flush','Royal Flush'];
var sets = [];

export class Card {
    constructor(value,suit){
	//this.value: number  = value;
	this.value = value;
	this.suit = suit;
    }
    higherThan(otherCard){
	if(this.value>otherCard.value) return true;
	if(this.value<otherCard.value) return false;
	if(this.suit>otherCard.suit) return true;
	if(this.suit<otherCard.suit) return false;
	return undefined;//if the two cards are the same, higherThan returns undefined.
    }
    toString(){
	return valueChars[this.value]+suitChars[this.suit];
    }
    toNumber(){
	return this.value*10+this.suit;
    }
}
export class Deck {
    constructor(){
	this.cards = [];
	for(let i=0;i<valueChars.length;i++){
	    for(let j=0;j<suitChars.length;j++){
		this.cards.push(new Card(i,j));
	    }
	}
    }
    drawCard(){//draw a card
	let drawIndex = Math.floor(Math.random()*this.cards.length);
	let drawnCard = this.cards[drawIndex];
	this.cards.splice(drawIndex,1);
	return drawnCard;
    }
}
export class Hand {
    constructor(cards){
	this.cards = this.handSort(cards);
	this.handType = undefined;
	this.handValue = undefined;
    }
    handSort(cards){
	return cards.sort(
	    function(a, b) {
		return a.toNumber() - b.toNumber();
	    });   
    }
    toString(){
	let outStr = '';
	let card = undefined;
	for(card of this.cards){
	    outStr+=card.toString();
	}
	return outStr;
    }
    toLine(){
	return this.toString()+" "+handTypes[this.handType]+" "+this.handValue;
    }
    
    combinations(){//performs k choose n to get all combinations
	sets = [];
	cutAway(this.cards,0,5);
	return sets;
    }
    getBestHand(){
	let manyHands = this.combinations();//get all combinations of five hands
	for(let hand of manyHands)
	    hand.assessFiveCardHand();//assess all the hands
	manyHands.sort(function(a,b){return b.handValue-a.handValue});//sort to find the best hand
	//for(let hand of manyHands){//print all the hands
	//  console.log(hand.cards.toString()+" "+handTypes[hand.handType]+" "+hand.handValue);
	//}
	return manyHands[0];//return the best hand (ID'd and scored)
    }
    assessFiveCardHand(){//assumes a 5 card hand
	let valueList = [];
	for(let i=0;i<valueChars.length;i++)//prepare counting array
	    valueList.push([i,0]);
	for(let card of this.cards)//count multiples
	    valueList[card.value][1]++;
	valueList.sort(function(a,b){return b[1]*100+b[0]-a[1]*100-a[0];});//sort by most occurring, and then by highest value
	//for(let i=0;i<valueList.length;i++)//print the value list
	//console.log(valueList[i]);
	if(valueList[0][1]==4){//check if the top entry has 4
	    this.handType = handTypes.indexOf("Four");
	}else if(valueList[0][1]==3){//check if the top entry has 3
	    if(valueList[1][1]==2){//check if it's a full house
		this.handType = handTypes.indexOf('Full House');
	    }else{
		this.handType = handTypes.indexOf('Three');
	    }
	}else if(valueList[0][1]==2){//check if the top entry has 2
	    if(valueList[1][1]==2){//check if it's a two pair
		this.handType = handTypes.indexOf('Two Pair');
	    }else{//one pair
		this.handType = handTypes.indexOf('One Pair');
	    }
	}else{//high card, flush, straight, etc
	    this.handType = handTypes.indexOf('High Card');
	    //is it an ace?
	    let straight = this.isStraight();
	    let flush = this.isFlush();
	    
	    //check if top card is an ace
	    let topCard = this.cards.slice(-1)[0];
	    if(topCard.value==valueChars.indexOf('A')){//ace is top card
		//straight may have the ace at the bottom
		let lowAce = new Card(-1,topCard.suit);
		let newCards = this.cards.slice(0,4);//copies array
		newCards.unshift(lowAce);//adds low ace to start of Array
		let lowAceHand = new Hand(newCards);
		let lowStraight = lowAceHand.isStraight();
		straight = straight||lowStraight;
		//royal flush has ace as top card
		if(straight&&flush){
		    this.handType = handTypes.indexOf('Royal Flush');
		}
	    }else{//ace is not top card
		if(straight&&flush){
		    this.handType = handTypes.indexOf('Straight Flush');
		}else if(straight){
		    this.handType = handTypes.indexOf('Straight');
		}else if(flush){
		    this.handType = handTypes.indexOf('Flush');
		}
	    }
	}
	//compute relative hand score
	this.handValue = 0;
	for(let i=0;i<5;i++)
	    this.handValue+=Math.pow(20,5-i)*valueList[i][0];
	//  this.handValue+=Math.pow(20,5-i)*valueList[i+1][0];
	this.handValue+=Math.pow(20,6)*this.handType;
    }
    isFlush(){//are all the cards the same suit?
	let suit = this.cards[0].suit;
	for(let i=1;i<this.cards.length;i++){
	    if(this.cards[i].suit!=suit){
		return false;//a card has a different suit
	    }
	}
	return true;//all cards same suit
    }
    isStraight(){//are the cards ascending by increments of 1?
	//cards are already in ascending order
	let previousValue = this.cards[0].value;
	for(let i=1;i<this.cards.length;i++){
	    if(this.cards[i].value!=previousValue+1){
		return false;//a card was not in order, not straight
	    }
	    previousValue = this.cards[i].value;
	}
	return true;//all cards in order, it's a straight
    }
    cloneAndCombine(newHand){
	let allCards = this.cards.concat(newHand.cards);
	return new Hand(allCards)//hand constructor will sort the cards
    }
    //todo: join two hands, the player's and the shared hand.
}

function cutAway(subCards,startIndex,targetCount){
    if(subCards.length==targetCount)
	sets.push(new Hand(subCards))
    else
	for(let i=startIndex;i<subCards.length;i++){
	    let newCards = subCards.slice();//copies array
	    newCards.splice(i,1);//removes item
	    cutAway(newCards,i,targetCount);//recurse
	}
}

