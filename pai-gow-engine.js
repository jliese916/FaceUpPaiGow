"use strict";

(function exposePaiGowEngine(root) {
  const RANK_LABELS = { 14: "A", 13: "K", 12: "Q", 11: "J", 10: "10", 9: "9", 8: "8", 7: "7", 6: "6", 5: "5", 4: "4", 3: "3", 2: "2" };
  const SUITS = ["♥", "♦", "♣", "♠"];
  const SUIT_NAMES = ["hearts", "diamonds", "clubs", "spades"];
  const FIVE_CATEGORY_NAMES = ["High Card", "One Pair", "Two Pair", "Three of a Kind", "Straight", "Flush", "Full House", "Four of a Kind", "Straight Flush", "Five Aces"];
  const HAND_RANK_NAMES = { 14: "Ace", 13: "King", 12: "Queen", 11: "Jack", 10: "Ten", 9: "Nine", 8: "Eight", 7: "Seven", 6: "Six", 5: "Five", 4: "Four", 3: "Three", 2: "Two" };
  const HAND_RANK_PLURALS = { 14: "Aces", 13: "Kings", 12: "Queens", 11: "Jacks", 10: "Tens", 9: "Nines", 8: "Eights", 7: "Sevens", 6: "Sixes", 5: "Fives", 4: "Fours", 3: "Threes", 2: "Twos" };

  function createDeck() {
    const deck = [];
    let id = 0;
    for (let suit = 0; suit < 4; suit += 1) {
      for (let rank = 2; rank <= 14; rank += 1) deck.push({ id: id += 1, rank, suit, joker: false });
    }
    deck.push({ id: id += 1, rank: 15, suit: 4, joker: true });
    return deck;
  }

  function shuffledDeck(random = Math.random) {
    const deck = createDeck();
    for (let i = deck.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function cardCode(card) {
    return card.joker ? "X" : `${RANK_LABELS[card.rank]}${"HDCS"[card.suit]}`;
  }

  function cardFromCode(rawCode, id = 0) {
    const code = String(rawCode).trim().toUpperCase();
    if (code === "X" || code === "JK" || code === "JOKER") return { id, rank: 15, suit: 4, joker: true };
    const match = code.match(/^(10|[2-9TJQKA])([HDCS])$/);
    if (!match) throw new Error(`Invalid card code: ${rawCode}`);
    const rankMap = { T: 10, J: 11, Q: 12, K: 13, A: 14 };
    const rank = Number(match[1]) || rankMap[match[1]];
    return { id, rank, suit: "HDCS".indexOf(match[2]), joker: false };
  }

  function labelCard(card) {
    return card.joker ? "Joker" : `${RANK_LABELS[card.rank]} of ${SUIT_NAMES[card.suit]}`;
  }

  function effectiveRank(card) {
    return card.joker ? 14 : card.rank;
  }

  function compareScore(a, b) {
    const length = Math.max(a.length, b.length);
    for (let i = 0; i < length; i += 1) {
      const av = a[i] || 0;
      const bv = b[i] || 0;
      if (av !== bv) return av > bv ? 1 : -1;
    }
    return 0;
  }


  function handRankName(rank, plural = false) {
    return (plural ? HAND_RANK_PLURALS : HAND_RANK_NAMES)[rank] || String(rank);
  }

  function decisiveScoreIndex(firstScore, secondScore, start = 1) {
    const limit = Math.max(firstScore.length, secondScore.length);
    for (let index = start; index < limit; index += 1) {
      if ((firstScore[index] || 0) !== (secondScore[index] || 0)) return index;
    }
    return limit - 1;
  }

  function joinedHandRanks(ranks) {
    return ranks.map(rank => handRankName(rank)).join("-");
  }

  function straightDetail(value, suffix) {
    if (value === 15) return suffix === "straight flush" ? "Royal flush" : "Ace-high straight";
    if (value === 14) return `A-5 ${suffix}`;
    return `${handRankName(value)}-high ${suffix}`;
  }

  function describeHighForComparison(hand, opponent) {
    const score = hand.score;
    const sameCategory = Boolean(opponent && opponent.category === hand.category);
    const decisiveIndex = sameCategory ? decisiveScoreIndex(score, opponent.score) : 1;

    switch (hand.category) {
      case 0: {
        const rankCount = sameCategory ? Math.max(1, decisiveIndex) : 1;
        return `${joinedHandRanks(score.slice(1, 1 + rankCount))} high`;
      }
      case 1: {
        const base = `Pair of ${handRankName(score[1], true)}`;
        if (!sameCategory || decisiveIndex === 1) return base;
        const kickers = score.slice(2, decisiveIndex + 1);
        return `${base} with ${joinedHandRanks(kickers)} ${kickers.length === 1 ? "kicker" : "kickers"}`;
      }
      case 2: {
        const base = `Two pair, ${handRankName(score[1], true)} and ${handRankName(score[2], true)}`;
        if (!sameCategory || decisiveIndex < 3) return base;
        return `${base} with ${handRankName(score[3])} kicker`;
      }
      case 3: {
        const base = `Three ${handRankName(score[1], true)}`;
        if (!sameCategory || decisiveIndex === 1) return base;
        const kickers = score.slice(2, decisiveIndex + 1);
        return `${base} with ${joinedHandRanks(kickers)} ${kickers.length === 1 ? "kicker" : "kickers"}`;
      }
      case 4:
        return straightDetail(score[1], "straight");
      case 5: {
        const rankCount = sameCategory ? Math.max(1, decisiveIndex) : 1;
        return `${joinedHandRanks(score.slice(1, 1 + rankCount))} flush`;
      }
      case 6:
        return `${handRankName(score[1], true)} full of ${handRankName(score[2], true)}`;
      case 7: {
        const base = `Four ${handRankName(score[1], true)}`;
        if (!sameCategory || decisiveIndex === 1) return base;
        return `${base} with ${handRankName(score[2])} kicker`;
      }
      case 8:
        return straightDetail(score[1], "straight flush");
      case 9:
        return "Five Aces";
      default:
        return hand.name;
    }
  }

  function describeLowHand(hand) {
    if (hand.category === 1) return `Pair of ${handRankName(hand.score[1], true)}`;
    return `${handRankName(hand.score[1])}-${handRankName(hand.score[2])} high`;
  }

  function paiGowStraightValue(ranks) {
    const unique = [...new Set(ranks)].sort((a, b) => b - a);
    if (unique.length !== 5) return 0;
    if (unique.join(",") === "14,13,12,11,10") return 15;
    if (unique.join(",") === "14,5,4,3,2") return 14;
    return unique[0] - unique[4] === 4 ? unique[0] : 0;
  }

  function evaluateFiveNatural(cards) {
    const ranks = cards.map(card => card.rank).sort((a, b) => b - a);
    const counts = new Map();
    ranks.forEach(rank => counts.set(rank, (counts.get(rank) || 0) + 1));
    const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
    const flush = cards.every(card => card.suit === cards[0].suit);
    const straightValue = paiGowStraightValue(ranks);
    let score;

    if (groups[0][1] === 5 && groups[0][0] === 14) score = [9, 14];
    else if (flush && straightValue) score = [8, straightValue];
    else if (groups[0][1] === 4) score = [7, groups[0][0], groups[1][0]];
    else if (groups[0][1] === 3 && groups[1][1] === 2) score = [6, groups[0][0], groups[1][0]];
    else if (flush) score = [5, ...ranks];
    else if (straightValue) score = [4, straightValue];
    else if (groups[0][1] === 3) {
      const kickers = groups.filter(group => group[1] === 1).map(group => group[0]).sort((a, b) => b - a);
      score = [3, groups[0][0], ...kickers];
    } else if (groups[0][1] === 2 && groups[1][1] === 2) {
      const pairs = groups.filter(group => group[1] === 2).map(group => group[0]).sort((a, b) => b - a);
      const kicker = groups.find(group => group[1] === 1)[0];
      score = [2, ...pairs, kicker];
    } else if (groups[0][1] === 2) {
      const pair = groups[0][0];
      const kickers = groups.filter(group => group[1] === 1).map(group => group[0]).sort((a, b) => b - a);
      score = [1, pair, ...kickers];
    } else score = [0, ...ranks];

    const category = score[0];
    const name = category === 8 && score[1] === 15 ? "Royal Flush" : FIVE_CATEGORY_NAMES[category];
    return { score, category, name };
  }

  function evaluateFive(cards) {
    if (!Array.isArray(cards) || cards.length !== 5) throw new Error("evaluateFive requires exactly five cards.");
    const jokers = cards.filter(card => card.joker);
    if (jokers.length > 1) throw new Error("Pai Gow uses one Joker.");
    if (!jokers.length) return { ...evaluateFiveNatural(cards), cards: cards.slice(), jokerAs: null };

    const natural = cards.filter(card => !card.joker);
    let best = null;
    for (let suit = 0; suit < 4; suit += 1) {
      for (let rank = 2; rank <= 14; rank += 1) {
        const replacement = { id: jokers[0].id, rank, suit, joker: false, substituted: true };
        const result = evaluateFiveNatural([...natural, replacement]);
        const completesRunOrSuit = result.category === 4 || result.category === 5 || result.category === 8;
        if (rank !== 14 && !completesRunOrSuit) continue;
        if (result.category === 5 && natural.some(card => card.rank === rank)) continue;
        if (!best || compareScore(result.score, best.score) > 0) best = { ...result, jokerAs: replacement };
      }
    }
    return { ...best, cards: cards.slice() };
  }

  function evaluateTwo(cards) {
    if (!Array.isArray(cards) || cards.length !== 2) throw new Error("evaluateTwo requires exactly two cards.");
    const ranks = cards.map(effectiveRank).sort((a, b) => b - a);
    const pair = ranks[0] === ranks[1];
    return {
      score: pair ? [1, ranks[0]] : [0, ...ranks],
      category: pair ? 1 : 0,
      name: pair ? `Pair of ${RANK_LABELS[ranks[0]]}s` : `${RANK_LABELS[ranks[0]]}-${RANK_LABELS[ranks[1]]} high`,
      cards: cards.slice()
    };
  }

  function combinations(items, choose) {
    const result = [];
    function visit(start, picked) {
      if (picked.length === choose) {
        result.push(picked.slice());
        return;
      }
      for (let i = start; i <= items.length - (choose - picked.length); i += 1) {
        picked.push(items[i]);
        visit(i + 1, picked);
        picked.pop();
      }
    }
    visit(0, []);
    return result;
  }

  function sortCards(cards) {
    return cards.slice().sort((a, b) => effectiveRank(b) - effectiveRank(a) || b.suit - a.suit);
  }

  function enumerateSets(cards) {
    if (!Array.isArray(cards) || cards.length !== 7) throw new Error("enumerateSets requires exactly seven cards.");
    return combinations(cards, 2).map(lowCards => {
      const lowIds = new Set(lowCards.map(card => card.id));
      const highCards = cards.filter(card => !lowIds.has(card.id));
      const high = evaluateFive(highCards);
      const low = evaluateTwo(lowCards);
      return {
        highCards: sortCards(highCards),
        lowCards: sortCards(lowCards),
        high,
        low,
        legal: compareScore(high.score, low.score) > 0
      };
    });
  }

  function lowKey(cards) {
    return sortCards(cards).map(card => card.id).join("-");
  }

  function pickLegalByCards(sets, cards) {
    const key = lowKey(cards);
    return sets.find(set => set.legal && lowKey(set.lowCards) === key) || null;
  }

  function chooseBest(sets, scoreFn) {
    const legal = sets.filter(set => set.legal);
    return legal.sort((a, b) => compareScore(scoreFn(b), scoreFn(a)))[0] || null;
  }

  function countRanks(cards) {
    const counts = new Map();
    cards.forEach(card => {
      const rank = effectiveRank(card);
      if (!counts.has(rank)) counts.set(rank, []);
      counts.get(rank).push(card);
    });
    return counts;
  }

  function pairBand(rank) {
    if (rank <= 6) return "low";
    if (rank <= 10) return "medium";
    return "high";
  }

  function topCards(cards, count, excluded = new Set()) {
    return sortCards(cards.filter(card => !excluded.has(card.id))).slice(0, count);
  }

  function houseWaySet(cards) {
    const sets = enumerateSets(cards);
    const legal = sets.filter(set => set.legal);
    if (!legal.length) throw new Error("No legal Pai Gow setting was found.");
    const counts = countRanks(cards);
    const rankedGroups = [...counts.entries()].sort((a, b) => b[1].length - a[1].length || b[0] - a[0]);
    const groupsOf = amount => rankedGroups.filter(group => group[1].length === amount).sort((a, b) => b[0] - a[0]);
    const five = groupsOf(5);
    const quads = groupsOf(4);
    const trips = groupsOf(3);
    const pairs = groupsOf(2);
    const singles = groupsOf(1).flatMap(group => group[1]);
    let chosen = null;
    let rule = "Best legal fallback";

    function accept(lowCards, text) {
      const candidate = pickLegalByCards(sets, lowCards);
      if (candidate) {
        chosen = candidate;
        rule = text;
        return true;
      }
      return false;
    }

    if (five.length) {
      const kings = counts.get(13) || [];
      if (kings.length === 2) accept(kings, "Five Aces with Kings: keep Five Aces behind");
      if (!chosen) accept(five[0][1].slice(0, 2), "Five Aces: split two Aces to the low hand");
    }

    if (!chosen && quads.length) {
      const [quadRank, quadCards] = quads[0];
      const pairGroup = pairs[0] || trips[0];
      if (quadRank === 14 && pairGroup && pairGroup[0] === 13) {
        accept(pairGroup[1].slice(0, 2), "Four Aces with Kings: keep four Aces behind");
      }
      if (!chosen && pairGroup && quadRank !== 14) {
        accept(pairGroup[1].slice(0, 2), "Four of a kind with a pair: keep the four of a kind behind");
      }
      if (!chosen) {
        const other = topCards(cards, 2, new Set(quadCards.map(card => card.id)));
        const hasAceLow = other.some(card => effectiveRank(card) === 14);
        const split = quadRank >= 11 || (quadRank >= 7 && !hasAceLow);
        if (split) accept(quadCards.slice(0, 2), `${RANK_LABELS[quadRank]}s: split the four of a kind`);
        else accept(other, `${RANK_LABELS[quadRank]}s: keep the four of a kind behind`);
      }
    }

    if (!chosen && trips.length >= 2) {
      accept(trips[0][1].slice(0, 2), "Two trips: play a pair from the higher trips in front");
    }

    if (!chosen && trips.length === 1 && pairs.length) {
      if (pairs.length >= 2) {
        accept(pairs[0][1], "Three of a kind with two pairs: play the higher pair in front");
      } else {
        const pairRank = pairs[0][0];
        const ace = singles.find(card => effectiveRank(card) === 14);
        const king = singles.find(card => effectiveRank(card) === 13);
        if (pairRank === 2 && ace && king) accept([ace, king], "Full house exception: keep deuces with the trips and play A-K in front");
        if (!chosen) accept(pairs[0][1], "Full house: split the pair to the low hand");
      }
    }

    if (!chosen && pairs.length >= 3) {
      accept(pairs[0][1], "Three pairs: play the highest pair in front");
    }

    if (!chosen && pairs.length === 2) {
      const highPair = pairs[0];
      const lowPair = pairs[1];
      const highBand = pairBand(highPair[0]);
      const lowBand = pairBand(lowPair[0]);
      const aceSingleton = singles.find(card => effectiveRank(card) === 14);
      if (highBand === "low" && lowBand === "low") {
        const excluded = new Set([...highPair[1], ...lowPair[1]].map(card => card.id));
        const keptPairs = pickLegalByCards(sets, topCards(cards, 2, excluded));
        const preserving = legal
          .filter(set => set.high.category >= 4)
          .sort((a, b) => compareScore(b.low.score, a.low.score) || compareScore(b.high.score, a.high.score))[0];
        if (preserving && !(aceSingleton && keptPairs)) {
          chosen = preserving;
          rule = "Two low pairs: preserve the straight or flush because no Ace can play in front";
        }
      }
      const alwaysSplit = highPair[0] === 14 || (highBand === "high" && (lowBand === "medium" || lowBand === "high"));
      const neverSplit = highBand === "low" && lowBand === "low";
      const split = alwaysSplit || (!neverSplit && !aceSingleton);
      if (!chosen && split) accept(lowPair[1], "Two pairs: split and play the lower pair in front");
      else if (!chosen) {
        const excluded = new Set([...highPair[1], ...lowPair[1]].map(card => card.id));
        accept(topCards(cards, 2, excluded), "Two pairs: keep both pairs behind");
      }
    }

    if (!chosen && trips.length === 1) {
      const [tripRank, tripCards] = trips[0];
      const straightOrFlush = legal
        .filter(set => set.high.category >= 4 && set.low.category === 1 && set.low.score[1] === tripRank)
        .sort((a, b) => compareScore(b.low.score, a.low.score) || compareScore(b.high.score, a.high.score))[0];
      if (straightOrFlush) {
        chosen = straightOrFlush;
        rule = "Preserve the straight or flush and play a pair in front";
      } else if (tripRank === 14) {
        const ace = tripCards[0];
        const companion = topCards(cards, 1, new Set([ace.id, ...tripCards.slice(1).map(card => card.id)]))[0] || topCards(cards, 1, new Set([ace.id]))[0];
        accept([ace, companion], "Three Aces: split one Ace to the low hand");
      } else {
        const excluded = new Set(tripCards.map(card => card.id));
        accept(topCards(cards, 2, excluded), "Three of a kind: keep the trips behind");
      }
    }

    if (!chosen && pairs.length === 1) {
      const [pairRank, pairCards] = pairs[0];
      const preserving = legal
        .filter(set => set.high.category >= 4 && set.low.category === 1 && set.low.score[1] === pairRank)
        .sort((a, b) => compareScore(b.low.score, a.low.score) || compareScore(b.high.score, a.high.score))[0];
      if (preserving) {
        chosen = preserving;
        rule = "Preserve the straight or flush and play the pair in front";
      } else {
        const excluded = new Set(pairCards.map(card => card.id));
        accept(topCards(cards, 2, excluded), "One pair: keep the pair behind and play the highest cards in front");
      }
    }

    if (!chosen && !pairs.length && !trips.length && !quads.length && !five.length) {
      const made = legal
        .filter(set => set.high.category >= 4)
        .sort((a, b) => compareScore(b.low.score, a.low.score) || compareScore(b.high.score, a.high.score))[0];
      if (made) {
        chosen = made;
        rule = "Straight/flush: preserve the hand while maximizing the low hand";
      } else {
        const ordered = sortCards(cards);
        accept([ordered[1], ordered[2]], "No pair: play the second- and third-highest cards in front");
      }
    }

    if (!chosen) {
      chosen = chooseBest(legal, set => [...set.low.score, ...set.high.score]);
      rule = "Highest legal low hand without fouling";
    }
    return { ...chosen, houseRule: rule };
  }

  function dealerHasAceHighPaiGow(dealerCardsOrSet) {
    const dealerSet = Array.isArray(dealerCardsOrSet)
      ? houseWaySet(dealerCardsOrSet)
      : dealerCardsOrSet;
    return Boolean(
      dealerSet &&
      dealerSet.high &&
      dealerSet.low &&
      dealerSet.high.category === 0 &&
      dealerSet.high.score[1] === 14 &&
      dealerSet.low.category === 0
    );
  }

  function compareSets(playerSet, dealerSet) {
    const highComparison = compareScore(playerSet.high.score, dealerSet.high.score);
    const lowComparison = compareScore(playerSet.low.score, dealerSet.low.score);
    if (dealerHasAceHighPaiGow(dealerSet)) return { outcome: "push", highComparison, lowComparison, aceHighPush: true };
    const wins = Number(highComparison > 0) + Number(lowComparison > 0);
    const outcome = wins === 2 ? "win" : wins === 1 ? "push" : "loss";
    return { outcome, highComparison, lowComparison, aceHighPush: false };
  }

  function findBestPlayerSet(playerCards, dealerSet) {
    const sets = enumerateSets(playerCards).filter(set => set.legal).map(set => ({ ...set, result: compareSets(set, dealerSet) }));
    const priority = { win: 2, push: 1, loss: 0 };
    sets.sort((a, b) => {
      const outcomeDifference = priority[b.result.outcome] - priority[a.result.outcome];
      if (outcomeDifference) return outcomeDifference;
      return compareScore(b.low.score, a.low.score) || compareScore(b.high.score, a.high.score);
    });
    const best = sets[0];
    return {
      best,
      sets,
      canWin: sets.some(set => set.result.outcome === "win"),
      canPush: sets.some(set => set.result.outcome === "push")
    };
  }

  function isAccurateSet(playerSet, dealerSet) {
    const solution = findBestPlayerSet([...playerSet.highCards, ...playerSet.lowCards], dealerSet);
    const result = compareSets(playerSet, dealerSet);
    return { accurate: result.outcome === solution.best.result.outcome, result, solution };
  }

  const api = {
    RANK_LABELS,
    SUITS,
    SUIT_NAMES,
    FIVE_CATEGORY_NAMES,
    createDeck,
    shuffledDeck,
    cardCode,
    cardFromCode,
    labelCard,
    effectiveRank,
    compareScore,
    describeHighForComparison,
    describeLowHand,
    evaluateFive,
    evaluateTwo,
    enumerateSets,
    houseWaySet,
    dealerHasAceHighPaiGow,
    compareSets,
    findBestPlayerSet,
    isAccurateSet,
    sortCards
  };

  root.PaiGowEngine = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
