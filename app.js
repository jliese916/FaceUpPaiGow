"use strict";

(() => {
  const E = window.PaiGowEngine;
  if (!E) throw new Error("PaiGowEngine did not load.");

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const STORAGE_KEY = "casaFaceUpPaiGowPlayV1";
  const CHALLENGE_HANDS = 100;
  const SUIT_CLASSES = ["suit-hearts", "suit-diamonds", "suit-clubs", "suit-spades"];
  const FAN_ANGLES = [-15, -10, -5, 0, 5, 10, 15];
  const SETTING_PROMPT = "Select two cards for the player low hand, or muck.";

  const el = {
    tabs: $$(".mode-tab"),
    modeTabs: $("#modeTabs"),
    panels: { play: $("#playPanel"), train: $("#trainPanel"), lookup: $("#lookupPanel") },
    challengeLaunch: $("#challengeLaunch"),
    challengePanel: $("#challengePanel"),
    challengeGame: $("#challengeGame"),
    challengeSummary: $("#challengeSummary"),
    challengeProgress: $("#challengeProgress"),
    challengeStage: $("#challengeStage"),
    challengeMessage: $("#challengeMessage"),
    challengeSet: $("#challengeSet"),
    challengeMuck: $("#challengeMuck"),
    challengeNext: $("#challengeNext"),
    challengeExit: $("#challengeExit"),
    playStage: $("#playStage"),
    playMessage: $("#playMessage"),
    playSet: $("#playSet"),
    playMuck: $("#playMuck"),
    playDeal: $("#playDeal"),
    playBalance: $("#playBalance"),
    playAccuracy: $("#playAccuracy"),
    playIndicator: $("#playIndicator"),
    playChart: $("#playBalanceChart"),
    playChartSummary: $("#playChartSummary"),
    playDeltaSummary: $("#playDeltaSummary"),
    completedHands: $("#completedHands"),
    playWins: $("#playWins"),
    playPushes: $("#playPushes"),
    playLosses: $("#playLosses"),
    resetPlay: $("#resetPlay"),
    mistakeSummary: $("#mistakeSummary"),
    mistakeList: $("#mistakeList"),
    trainStage: $("#trainStage"),
    trainMessage: $("#trainMessage"),
    trainSet: $("#trainSet"),
    trainMuck: $("#trainMuck"),
    trainNext: $("#trainNext"),
    trainScore: $("#trainScore"),
    trainAccuracy: $("#trainAccuracy"),
    trainIndicator: $("#trainIndicator"),
    resetTrain: $("#resetTrain"),
    lookupDealer: $("#lookupDealer"),
    lookupPlayer: $("#lookupPlayer"),
    rankPicker: $("#rankPicker"),
    suitPicker: $("#suitPicker"),
    importFromPlay: $("#importFromPlay"),
    removeLookup: $("#removeLookup"),
    clearLookup: $("#clearLookup"),
    findBestSet: $("#findBestSet"),
    lookupMessage: $("#lookupMessage"),
    lookupResult: $("#lookupResult")
  };

  const state = {
    mode: "play",
    play: loadPlay(),
    train: { total: 0, correct: 0, round: null },
    challenge: { active: false, number: 0, correct: 0, round: null, misses: [] },
    lookup: emptyLookup()
  };

  function emptyPlay() {
    return {
      balance: 0,
      optimalBalance: 0,
      hands: 0,
      correct: 0,
      wins: 0,
      pushes: 0,
      losses: 0,
      history: [0],
      optimalHistory: [0],
      mistakes: [],
      round: null
    };
  }

  function loadPlay() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return emptyPlay();
      const balance = Number(saved.balance) || 0;
      const history = Array.isArray(saved.history) && saved.history.length && saved.history.every(value => Number.isFinite(Number(value)))
        ? saved.history.map(Number)
        : (balance === 0 ? [0] : [0, balance]);
      const hasOptimalBalance = saved.optimalBalance !== undefined && Number.isFinite(Number(saved.optimalBalance));
      const optimalBalance = hasOptimalBalance ? Number(saved.optimalBalance) : balance;
      const optimalHistory = Array.isArray(saved.optimalHistory) && saved.optimalHistory.length && saved.optimalHistory.every(value => Number.isFinite(Number(value)))
        ? saved.optimalHistory.map(Number)
        : [...history];
      return {
        ...emptyPlay(),
        balance,
        optimalBalance,
        hands: Number(saved.hands) || 0,
        correct: Number(saved.correct) || 0,
        wins: Number(saved.wins) || 0,
        pushes: Number(saved.pushes) || 0,
        losses: Number(saved.losses) || 0,
        history,
        optimalHistory,
        mistakes: Array.isArray(saved.mistakes) ? saved.mistakes.slice(-25) : []
      };
    } catch (error) {
      console.warn("Could not load the Face Up Pai Gow session.", error);
      return emptyPlay();
    }
  }

  function savePlay() {
    try {
      const p = state.play;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        balance: p.balance,
        optimalBalance: p.optimalBalance,
        hands: p.hands,
        correct: p.correct,
        wins: p.wins,
        pushes: p.pushes,
        losses: p.losses,
        history: p.history.slice(-301),
        optimalHistory: p.optimalHistory.slice(-301),
        mistakes: p.mistakes.slice(-25)
      }));
    } catch (error) {
      console.warn("Could not save the Face Up Pai Gow session.", error);
    }
  }

  function emptyLookup() {
    return { dealer: Array(7).fill(null), player: Array(7).fill(null), activeHand: "dealer", activeIndex: 0, rank: null, nextId: 10000 };
  }

  function formatUnits(value, signed = false) {
    const sign = signed && value > 0 ? "+" : "";
    return `${sign}${value} ${Math.abs(value) === 1 ? "unit" : "units"}`;
  }

  function resultUnits(outcome) {
    return outcome === "win" ? 1 : outcome === "loss" ? -1 : 0;
  }

  function bestOutcome(analysis) {
    return analysis.best.result.outcome;
  }

  function outcomeLabel(outcome) {
    return outcome === "win" ? "Win" : outcome === "push" ? "Push" : "Loss";
  }

  function deltaLabel(value) {
    if (value === 0) return "0 units";
    return `${value > 0 ? "+" : "−"}${Math.abs(value)} ${Math.abs(value) === 1 ? "unit" : "units"}`;
  }

  function percent(correct, total) {
    return total ? `${(100 * correct / total).toFixed(1)}%` : "0.0%";
  }

  function cardElement(card, options = {}) {
    const { button = false, back = false, placeholder = false, selected = false, active = false, className = "", index = 0 } = options;
    const node = document.createElement(button ? "button" : "div");
    if (button) node.type = "button";
    node.className = `card ${className}${back ? " card-back" : ""}${placeholder ? " placeholder" : ""}${selected ? " selected" : ""}${active ? " active" : ""}`.trim();
    node.style.setProperty("--i", String(index));
    if (placeholder) {
      node.setAttribute("aria-label", "Empty card slot");
      return node;
    }
    if (back) {
      node.setAttribute("aria-label", "Face-down card");
      return node;
    }
    if (card.joker) {
      node.classList.add("joker-card");
      node.innerHTML = `<span class="joker-corner joker-corner-top">★</span><span class="joker-word">JOKER</span><span class="joker-stripes joker-stripes-left"><i></i><i></i></span><span class="joker-star">★</span><span class="joker-stripes joker-stripes-right"><i></i><i></i></span><span class="joker-corner joker-corner-bottom">★</span>`;
    } else {
      const suitClass = SUIT_CLASSES[card.suit];
      node.classList.add(suitClass);
      node.innerHTML = `<span class="card-suit card-suit-top">${E.SUITS[card.suit]}</span><span class="card-rank">${E.RANK_LABELS[card.rank]}</span><span class="card-suit card-suit-bottom">${E.SUITS[card.suit]}</span>`;
    }
    node.setAttribute("aria-label", E.labelCard(card));
    return node;
  }

  function miniCardMarkup(cardOrCode) {
    const card = typeof cardOrCode === "string" ? E.cardFromCode(cardOrCode) : cardOrCode;
    if (card.joker) return `<span class="mini-card" title="Joker">★</span>`;
    return `<span class="mini-card ${SUIT_CLASSES[card.suit]}" title="${E.labelCard(card)}">${E.RANK_LABELS[card.rank]}${E.SUITS[card.suit]}</span>`;
  }

  function newRound() {
    const deck = E.shuffledDeck();
    const playerCards = deck.slice(0, 7);
    const dealerCards = deck.slice(7, 14);
    const dealerSet = E.houseWaySet(dealerCards);
    const automaticPush = E.dealerHasAceHighPaiGow(dealerCards);
    return {
      playerCards,
      dealerCards,
      dealerSet,
      selected: [],
      completed: false,
      automaticPush,
      playerSet: null,
      analysis: null,
      result: null,
      accurate: null,
      mucked: false,
      justDealt: true,
      message: automaticPush
        ? "Dealer Ace-high Pai Gow — every player hand automatically pushes. No setting is needed."
        : SETTING_PROMPT,
      messageClass: automaticPush ? "correct" : ""
    };
  }

  function renderCardRow(container, cards, className = "", animated = false) {
    container.replaceChildren();
    cards.forEach((card, index) => {
      const node = cardElement(card, { className: animated ? `${className} deal-in` : className, index });
      container.append(node);
    });
  }

  function makeSetLayout(set, owner, animated = false) {
    const wrap = document.createElement("div");
    wrap.className = owner === "dealer" ? "dealer-layout" : "player-set-layout";
    const highLabel = document.createElement("div");
    highLabel.className = "split-label";
    highLabel.textContent = `${owner === "dealer" ? "Dealer" : "Player"} High Hand`;
    const high = document.createElement("div");
    high.className = owner === "dealer" ? "dealer-high" : "set-row";
    renderCardRow(high, set.highCards, "", animated);
    const lowLabel = document.createElement("div");
    lowLabel.className = "split-label";
    lowLabel.textContent = `${owner === "dealer" ? "Dealer" : "Player"} Low Hand`;
    const low = document.createElement("div");
    low.className = owner === "dealer" ? "dealer-low" : "set-row";
    renderCardRow(low, set.lowCards, "", animated);
    if (owner === "dealer") wrap.append(highLabel, high, lowLabel, low);
    else wrap.append(lowLabel, low, highLabel, high);
    return wrap;
  }

  function comparisonText(value) {
    if (value > 0) return "Player wins";
    if (value === 0) return "Dealer wins the tie";
    return "Dealer wins";
  }

  function resultDisclosure(round) {
    const result = round.result;
    const disclosure = document.createElement("details");
    disclosure.className = "result-disclosure";
    const summary = document.createElement("summary");
    summary.className = `set-result-banner ${result.outcome}`;
    summary.textContent = result.outcome === "win" ? "Player Wins" : result.outcome === "push" ? "Push" : "Dealer Wins";
    const panel = document.createElement("div");
    panel.className = "result-detail-panel";

    const detailRow = (label, text, className = "") => {
      const row = document.createElement("div");
      row.className = `result-detail-row${className ? ` ${className}` : ""}`;
      const term = document.createElement("span");
      term.textContent = label;
      const value = document.createElement("strong");
      value.textContent = text;
      row.append(term, value);
      return row;
    };

    if (round.mucked) {
      panel.append(
        detailRow("Dealer high hand", E.describeHighForComparison(round.dealerSet.high, null)),
        detailRow("Dealer low hand", E.describeLowHand(round.dealerSet.low)),
        detailRow("Player hand", "Mucked"),
        detailRow("Net result", formatUnits(-1, true), "net-result")
      );
    } else {
      panel.append(
        detailRow("High hand", `${E.describeHighForComparison(round.playerSet.high, round.dealerSet.high)} vs. ${E.describeHighForComparison(round.dealerSet.high, round.playerSet.high)} — ${comparisonText(result.highComparison)}`),
        detailRow("Low hand", `${E.describeLowHand(round.playerSet.low)} vs. ${E.describeLowHand(round.dealerSet.low)} — ${comparisonText(result.lowComparison)}`),
        detailRow("Net result", formatUnits(resultUnits(result.outcome), true), "net-result")
      );
    }
    disclosure.append(summary, panel);
    return disclosure;
  }

  function automaticPushBanner() {
    const disclosure = document.createElement("details");
    disclosure.className = "result-disclosure automatic-push-result";
    const summary = document.createElement("summary");
    summary.className = "set-result-banner push";
    summary.textContent = "Automatic Push";
    const panel = document.createElement("div");
    panel.className = "result-detail-panel";
    panel.innerHTML = `<div class="result-detail-row"><span>Reason</span><strong>Dealer Ace-high Pai Gow</strong></div><div class="result-detail-row net-result"><span>Net result</span><strong>0 units</strong></div>`;
    disclosure.append(summary, panel);
    return disclosure;
  }

  function emptyStage(container) {
    container.replaceChildren();
    const dealer = document.createElement("div");
    dealer.className = "hand-zone";
    const highLabel = document.createElement("div");
    highLabel.className = "split-label";
    highLabel.textContent = "Dealer High Hand";
    const high = document.createElement("div");
    high.className = "dealer-high";
    for (let i = 0; i < 5; i += 1) high.append(cardElement(null, { placeholder: true }));
    const lowLabel = document.createElement("div");
    lowLabel.className = "split-label";
    lowLabel.textContent = "Dealer Low Hand";
    const low = document.createElement("div");
    low.className = "dealer-low";
    for (let i = 0; i < 2; i += 1) low.append(cardElement(null, { placeholder: true }));
    dealer.append(highLabel, high, lowLabel, low);
    const player = document.createElement("div");
    player.className = "hand-zone player-zone";
    const fan = document.createElement("div");
    fan.className = "player-fan";
    for (let i = 0; i < 7; i += 1) {
      const back = cardElement(null, { back: true, className: "fan-card", index: i });
      back.style.setProperty("--angle", `${FAN_ANGLES[i]}deg`);
      fan.append(back);
    }
    player.append(fan);
    container.append(dealer, player);
  }

  function renderStage(container, round, mode) {
    if (!round) {
      emptyStage(container);
      return;
    }
    container.replaceChildren();
    const dealerZone = document.createElement("div");
    dealerZone.className = "hand-zone";
    dealerZone.append(makeSetLayout(round.dealerSet, "dealer", round.justDealt));

    const playerZone = document.createElement("div");
    playerZone.className = "hand-zone player-zone";
    if (round.automaticPush) {
      const fan = document.createElement("div");
      fan.className = `player-fan${round.justDealt ? " animate" : ""}`;
      E.sortCards(round.playerCards).forEach((card, index) => {
        const node = cardElement(card, { className: "fan-card", index });
        node.style.setProperty("--angle", `${FAN_ANGLES[index]}deg`);
        fan.append(node);
      });
      playerZone.append(fan, automaticPushBanner());
    } else if (round.completed) {
      if (round.mucked) {
        const fan = document.createElement("div");
        fan.className = "player-fan";
        E.sortCards(round.playerCards).forEach((card, index) => {
          const node = cardElement(card, { className: "fan-card", index });
          node.style.setProperty("--angle", `${FAN_ANGLES[index]}deg`);
          fan.append(node);
        });
        playerZone.append(fan);
      } else {
        playerZone.append(makeSetLayout(round.playerSet, "player"));
      }
      playerZone.append(resultDisclosure(round));
    } else {
      const fan = document.createElement("div");
      fan.className = `player-fan${round.justDealt ? " animate" : ""}`;
      E.sortCards(round.playerCards).forEach((card, index) => {
        const selected = round.selected.includes(card.id);
        const node = cardElement(card, { button: true, className: "fan-card", selected, index });
        node.style.setProperty("--angle", `${FAN_ANGLES[index]}deg`);
        node.setAttribute("aria-pressed", String(selected));
        node.addEventListener("click", () => toggleCard(mode, card.id));
        fan.append(node);
      });
      playerZone.append(fan);
    }
    container.append(dealerZone, playerZone);
    round.justDealt = false;
  }

  function roundFor(mode) {
    if (mode === "play") return state.play.round;
    if (mode === "train") return state.train.round;
    return state.challenge.round;
  }

  function controlsFor(mode) {
    if (mode === "play") return { set: el.playSet, muck: el.playMuck, next: el.playDeal, message: el.playMessage, stage: el.playStage };
    if (mode === "train") return { set: el.trainSet, muck: el.trainMuck, next: el.trainNext, message: el.trainMessage, stage: el.trainStage };
    return { set: el.challengeSet, muck: el.challengeMuck, next: el.challengeNext, message: el.challengeMessage, stage: el.challengeStage };
  }

  function toggleCard(mode, id) {
    const round = roundFor(mode);
    if (!round || round.completed) return;
    if (E.dealerHasAceHighPaiGow(round.dealerCards)) {
      settleAutomaticPush(mode, round);
      renderRound(mode);
      return;
    }
    const index = round.selected.indexOf(id);
    if (index >= 0) {
      round.selected.splice(index, 1);
      round.message = SETTING_PROMPT;
      round.messageClass = "";
    } else if (round.selected.length < 2) {
      round.selected.push(id);
      round.message = SETTING_PROMPT;
      round.messageClass = "";
    }
    else {
      round.message = "Two cards are already selected. Tap one to put it back first.";
      round.messageClass = "error";
    }
    renderRound(mode);
  }

  function setSnapshot(set) {
    return { high: set.highCards.map(E.cardCode), low: set.lowCards.map(E.cardCode), highName: set.high.name, lowName: set.low.name };
  }

  function mistakeSnapshot(round, number = null) {
    return {
      number,
      dealer: setSnapshot(round.dealerSet),
      chosen: round.playerSet ? setSnapshot(round.playerSet) : null,
      optimal: setSnapshot(round.analysis.best),
      outcome: round.result.outcome,
      optimalOutcome: bestOutcome(round.analysis),
      mucked: round.mucked
    };
  }

  function selectedPlayerSet(round) {
    const key = round.selected.slice().sort((a, b) => a - b).join("-");
    return E.enumerateSets(round.playerCards).find(set => set.lowCards.map(card => card.id).sort((a, b) => a - b).join("-") === key) || null;
  }

  function submitSet(mode) {
    const round = roundFor(mode);
    if (!round || round.completed) return;
    if (E.dealerHasAceHighPaiGow(round.dealerCards)) {
      settleAutomaticPush(mode, round);
      renderRound(mode);
      return;
    }
    if (round.selected.length !== 2) return;
    const playerSet = selectedPlayerSet(round);
    if (!playerSet || !playerSet.legal) {
      round.message = "That is a foul: the five-card bottom hand must beat the two-card top hand. Choose another two cards.";
      round.messageClass = "error";
      renderRound(mode);
      return;
    }
    round.playerSet = playerSet;
    round.analysis = E.findBestPlayerSet(round.playerCards, round.dealerSet);
    round.result = E.compareSets(playerSet, round.dealerSet);
    round.accurate = round.result.outcome === bestOutcome(round.analysis);
    round.completed = true;
    round.messageClass = round.accurate ? "correct" : "incorrect";
    round.message = "";

    if (mode === "play") completePlayRound(round);
    else if (mode === "train") completeTrainRound(round);
    else completeChallengeRound(round);
    renderRound(mode);
  }

  function muckHand(mode) {
    if (mode !== "play" && mode !== "train" && mode !== "challenge") return;
    const round = roundFor(mode);
    if (!round || round.completed || round.selected.length > 1) return;
    if (E.dealerHasAceHighPaiGow(round.dealerCards)) {
      settleAutomaticPush(mode, round);
      renderRound(mode);
      return;
    }
    round.analysis = E.findBestPlayerSet(round.playerCards, round.dealerSet);
    round.playerSet = null;
    round.result = { outcome: "loss", highComparison: null, lowComparison: null, mucked: true };
    round.accurate = bestOutcome(round.analysis) === "loss";
    round.mucked = true;
    round.completed = true;
    round.message = "";
    round.messageClass = round.accurate ? "correct" : "incorrect";
    if (mode === "play") completePlayRound(round);
    else if (mode === "train") completeTrainRound(round);
    else completeChallengeRound(round);
    renderRound(mode);
  }

  function completePlayRound(round) {
    const p = state.play;
    p.hands += 1;
    if (round.accurate) p.correct += 1;
    if (round.result.outcome === "win") p.wins += 1;
    else if (round.result.outcome === "push") p.pushes += 1;
    else p.losses += 1;
    p.balance += resultUnits(round.result.outcome);
    const optimalOutcome = round.automaticPush ? "push" : round.analysis.best.result.outcome;
    p.optimalBalance += resultUnits(optimalOutcome);
    p.history.push(p.balance);
    p.optimalHistory.push(p.optimalBalance);
    if (p.history.length > 301) p.history.shift();
    if (p.optimalHistory.length > 301) p.optimalHistory.shift();
    if (!round.accurate) p.mistakes.push(mistakeSnapshot(round, p.hands));
    if (p.mistakes.length > 25) p.mistakes.shift();
    savePlay();
    pulseIndicator("play", round.accurate);
  }

  function completeTrainRound(round) {
    state.train.total += 1;
    if (round.accurate) state.train.correct += 1;
    pulseIndicator("train", round.accurate);
  }

  function completeChallengeRound(round) {
    const challenge = state.challenge;
    if (round.accurate) challenge.correct += 1;
    else challenge.misses.push(mistakeSnapshot(round, challenge.number));

    if (challenge.number >= CHALLENGE_HANDS) {
      finishChallenge();
      return;
    }

    // Challenge feedback stays sealed: record the decision and immediately
    // replace the completed round before anything can reveal its result.
    challenge.number += 1;
    challenge.round = newRound();
    if (!challenge.round.automaticPush) challenge.round.message = SETTING_PROMPT;
    settleAutomaticPush("challenge", challenge.round);
  }

  function pulseIndicator(mode, correct) {
    const indicator = mode === "train" ? el.trainIndicator : el.playIndicator;
    indicator.textContent = correct ? "+" : "−";
    indicator.className = `decision-indicator visible ${correct ? "correct" : "incorrect"}`;
    void indicator.offsetWidth;
    indicator.classList.add("pulse");
  }

  function settleAutomaticPush(mode, round) {
    if (!round || round.completed) return;
    round.automaticPush = E.dealerHasAceHighPaiGow(round.dealerCards);
    if (!round.automaticPush) return;
    round.completed = true;
    round.accurate = true;
    round.result = { outcome: "push", highComparison: 0, lowComparison: 0, aceHighPush: true };
    round.message = "Dealer Ace-high Pai Gow — every player hand automatically pushes. No setting is needed.";
    round.messageClass = "correct";
    if (mode === "play") completePlayRound(round);
    else if (mode === "train") completeTrainRound(round);
    else completeChallengeRound(round);
  }

  function startRound(mode) {
    const round = newRound();
    if (mode === "challenge" && !round.automaticPush) round.message = SETTING_PROMPT;
    if (mode === "play") state.play.round = round;
    else if (mode === "train") state.train.round = round;
    else state.challenge.round = round;
    settleAutomaticPush(mode, round);
    renderRound(mode);
  }

  function renderRound(mode) {
    const round = roundFor(mode);
    const controls = controlsFor(mode);
    if (round && !round.completed && E.dealerHasAceHighPaiGow(round.dealerCards)) settleAutomaticPush(mode, round);
    renderStage(controls.stage, round, mode);
    controls.message.textContent = round ? round.message : (mode === "play" ? "Press Deal to begin." : SETTING_PROMPT);
    controls.message.className = `table-message${round && round.messageClass ? ` ${round.messageClass}` : ""}`;
    const activeRound = Boolean(round && !round.completed && !round.automaticPush);
    const canSet = activeRound && round.selected.length === 2;
    const canMuck = activeRound && round.selected.length <= 1;
    controls.set.disabled = !canSet;
    controls.next.disabled = Boolean(round && !round.completed);
    if (mode === "play") {
      controls.next.textContent = round && round.completed ? "Deal Again" : "Deal";
      controls.muck.disabled = !canMuck;
      controls.muck.classList.toggle("hidden", !canMuck);
      controls.set.classList.toggle("hidden", !canSet);
      controls.next.classList.toggle("hidden", Boolean(round && !round.completed));
    }
    if (mode === "train") {
      controls.next.classList.toggle("hidden", !round || !round.completed);
      controls.muck.disabled = !canMuck;
      controls.muck.classList.toggle("hidden", !canMuck);
      controls.set.classList.toggle("hidden", !canSet);
    }
    if (mode === "challenge") {
      controls.muck.disabled = !canMuck;
      controls.muck.classList.toggle("hidden", !canMuck);
      controls.set.classList.toggle("hidden", !canSet);
      controls.next.disabled = true;
      controls.next.classList.add("hidden");
      el.challengeProgress.textContent = `Hand ${state.challenge.number} of ${CHALLENGE_HANDS}`;
    }
    renderStats();
  }

  function renderStats() {
    const p = state.play;
    el.playBalance.textContent = formatUnits(p.balance);
    el.playBalance.classList.toggle("positive", p.balance > 0);
    el.playBalance.classList.toggle("negative", p.balance < 0);
    el.playAccuracy.textContent = p.hands ? percent(p.correct, p.hands) : "NA";
    el.completedHands.textContent = String(p.hands);
    el.playWins.textContent = String(p.wins);
    el.playPushes.textContent = String(p.pushes);
    el.playLosses.textContent = String(p.losses);
    el.playChartSummary.textContent = `${p.hands} completed ${p.hands === 1 ? "hand" : "hands"}`;
    const delta = p.optimalBalance - p.balance;
    el.playDeltaSummary.textContent = `Optimal − you: ${deltaLabel(delta)}`;
    el.playDeltaSummary.classList.toggle("behind", delta > 0);
    el.playDeltaSummary.classList.toggle("ahead", delta < 0);
    el.trainScore.textContent = `${state.train.correct} / ${state.train.total}`;
    el.trainAccuracy.textContent = percent(state.train.correct, state.train.total);
    renderMistakes();
    requestAnimationFrame(drawBalanceChart);
  }

  function renderMiniSet(snapshot) {
    if (!snapshot) return `<div class="mucked-mini-set">Hand mucked</div>`;
    return `<div class="mini-set"><div><div class="mini-hand">${snapshot.high.map(miniCardMarkup).join("")}</div><div class="mini-hand">${snapshot.low.map(miniCardMarkup).join("")}</div></div><small>${snapshot.highName}<br>${snapshot.lowName}</small></div>`;
  }

  function renderMistakes() {
    const mistakes = state.play.mistakes;
    el.mistakeSummary.textContent = `Review missed best results (${mistakes.length})`;
    if (!mistakes.length) {
      el.mistakeList.innerHTML = `<p class="set-result-detail">No missed best results in this session.</p>`;
      return;
    }
    el.mistakeList.innerHTML = mistakes.slice().reverse().map(mistake => {
      const optimal = mistake.optimal || mistake.winning;
      const optimalOutcome = mistake.optimalOutcome || "win";
      const decision = mistake.mucked ? "mucked the hand" : `played for a ${mistake.outcome}`;
      return `<article class="mistake-card"><h3>Hand ${mistake.number}: ${decision}; a ${optimalOutcome} was available</h3><p>Your play</p>${renderMiniSet(mistake.chosen)}<p>One best-result setting · ${outcomeLabel(optimalOutcome)}</p>${renderMiniSet(optimal)}</article>`;
    }).join("");
  }

  function drawBalanceChart() {
    const canvas = el.playChart;
    if (!canvas || canvas.offsetParent === null) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(280, rect.width);
    const height = Math.max(150, rect.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const actualValues = state.play.history.length ? state.play.history : [0];
    const optimalValues = state.play.optimalHistory.length ? state.play.optimalHistory : [0];
    const allValues = [...actualValues, ...optimalValues];
    const pointCount = Math.max(actualValues.length, optimalValues.length);
    const min = Math.min(0, ...allValues);
    const max = Math.max(0, ...allValues);
    const spread = Math.max(4, max - min);
    const low = min - spread * .18;
    const high = max + spread * .18;
    const left = 40, right = 88, top = 12, bottom = 25;
    const xAt = index => left + (pointCount === 1 ? 0 : index / (pointCount - 1) * (width - left - right));
    const yAt = value => top + (high - value) / (high - low || 1) * (height - top - bottom);
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillStyle = "rgba(232,226,207,.72)";
    ctx.strokeStyle = "rgba(232,226,207,.14)";
    for (let i = 0; i <= 4; i += 1) {
      const value = high - (high - low) * i / 4;
      const y = yAt(value);
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke();
      ctx.fillText(String(Math.round(value)), 6, y + 4);
    }
    const zeroY = yAt(0);
    ctx.save();
    ctx.strokeStyle = "rgba(231,200,106,.4)";
    ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(left, zeroY); ctx.lineTo(width - right, zeroY); ctx.stroke();
    ctx.restore();

    const buildPath = values => {
      ctx.beginPath();
      values.forEach((value, index) => index ? ctx.lineTo(xAt(index), yAt(value)) : ctx.moveTo(xAt(index), yAt(value)));
    };

    if (actualValues.length > 1) {
      const drawClippedLine = (clipTop, clipBottom, color) => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, clipTop, width, Math.max(0, clipBottom - clipTop));
        ctx.clip();
        buildPath(actualValues);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.stroke();
        ctx.restore();
      };
      drawClippedLine(0, zeroY, "#4ccf79");
      drawClippedLine(zeroY, height, "#ff6b6b");
    }

    if (optimalValues.length > 1) {
      buildPath(optimalValues);
      ctx.strokeStyle = "#e7c86a";
      ctx.lineWidth = 2.25;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.stroke();
    }

    const actualLast = actualValues[actualValues.length - 1];
    const optimalLast = optimalValues[optimalValues.length - 1];
    ctx.fillStyle = actualLast >= 0 ? "#4ccf79" : "#ff6b6b";
    ctx.beginPath(); ctx.arc(xAt(actualValues.length - 1), yAt(actualLast), 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#e7c86a";
    ctx.beginPath(); ctx.arc(xAt(optimalValues.length - 1), yAt(optimalLast), 3.5, 0, Math.PI * 2); ctx.fill();

    const delta = optimalLast - actualLast;
    const actualY = yAt(actualLast);
    const optimalY = yAt(optimalLast);
    const topY = Math.min(actualY, optimalY);
    const bottomY = Math.max(actualY, optimalY);
    const bracketX = xAt(pointCount - 1) + 12;
    const labelX = bracketX + 7;
    const labelY = Math.min(height - 11, Math.max(11, (topY + bottomY) / 2));
    const gapLabel = deltaLabel(delta);
    ctx.save();
    ctx.strokeStyle = "rgba(231,200,106,.78)";
    ctx.fillStyle = "#f8f1df";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    if (Math.abs(actualY - optimalY) < 2.5) {
      ctx.beginPath(); ctx.moveTo(bracketX - 4, actualY); ctx.lineTo(bracketX + 4, actualY); ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(bracketX, topY); ctx.lineTo(bracketX, bottomY);
      ctx.moveTo(bracketX - 4, topY); ctx.lineTo(bracketX + 4, topY);
      ctx.moveTo(bracketX - 4, bottomY); ctx.lineTo(bracketX + 4, bottomY);
      ctx.stroke();
    }
    ctx.font = "700 10px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(gapLabel, labelX, labelY);
    ctx.restore();

    ctx.fillStyle = "rgba(232,226,207,.72)";
    ctx.fillText("Hands", width - 43, height - 6);
    canvas.setAttribute("aria-label", `Line chart comparing your bankroll with optimal play. Current optimal-minus-you difference: ${gapLabel}.`);
  }

  function setMode(mode) {
    state.mode = mode;
    el.tabs.forEach(tab => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    Object.entries(el.panels).forEach(([name, panel]) => panel.classList.toggle("hidden", name !== mode));
    if (mode === "train" && !state.train.round) {
      state.train.round = newRound();
      settleAutomaticPush("train", state.train.round);
    }
    if (mode === "lookup") renderLookup();
    if (mode === "play") renderRound("play");
    if (mode === "train") renderRound("train");
  }

  function resetPlay() {
    if (!window.confirm("Reset the bankroll, accuracy, chart, outcomes, and missed-hand history?")) return;
    state.play = emptyPlay();
    localStorage.removeItem(STORAGE_KEY);
    el.playIndicator.className = "decision-indicator";
    renderRound("play");
  }

  function resetTrain() {
    state.train = { total: 0, correct: 0, round: newRound() };
    el.trainIndicator.className = "decision-indicator";
    renderRound("train");
  }

  function setupPickers() {
    const ranks = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
    ranks.forEach(rank => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "picker-button";
      button.dataset.rank = String(rank);
      button.textContent = E.RANK_LABELS[rank];
      button.addEventListener("click", () => {
        state.lookup.rank = rank;
        renderLookupPickers();
      });
      el.rankPicker.append(button);
    });
    const joker = document.createElement("button");
    joker.type = "button";
    joker.className = "picker-button joker-rank-button";
    joker.textContent = "Joker";
    joker.addEventListener("click", addLookupJoker);
    el.rankPicker.append(joker);

    E.SUITS.forEach((suit, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `picker-button suit-button ${SUIT_CLASSES[index]}`;
      button.textContent = suit;
      button.setAttribute("aria-label", E.SUIT_NAMES[index]);
      button.addEventListener("click", () => addLookupCard(index));
      el.suitPicker.append(button);
    });
  }

  function allLookupCards() {
    return [...state.lookup.dealer, ...state.lookup.player].filter(Boolean);
  }

  function addLookupCard(suit) {
    const lookup = state.lookup;
    if (!lookup.rank) {
      setLookupMessage("Choose a rank first.", true);
      return;
    }
    const card = { id: lookup.nextId += 1, rank: lookup.rank, suit, joker: false };
    placeLookupCard(card);
  }

  function addLookupJoker() {
    const lookup = state.lookup;
    placeLookupCard({ id: lookup.nextId += 1, rank: 15, suit: 4, joker: true });
  }

  function placeLookupCard(card) {
    const lookup = state.lookup;
    const code = E.cardCode(card);
    if (allLookupCards().some(existing => E.cardCode(existing) === code)) {
      setLookupMessage(`${E.labelCard(card)} is already in one of the hands.`, true);
      return;
    }
    lookup[lookup.activeHand][lookup.activeIndex] = card;
    lookup.rank = null;
    advanceLookupSlot();
    setLookupMessage("Card added. Keep going.");
    el.lookupResult.classList.add("hidden");
    renderLookup();
  }

  function advanceLookupSlot() {
    const lookup = state.lookup;
    for (const hand of [lookup.activeHand, lookup.activeHand === "dealer" ? "player" : "dealer"]) {
      const empty = lookup[hand].findIndex(card => !card);
      if (empty >= 0) {
        lookup.activeHand = hand;
        lookup.activeIndex = empty;
        return;
      }
    }
  }

  function setLookupMessage(message, error = false) {
    el.lookupMessage.textContent = message;
    el.lookupMessage.classList.toggle("error", error);
  }

  function renderLookupHand(container, handName) {
    container.replaceChildren();
    state.lookup[handName].forEach((card, index) => {
      const active = state.lookup.activeHand === handName && state.lookup.activeIndex === index;
      const node = cardElement(card, { button: true, placeholder: !card, active, className: "lookup-slot", index });
      if (!card) node.textContent = String(index + 1);
      node.addEventListener("click", () => {
        state.lookup.activeHand = handName;
        state.lookup.activeIndex = index;
        renderLookup();
      });
      container.append(node);
    });
  }

  function renderLookupPickers() {
    $$("#rankPicker .picker-button").forEach(button => button.classList.toggle("active", Number(button.dataset.rank) === state.lookup.rank));
  }

  function renderLookup() {
    renderLookupHand(el.lookupDealer, "dealer");
    renderLookupHand(el.lookupPlayer, "player");
    renderLookupPickers();
    el.removeLookup.disabled = !state.lookup[state.lookup.activeHand][state.lookup.activeIndex];
    el.importFromPlay.disabled = !state.play.round;

    const dealerCount = state.lookup.dealer.filter(Boolean).length;
    const playerCount = state.lookup.player.filter(Boolean).length;
    const dealerComplete = dealerCount === 7;
    const playerStarted = playerCount > 0;
    const playerComplete = playerCount === 7;
    el.findBestSet.textContent = playerStarted ? "Find Best Set" : "Find House Way";
    el.findBestSet.disabled = !dealerComplete || (playerStarted && !playerComplete);
    el.findBestSet.setAttribute("aria-label", playerStarted
      ? (playerComplete ? "Find the best player set" : `Find the best player set after entering ${7 - playerCount} more ${7 - playerCount === 1 ? "card" : "cards"}`)
      : (dealerComplete ? "Find the dealer house way" : `Find the dealer house way after entering ${7 - dealerCount} more ${7 - dealerCount === 1 ? "card" : "cards"}`));
  }

  function removeLookupCard() {
    const lookup = state.lookup;
    lookup[lookup.activeHand][lookup.activeIndex] = null;
    el.lookupResult.classList.add("hidden");
    setLookupMessage("Card removed.");
    renderLookup();
  }

  function clearLookup() {
    state.lookup = emptyLookup();
    el.lookupResult.classList.add("hidden");
    setLookupMessage("Select a slot, then choose its rank and suit.");
    renderLookup();
  }

  function importPlayHand() {
    const round = state.play.round;
    if (!round) return;
    const lookup = emptyLookup();
    lookup.dealer = round.dealerCards.map(card => ({ ...card }));
    lookup.player = round.playerCards.map(card => ({ ...card }));
    lookup.activeHand = "dealer";
    lookup.activeIndex = 0;
    state.lookup = lookup;
    el.lookupResult.classList.add("hidden");
    setLookupMessage("Current Play hand imported. Find the best set when ready.");
    renderLookup();
  }

  function resultSetMarkup(set) {
    return `<div class="result-hand"><div class="result-row"><small>High</small>${set.highCards.map(miniCardMarkup).join("")}</div><div class="result-row"><small>Low</small>${set.lowCards.map(miniCardMarkup).join("")}</div></div>`;
  }

  function findLookupSet() {
    try {
      const dealerCards = state.lookup.dealer.filter(Boolean);
      const playerCards = state.lookup.player.filter(Boolean);
      if (dealerCards.length !== 7) {
        setLookupMessage("Enter all seven dealer cards first.", true);
        return;
      }

      const dealerSet = E.houseWaySet(dealerCards);
      const dealerAceHigh = E.dealerHasAceHighPaiGow(dealerCards);
      if (playerCards.length === 0) {
        const title = dealerAceHigh ? "Dealer Ace-high Pai Gow" : "Dealer House Way";
        const subtitle = dealerAceHigh
          ? "The house way is shown below. In live play, every player hand automatically pushes."
          : "The dealer’s seven cards are set below using the MGM-style house way.";
        el.lookupResult.innerHTML = `<div class="lookup-verdict"><strong>${title}</strong><span>${subtitle}</span></div><div class="lookup-set-grid house-way-only"><section class="lookup-set-card"><h3>Dealer · House Way</h3>${resultSetMarkup(dealerSet)}<p>${dealerSet.houseRule}</p></section></div>`;
        el.lookupResult.classList.remove("hidden");
        setLookupMessage("Dealer house way found.");
        return;
      }

      if (playerCards.length !== 7) {
        setLookupMessage("Complete the player’s seven-card hand to find the best set.", true);
        return;
      }

      if (dealerAceHigh) {
        el.lookupResult.innerHTML = `<div class="lookup-verdict"><strong>Automatic Push</strong><span>The dealer has Ace-high Pai Gow, so every player hand pushes. No player setting is needed.</span></div><div class="lookup-set-grid automatic-push-lookup"><section class="lookup-set-card"><h3>Dealer · House Way</h3>${resultSetMarkup(dealerSet)}<p>${dealerSet.houseRule}</p></section><section class="lookup-set-card no-setting-card"><h3>Player</h3><div class="no-setting-symbol">—</div><p>Do not set the hand. Deal the next round.</p></section></div>`;
        el.lookupResult.classList.remove("hidden");
        setLookupMessage("Automatic push — no player setting is needed.");
        return;
      }
      const solution = E.findBestPlayerSet(playerCards, dealerSet);
      const playerSet = solution.best;
      const result = playerSet.result;
      let title;
      let subtitle;
      if (result.outcome === "win") {
        title = "El Jefe Found a Winning Set";
        subtitle = "This is one legal way to beat both dealer hands.";
      } else if (result.outcome === "push") {
        title = "Best Result: Push";
        subtitle = "No legal winning set exists, but this setting saves the wager.";
      } else {
        title = "Guaranteed Loss";
        subtitle = "No legal setting can win or push. The cards have spoken, and they were unkind.";
      }
      el.lookupResult.innerHTML = `<div class="lookup-verdict"><strong>${title}</strong><span>${subtitle}</span></div><div class="lookup-set-grid"><section class="lookup-set-card"><h3>Dealer · House Way</h3>${resultSetMarkup(dealerSet)}<p>${dealerSet.houseRule}</p></section><section class="lookup-set-card"><h3>Player · Best Available Set</h3>${resultSetMarkup(playerSet)}<p>${playerSet.high.name} behind · ${playerSet.low.name} up top</p></section></div>`;
      el.lookupResult.classList.remove("hidden");
      setLookupMessage("Hands set.");
    } catch (error) {
      console.error(error);
      setLookupMessage("Those cards could not be evaluated. Clear the hands and try again.", true);
    }
  }

  function startChallenge() {
    state.challenge = { active: true, number: 1, correct: 0, round: newRound(), misses: [] };
    if (!state.challenge.round.automaticPush) state.challenge.round.message = SETTING_PROMPT;
    settleAutomaticPush("challenge", state.challenge.round);
    el.challengeLaunch.classList.add("hidden");
    el.modeTabs.classList.add("hidden");
    Object.values(el.panels).forEach(panel => panel.classList.add("hidden"));
    el.challengePanel.classList.remove("hidden");
    el.challengeGame.classList.remove("hidden");
    el.challengeSummary.classList.add("hidden");
    renderRound("challenge");
  }

  function nextChallengeHand() {
    if (!state.challenge.round || !state.challenge.round.completed) return;
    state.challenge.number += 1;
    state.challenge.round = newRound();
    if (!state.challenge.round.automaticPush) state.challenge.round.message = SETTING_PROMPT;
    settleAutomaticPush("challenge", state.challenge.round);
    renderRound("challenge");
  }

  function finishChallenge() {
    const challenge = state.challenge;
    el.challengeGame.classList.add("hidden");
    el.challengeSummary.classList.remove("hidden");
    const perfect = challenge.correct === CHALLENGE_HANDS;
    const today = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric" }).format(new Date());
    const result = perfect
      ? `<div class="certificate grand-master">
          <div class="grand-master-rays" aria-hidden="true"></div>
          <div class="grand-master-stars" aria-hidden="true">♠ · ♦ · ♣ · ♥</div>
          <div class="certificate-small">CASA DEL JEFE · HALL OF MASTERS</div>
          <div class="certificate-title">FACE UP PAI GOW<br>GRAND MASTER</div>
          <div class="certificate-rule"></div>
          <p>This certifies a flawless performance in the ${CHALLENGE_HANDS}-hand El Jefe Face Up Pai Gow Challenge.</p>
          <div class="certificate-score">${CHALLENGE_HANDS} / ${CHALLENGE_HANDS} · 100%</div>
          <div class="grand-master-crest" aria-hidden="true">♛</div>
          <div class="grand-master-subtitle">Perfect Hand Setting</div>
          <p>Certified by El Jefe</p>
          <p>${today}</p>
          <div class="certificate-share">Screenshot this Grand Master certificate and send it to the group text thread.</div>
        </div>`
      : `<div class="challenge-fail"><h2>Not Quite Grand Master</h2><div class="challenge-final-score">${challenge.correct} / ${CHALLENGE_HANDS} · ${percent(challenge.correct, CHALLENGE_HANDS)}</div><p>Grand Master certification requires a perfect 100 out of 100. You missed the best available result on ${challenge.misses.length} ${challenge.misses.length === 1 ? "hand" : "hands"}.</p><p>Visit Train mode, sharpen the eye, and make El Jefe proud.</p></div>`;
    const review = challenge.misses.length
      ? `<details class="challenge-review"><summary>Review missed best results (${challenge.misses.length})</summary><div class="mistake-list">${challenge.misses.map(miss => {
          const decision = miss.mucked ? "mucked the hand" : `played for a ${miss.outcome}`;
          return `<article class="mistake-card"><h3>Hand ${miss.number}: ${decision}; a ${miss.optimalOutcome} was available</h3><p>Your play</p>${renderMiniSet(miss.chosen)}<p>One best-result setting · ${outcomeLabel(miss.optimalOutcome)}</p>${renderMiniSet(miss.optimal)}</article>`;
        }).join("")}</div></details>`
      : "";
    el.challengeSummary.innerHTML = `${result}<div class="challenge-summary-actions"><button class="primary-button" id="challengeAgain" type="button">Try Again</button><button class="secondary-button" id="challengeDone" type="button">Done</button></div>${review}`;
    $("#challengeAgain").addEventListener("click", startChallenge);
    $("#challengeDone").addEventListener("click", exitChallenge);
  }

  function exitChallenge() {
    state.challenge.active = false;
    el.challengePanel.classList.add("hidden");
    el.challengeLaunch.classList.remove("hidden");
    el.modeTabs.classList.remove("hidden");
    setMode(state.mode);
  }

  setupPickers();
  el.tabs.forEach(tab => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
  el.playDeal.addEventListener("click", () => startRound("play"));
  el.playMuck.addEventListener("click", () => muckHand("play"));
  el.playSet.addEventListener("click", () => submitSet("play"));
  el.trainNext.addEventListener("click", () => startRound("train"));
  el.trainMuck.addEventListener("click", () => muckHand("train"));
  el.trainSet.addEventListener("click", () => submitSet("train"));
  el.resetPlay.addEventListener("click", resetPlay);
  el.resetTrain.addEventListener("click", resetTrain);
  el.importFromPlay.addEventListener("click", importPlayHand);
  el.removeLookup.addEventListener("click", removeLookupCard);
  el.clearLookup.addEventListener("click", clearLookup);
  el.findBestSet.addEventListener("click", findLookupSet);
  el.challengeLaunch.addEventListener("click", startChallenge);
  el.challengeSet.addEventListener("click", () => submitSet("challenge"));
  el.challengeMuck.addEventListener("click", () => muckHand("challenge"));
  el.challengeNext.addEventListener("click", nextChallengeHand);
  el.challengeExit.addEventListener("click", exitChallenge);
  window.addEventListener("resize", () => requestAnimationFrame(drawBalanceChart));
  window.addEventListener("keydown", event => {
    if (event.key === "Enter") {
      const mode = state.challenge.active ? "challenge" : state.mode;
      const controls = controlsFor(mode);
      if (!controls.set.disabled) submitSet(mode);
    }
    if (event.key.toLowerCase() === "d" && state.mode === "play" && !state.challenge.active && !el.playDeal.disabled) startRound("play");
    if ((event.key === "Delete" || event.key === "Backspace") && state.mode === "lookup" && !state.challenge.active && !el.removeLookup.disabled) removeLookupCard();
  });

  renderRound("play");
  renderLookup();
  if ("serviceWorker" in navigator) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js?v=13", { updateViaCache: "none" }).then(registration => registration.update()).catch(() => {}));
  }
})();
