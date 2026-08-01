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
    challengeNext: $("#challengeNext"),
    challengeExit: $("#challengeExit"),
    playStage: $("#playStage"),
    playMessage: $("#playMessage"),
    playSet: $("#playSet"),
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
    trainNext: $("#trainNext"),
    trainScore: $("#trainScore"),
    trainAccuracy: $("#trainAccuracy"),
    resetTrain: $("#resetTrain"),
    lookupDealer: $("#lookupDealer"),
    lookupPlayer: $("#lookupPlayer"),
    rankPicker: $("#rankPicker"),
    suitPicker: $("#suitPicker"),
    jokerPicker: $("#jokerPicker"),
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
    return { balance: 0, hands: 0, correct: 0, wins: 0, pushes: 0, losses: 0, history: [0], mistakes: [], round: null };
  }

  function loadPlay() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") return emptyPlay();
      return {
        ...emptyPlay(),
        balance: Number(saved.balance) || 0,
        hands: Number(saved.hands) || 0,
        correct: Number(saved.correct) || 0,
        wins: Number(saved.wins) || 0,
        pushes: Number(saved.pushes) || 0,
        losses: Number(saved.losses) || 0,
        history: Array.isArray(saved.history) && saved.history.length ? saved.history.map(Number) : [0],
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
        hands: p.hands,
        correct: p.correct,
        wins: p.wins,
        pushes: p.pushes,
        losses: p.losses,
        history: p.history.slice(-301),
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
      node.innerHTML = `<span class="joker-star">★</span><span class="joker-word">JOKER</span>`;
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
    return {
      playerCards,
      dealerCards,
      dealerSet: E.houseWaySet(dealerCards),
      selected: [],
      completed: false,
      playerSet: null,
      analysis: null,
      result: null,
      accurate: null,
      justDealt: true,
      message: "Select exactly two cards for your top hand.",
      messageClass: ""
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
    highLabel.textContent = `${owner === "dealer" ? "Dealer" : "Player"} · 5-Card High · ${set.high.name}`;
    const high = document.createElement("div");
    high.className = owner === "dealer" ? "dealer-high" : "set-row";
    renderCardRow(high, set.highCards, "", animated);
    const lowLabel = document.createElement("div");
    lowLabel.className = "split-label";
    lowLabel.textContent = `${owner === "dealer" ? "Dealer" : "Player"} · 2-Card Low · ${set.low.name}`;
    const low = document.createElement("div");
    low.className = owner === "dealer" ? "dealer-low" : "set-row";
    renderCardRow(low, set.lowCards, "", animated);
    wrap.append(highLabel, high, lowLabel, low);
    return wrap;
  }

  function comparisonText(value) {
    return value > 0 ? "Player wins" : "Dealer wins";
  }

  function resultBanner(round) {
    const result = round.result;
    const wrap = document.createElement("div");
    const banner = document.createElement("div");
    banner.className = `set-result-banner ${result.outcome}`;
    banner.textContent = result.outcome === "win" ? "✓ Player Wins" : result.outcome === "push" ? "— Push" : "× Dealer Wins";
    const detail = document.createElement("p");
    detail.className = "set-result-detail";
    if (result.aceHighPush) detail.textContent = "Dealer Ace-high Pai Gow: the base wager automatically pushes.";
    else if (round.accurate) detail.textContent = round.analysis.canWin ? "You found a winning set." : "No legal winning set existed, so this legal setting is accurate.";
    else detail.textContent = "A winning set was available. This setting costs an accuracy point.";
    const pills = document.createElement("div");
    pills.className = "comparison-pills";
    const high = document.createElement("span");
    high.className = `comparison-pill ${result.highComparison > 0 ? "beat" : "lost"}`;
    high.textContent = `High: ${comparisonText(result.highComparison)}`;
    const low = document.createElement("span");
    low.className = `comparison-pill ${result.lowComparison > 0 ? "beat" : "lost"}`;
    low.textContent = `Low: ${comparisonText(result.lowComparison)}`;
    pills.append(high, low);
    wrap.append(banner, detail, pills);
    return wrap;
  }

  function emptyStage(container) {
    container.replaceChildren();
    const dealer = document.createElement("div");
    dealer.className = "hand-zone";
    dealer.innerHTML = `<div class="zone-label">Dealer Hand</div>`;
    const high = document.createElement("div");
    high.className = "dealer-high";
    for (let i = 0; i < 5; i += 1) high.append(cardElement(null, { placeholder: true }));
    const low = document.createElement("div");
    low.className = "dealer-low";
    for (let i = 0; i < 2; i += 1) low.append(cardElement(null, { placeholder: true }));
    dealer.append(high, low);
    const player = document.createElement("div");
    player.className = "hand-zone player-zone";
    player.innerHTML = `<div class="zone-label">Your 7 Cards</div>`;
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
    const houseRule = document.createElement("div");
    houseRule.className = "house-rule";
    houseRule.textContent = `House way: ${round.dealerSet.houseRule}`;
    dealerZone.append(houseRule);

    const playerZone = document.createElement("div");
    playerZone.className = "hand-zone player-zone";
    const label = document.createElement("div");
    label.className = "zone-label";
    label.textContent = round.completed ? "Your Set Hand" : "Your 7 Cards";
    playerZone.append(label);
    if (round.completed) {
      playerZone.append(makeSetLayout(round.playerSet, "player"));
      playerZone.append(resultBanner(round));
    } else {
      const instruction = document.createElement("div");
      instruction.className = "player-instruction";
      instruction.textContent = `${round.selected.length} of 2 top cards selected`;
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
      playerZone.append(instruction, fan);
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
    if (mode === "play") return { set: el.playSet, next: el.playDeal, message: el.playMessage, stage: el.playStage };
    if (mode === "train") return { set: el.trainSet, next: el.trainNext, message: el.trainMessage, stage: el.trainStage };
    return { set: el.challengeSet, next: el.challengeNext, message: el.challengeMessage, stage: el.challengeStage };
  }

  function toggleCard(mode, id) {
    const round = roundFor(mode);
    if (!round || round.completed) return;
    const index = round.selected.indexOf(id);
    if (index >= 0) {
      round.selected.splice(index, 1);
      round.message = "Select exactly two cards for your top hand.";
      round.messageClass = "";
    } else if (round.selected.length < 2) {
      round.selected.push(id);
      round.message = round.selected.length === 2 ? "Two cards selected. Set the top hand when ready." : "Select one more card for your top hand.";
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
      chosen: setSnapshot(round.playerSet),
      winning: setSnapshot(round.analysis.best),
      outcome: round.result.outcome
    };
  }

  function selectedPlayerSet(round) {
    const key = round.selected.slice().sort((a, b) => a - b).join("-");
    return E.enumerateSets(round.playerCards).find(set => set.lowCards.map(card => card.id).sort((a, b) => a - b).join("-") === key) || null;
  }

  function submitSet(mode) {
    const round = roundFor(mode);
    if (!round || round.completed || round.selected.length !== 2) return;
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
    round.accurate = !round.analysis.canWin || round.result.outcome === "win";
    round.completed = true;
    round.messageClass = round.accurate ? "correct" : "incorrect";
    round.message = round.accurate
      ? (round.analysis.canWin ? "Correct — this legal set beats both dealer hands." : "Accurate — no winning set existed, and you made a legal hand.")
      : `Missed opportunity — a winning set was available, but this setting ${round.result.outcome === "push" ? "pushes" : "loses"}.`;

    if (mode === "play") completePlayRound(round);
    else if (mode === "train") completeTrainRound(round);
    else completeChallengeRound(round);
    renderRound(mode);
  }

  function completePlayRound(round) {
    const p = state.play;
    p.hands += 1;
    if (round.accurate) p.correct += 1;
    if (round.result.outcome === "win") { p.wins += 1; p.balance += 1; }
    else if (round.result.outcome === "push") p.pushes += 1;
    else { p.losses += 1; p.balance -= 1; }
    p.history.push(p.balance);
    if (p.history.length > 301) p.history.shift();
    if (!round.accurate) p.mistakes.push(mistakeSnapshot(round, p.hands));
    if (p.mistakes.length > 25) p.mistakes.shift();
    savePlay();
    pulseIndicator(round.accurate);
  }

  function completeTrainRound(round) {
    state.train.total += 1;
    if (round.accurate) state.train.correct += 1;
  }

  function completeChallengeRound(round) {
    const challenge = state.challenge;
    if (round.accurate) challenge.correct += 1;
    else challenge.misses.push(mistakeSnapshot(round, challenge.number));
    if (challenge.number >= CHALLENGE_HANDS) finishChallenge();
  }

  function pulseIndicator(correct) {
    el.playIndicator.textContent = correct ? "✓" : "×";
    el.playIndicator.className = `decision-indicator visible ${correct ? "correct" : "incorrect"}`;
    void el.playIndicator.offsetWidth;
    el.playIndicator.classList.add("pulse");
  }

  function startRound(mode) {
    if (mode === "play") state.play.round = newRound();
    else if (mode === "train") state.train.round = newRound();
    else state.challenge.round = newRound();
    renderRound(mode);
  }

  function renderRound(mode) {
    const round = roundFor(mode);
    const controls = controlsFor(mode);
    renderStage(controls.stage, round, mode);
    controls.message.textContent = round ? round.message : (mode === "play" ? "Press Deal to begin." : "Select exactly two cards for the top hand.");
    controls.message.className = `table-message${round && round.messageClass ? ` ${round.messageClass}` : ""}`;
    controls.set.disabled = !round || round.completed || round.selected.length !== 2;
    controls.next.disabled = Boolean(round && !round.completed);
    if (mode === "play") controls.next.textContent = round && round.completed ? "Deal Again" : "Deal";
    if (mode === "challenge") {
      controls.next.classList.toggle("hidden", !round || !round.completed || state.challenge.number >= CHALLENGE_HANDS);
      el.challengeProgress.textContent = `Hand ${state.challenge.number} of ${CHALLENGE_HANDS} · ${state.challenge.correct} correct`;
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
    el.playDeltaSummary.textContent = `Session result: ${formatUnits(p.balance, p.balance > 0)}`;
    el.trainScore.textContent = `${state.train.correct} / ${state.train.total}`;
    el.trainAccuracy.textContent = percent(state.train.correct, state.train.total);
    renderMistakes();
    requestAnimationFrame(drawBalanceChart);
  }

  function renderMiniSet(snapshot) {
    return `<div class="mini-set"><div><div class="mini-hand">${snapshot.high.map(miniCardMarkup).join("")}</div><div class="mini-hand">${snapshot.low.map(miniCardMarkup).join("")}</div></div><small>${snapshot.highName}<br>${snapshot.lowName}</small></div>`;
  }

  function renderMistakes() {
    const mistakes = state.play.mistakes;
    el.mistakeSummary.textContent = `Review missed winning sets (${mistakes.length})`;
    if (!mistakes.length) {
      el.mistakeList.innerHTML = `<p class="set-result-detail">No missed winning sets in this session.</p>`;
      return;
    }
    el.mistakeList.innerHTML = mistakes.slice().reverse().map(mistake => `<article class="mistake-card"><h3>Hand ${mistake.number}: chose a ${mistake.outcome}</h3><p>Your setting</p>${renderMiniSet(mistake.chosen)}<p>One winning setting</p>${renderMiniSet(mistake.winning)}</article>`).join("");
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
    const values = state.play.history.length ? state.play.history : [0];
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const spread = Math.max(4, max - min);
    const low = min - spread * .18;
    const high = max + spread * .18;
    const left = 40, right = 14, top = 12, bottom = 25;
    const xAt = index => left + (values.length === 1 ? 0 : index / (values.length - 1) * (width - left - right));
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
    ctx.strokeStyle = "#e7c86a";
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.beginPath();
    values.forEach((value, index) => index ? ctx.lineTo(xAt(index), yAt(value)) : ctx.moveTo(xAt(index), yAt(value)));
    ctx.stroke();
    ctx.fillStyle = "#e7c86a";
    ctx.beginPath(); ctx.arc(xAt(values.length - 1), yAt(values[values.length - 1]), 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "rgba(232,226,207,.72)";
    ctx.fillText("Hands", width - 43, height - 6);
  }

  function setMode(mode) {
    state.mode = mode;
    el.tabs.forEach(tab => {
      const active = tab.dataset.mode === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    Object.entries(el.panels).forEach(([name, panel]) => panel.classList.toggle("hidden", name !== mode));
    if (mode === "train" && !state.train.round) state.train.round = newRound();
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
    el.findBestSet.disabled = allLookupCards().length !== 14;
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

  function resultSetMarkup(set) {
    return `<div class="result-hand"><div class="result-row"><small>High</small>${set.highCards.map(miniCardMarkup).join("")}</div><div class="result-row"><small>Low</small>${set.lowCards.map(miniCardMarkup).join("")}</div></div>`;
  }

  function findLookupSet() {
    try {
      const dealerSet = E.houseWaySet(state.lookup.dealer);
      const solution = E.findBestPlayerSet(state.lookup.player, dealerSet);
      const playerSet = solution.best;
      const result = playerSet.result;
      let title;
      let subtitle;
      if (result.aceHighPush) {
        title = "Automatic Push";
        subtitle = "The dealer has Ace-high Pai Gow, so the base wager pushes before your setting matters.";
      } else if (result.outcome === "win") {
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
    renderRound("challenge");
  }

  function finishChallenge() {
    const challenge = state.challenge;
    el.challengeGame.classList.add("hidden");
    el.challengeSummary.classList.remove("hidden");
    const perfect = challenge.correct === CHALLENGE_HANDS;
    const today = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "long", day: "numeric" }).format(new Date());
    const result = perfect
      ? `<div class="certificate"><div class="certificate-small">CASA DEL JEFE · HALL OF MASTERS</div><div class="certificate-title">FACE UP PAI GOW<br>GRAND MASTER</div><div class="certificate-rule"></div><p>This certifies a flawless performance in the 100-hand El Jefe Face Up Pai Gow Challenge.</p><div class="certificate-score">100 / 100 · 100%</div><p><strong>Perfect Hand Setting</strong></p><p>Certified by El Jefe · ${today}</p><div class="certificate-share">Screenshot this Grand Master certificate and send it to the group text thread.</div></div>`
      : `<div class="challenge-fail"><h2>Not Quite Grand Master</h2><div class="challenge-final-score">${challenge.correct} / ${CHALLENGE_HANDS} · ${percent(challenge.correct, CHALLENGE_HANDS)}</div><p>Grand Master certification requires a perfect 100 out of 100. You missed ${challenge.misses.length} ${challenge.misses.length === 1 ? "winning set" : "winning sets"}.</p><p>Visit Train mode, sharpen the eye, and make El Jefe proud.</p></div>`;
    const review = challenge.misses.length
      ? `<details class="challenge-review"><summary>Review missed winning sets (${challenge.misses.length})</summary><div class="mistake-list">${challenge.misses.map(miss => `<article class="mistake-card"><h3>Hand ${miss.number}: chose a ${miss.outcome}</h3><p>Your setting</p>${renderMiniSet(miss.chosen)}<p>One winning setting</p>${renderMiniSet(miss.winning)}</article>`).join("")}</div></details>`
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
  el.playSet.addEventListener("click", () => submitSet("play"));
  el.trainNext.addEventListener("click", () => startRound("train"));
  el.trainSet.addEventListener("click", () => submitSet("train"));
  el.resetPlay.addEventListener("click", resetPlay);
  el.resetTrain.addEventListener("click", resetTrain);
  el.jokerPicker.addEventListener("click", addLookupJoker);
  el.removeLookup.addEventListener("click", removeLookupCard);
  el.clearLookup.addEventListener("click", clearLookup);
  el.findBestSet.addEventListener("click", findLookupSet);
  el.challengeLaunch.addEventListener("click", startChallenge);
  el.challengeSet.addEventListener("click", () => submitSet("challenge"));
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
  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}));
})();
