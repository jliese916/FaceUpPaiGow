"use strict";

const assert = require("assert");
const engine = require("./pai-gow-engine.js");

let nextId = 1000;
const cards = text => text.trim().split(/\s+/).map(code => engine.cardFromCode(code, nextId += 1));

function codes(hand) {
  return hand.map(engine.cardCode).sort();
}

function run() {
  const royal = engine.evaluateFive(cards("AH KH QH JH 10H"));
  const wheel = engine.evaluateFive(cards("AS 2H 3D 4C 5S"));
  const kingHigh = engine.evaluateFive(cards("KS QH JD 10C 9S"));
  assert.equal(royal.name, "Royal Flush");
  assert(engine.compareScore(royal.score, wheel.score) > 0, "Royal must beat the wheel");
  assert(engine.compareScore(wheel.score, kingHigh.score) > 0, "A-2-3-4-5 must be the second-highest straight");

  assert.equal(engine.evaluateFive(cards("AH AD AC AS X")).name, "Five Aces");
  assert.equal(engine.evaluateFive(cards("KH KD KC KS X")).name, "Four of a Kind", "Joker cannot become a fifth King");
  assert.equal(engine.evaluateFive(cards("9H 8H 7H 6H X")).name, "Straight Flush");
  const jokerFlush = engine.evaluateFive(cards("AH KH 7H 5H X"));
  assert.deepEqual(jokerFlush.score.slice(0, 4), [5, 14, 13, 12], "Joker must fill the flush as the highest missing rank");

  const noPair = cards("AS KH QD 9C 7S 4H 2D");
  const noPairSet = engine.houseWaySet(noPair);
  assert.deepEqual(codes(noPairSet.lowCards), ["KH", "QD"].sort());

  const onePair = cards("9S 9H AS KC 7D 4C 2S");
  const onePairSet = engine.houseWaySet(onePair);
  assert.deepEqual(codes(onePairSet.lowCards), ["AS", "KC"].sort());
  assert.equal(onePairSet.high.name, "One Pair");

  const lowPairs = cards("6S 6H 4D 4C AS KH 2D");
  const lowPairsSet = engine.houseWaySet(lowPairs);
  assert.deepEqual(codes(lowPairsSet.lowCards), ["AS", "KH"].sort());
  assert.equal(lowPairsSet.high.name, "Two Pair");

  const lowPairsStraight = cards("2S 2H 3D 3C 4S 5H 6D");
  const lowPairsStraightSet = engine.houseWaySet(lowPairsStraight);
  assert.equal(lowPairsStraightSet.high.name, "Straight");

  const splitPairs = cards("10S 10H 6D 6C KS QH 2D");
  const splitPairsSet = engine.houseWaySet(splitPairs);
  assert.deepEqual(codes(splitPairsSet.lowCards), ["6D", "6C"].sort());

  const fullHouse = cards("QS QH QD 7C 7S AH 2D");
  assert.deepEqual(codes(engine.houseWaySet(fullHouse).lowCards), ["7C", "7S"].sort());

  const threePairs = cards("KS KH 9D 9C 3S 3H AD");
  assert.deepEqual(codes(engine.houseWaySet(threePairs).lowCards), ["KS", "KH"].sort());

  const twoTrips = cards("KS KH KD 8C 8S 8H AD");
  const twoTripsSet = engine.houseWaySet(twoTrips);
  assert.equal(twoTripsSet.low.category, 1);
  assert.equal(twoTripsSet.low.score[1], 13);

  const acesTrip = cards("AS AH AD KC QS 8H 3D");
  assert(engine.houseWaySet(acesTrip).lowCards.some(card => engine.effectiveRank(card) === 14));

  const legalSets = engine.enumerateSets(cards("AS AH KD QC JS 9H 2D"));
  assert.equal(legalSets.length, 21);
  assert(legalSets.some(set => set.legal));

  const dealerCards = cards("10S 10H 6D 6C KS QH 2D");
  const playerCards = cards("AS AH KD KC QS QH 2D");
  const dealerSet = engine.houseWaySet(dealerCards);
  const solution = engine.findBestPlayerSet(playerCards, dealerSet);
  assert(solution.canWin, "Player should have a winning set");
  assert.equal(solution.best.result.outcome, "win");

  const pairQueens = { category: 1, score: [1, 12, 9, 7, 4], name: "One Pair" };
  const pairJacks = { category: 1, score: [1, 11, 14, 10, 8], name: "One Pair" };
  assert.equal(engine.describeHighForComparison(pairQueens, pairJacks), "Pair of Queens");
  assert.equal(engine.describeHighForComparison(pairJacks, pairQueens), "Pair of Jacks");

  const jacksKingTen = { category: 1, score: [1, 11, 13, 10, 7], name: "One Pair" };
  const jacksKingFour = { category: 1, score: [1, 11, 13, 4, 3], name: "One Pair" };
  assert.equal(engine.describeHighForComparison(jacksKingTen, jacksKingFour), "Pair of Jacks with King-Ten kickers");
  assert.equal(engine.describeHighForComparison(jacksKingFour, jacksKingTen), "Pair of Jacks with King-Four kickers");

  const jacksAce = { category: 1, score: [1, 11, 14, 8, 3], name: "One Pair" };
  const jacksQueen = { category: 1, score: [1, 11, 12, 10, 9], name: "One Pair" };
  assert.equal(engine.describeHighForComparison(jacksAce, jacksQueen), "Pair of Jacks with Ace kicker");
  assert.equal(engine.describeHighForComparison(jacksQueen, jacksAce), "Pair of Jacks with Queen kicker");

  const aceKingQueenHigh = { category: 0, score: [0, 14, 13, 12, 8, 3], name: "High Card" };
  const aceKingJackHigh = { category: 0, score: [0, 14, 13, 11, 10, 9], name: "High Card" };
  assert.equal(engine.describeHighForComparison(aceKingQueenHigh, aceKingJackHigh), "Ace-King-Queen high");
  assert.equal(engine.describeHighForComparison(aceKingJackHigh, aceKingQueenHigh), "Ace-King-Jack high");

  const aceTenLow = { category: 0, score: [0, 14, 10], name: "A-10 high" };
  const pairNinesLow = { category: 1, score: [1, 9], name: "Pair of 9s" };
  assert.equal(engine.describeLowHand(aceTenLow), "Ace-Ten high");
  assert.equal(engine.describeLowHand(pairNinesLow), "Pair of Nines");

  const aceHighDealerCards = cards("AS KH QD 9C 7S 4H 2D");
  const aceHighDealer = engine.houseWaySet(aceHighDealerCards);
  assert(engine.dealerHasAceHighPaiGow(aceHighDealerCards), "Raw seven-card dealer hand must trigger the automatic push");
  assert(engine.dealerHasAceHighPaiGow(aceHighDealer), "Dealer house-way set must also trigger the automatic push");
  const automaticPush = engine.compareSets(solution.best, aceHighDealer);
  assert.equal(automaticPush.outcome, "push");
  assert(automaticPush.aceHighPush);

  let seed = 9162026;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };

  let pushOnlyCase = null;
  let guaranteedLossCase = null;
  let winningCase = null;
  for (let sample = 0; sample < 2000 && (!pushOnlyCase || !guaranteedLossCase || !winningCase); sample += 1) {
    const deck = engine.shuffledDeck(random);
    const sampledDealer = engine.houseWaySet(deck.slice(0, 7));
    if (engine.dealerHasAceHighPaiGow(sampledDealer)) continue;
    const sampledSolution = engine.findBestPlayerSet(deck.slice(7, 14), sampledDealer);
    if (!pushOnlyCase && !sampledSolution.canWin && sampledSolution.canPush) {
      const losingSet = sampledSolution.sets.find(set => set.result.outcome === "loss");
      if (losingSet) pushOnlyCase = { dealer: sampledDealer, solution: sampledSolution, losingSet };
    }
    if (!guaranteedLossCase && !sampledSolution.canWin && !sampledSolution.canPush) {
      guaranteedLossCase = { dealer: sampledDealer, solution: sampledSolution };
    }
    if (!winningCase && sampledSolution.canWin) {
      const lesserSet = sampledSolution.sets.find(set => set.result.outcome !== "win");
      if (lesserSet) winningCase = { dealer: sampledDealer, solution: sampledSolution, lesserSet };
    }
  }
  assert(pushOnlyCase, "Expected to find a push-only test case");
  assert(guaranteedLossCase, "Expected to find a guaranteed-loss test case");
  assert(winningCase, "Expected to find a winning test case with a lesser legal setting");
  assert.equal(engine.isAccurateSet(pushOnlyCase.losingSet, pushOnlyCase.dealer).accurate, false, "A loss is inaccurate when a push is available");
  assert.equal(engine.isAccurateSet(pushOnlyCase.solution.best, pushOnlyCase.dealer).accurate, true, "A push is accurate when it is the best result");
  guaranteedLossCase.solution.sets.forEach(set => {
    assert.equal(engine.isAccurateSet(set, guaranteedLossCase.dealer).accurate, true, "Every legal setting is optimal on a guaranteed loss");
  });
  assert.equal(engine.isAccurateSet(winningCase.lesserSet, winningCase.dealer).accurate, false, "A push or loss is inaccurate when a win is available");

  for (let sample = 0; sample < 5000; sample += 1) {
    const deck = engine.shuffledDeck(random);
    const sampledDealer = engine.houseWaySet(deck.slice(0, 7));
    const sampledPlayer = deck.slice(7, 14);
    assert(sampledDealer.legal, `Dealer house way fouled on sample ${sample}`);
    assert.equal(new Set([...sampledDealer.highCards, ...sampledDealer.lowCards].map(engine.cardCode)).size, 7);
    const sampledSolution = engine.findBestPlayerSet(sampledPlayer, sampledDealer);
    assert(sampledSolution.best && sampledSolution.best.legal, `No legal player solution on sample ${sample}`);
    assert(["win", "push", "loss"].includes(sampledSolution.best.result.outcome));
  }

  console.log("Pai Gow engine tests passed.");
}

run();
