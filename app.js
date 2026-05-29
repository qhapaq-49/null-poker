'use strict';

const STARTING_STACK = 200;
const SMALL_BLIND = 1;
const BIG_BLIND = 2;
const HERO = 0;
const UI_MIN_PLAYERS = 2;
const UI_MAX_PLAYERS = 9;
const ENGINE_MAX_PLAYERS = Math.floor((52 - 5) / 2);
const MAX_LOG = 60;

const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const SUITS = ['s', 'h', 'd', 'c'];
const RANK_LABELS = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
const RANK_VALUES = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, T: 10, J: 11, Q: 12, K: 13, A: 14 };
const SUIT_LABELS = { s: '♠', h: '♥', d: '♦', c: '♣' };
const STREET_LABELS = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River', showdown: 'Showdown' };
const DEPTH_SAMPLES = { fast: 160, balanced: 420, deep: 960 };
const BET_SIZE_BUCKETS = {
  preflopOpenBb: [2.2, 2.5, 3],
  preflopRaiseMultiplier: [2.4, 3, 4],
  postflopSingle: [0.25, 0.33, 0.5, 0.75, 1, 1.5],
  postflopMultiway: [0.25, 0.33, 0.5, 0.75, 1],
  postflopRaise: [0.5, 0.75, 1, 1.5]
};
const ROLLOUT_CONFIG = {
  maxPlayers: 3,
  maxSteps: 70,
  policyEquitySamples: 3,
  fastCap: 3,
  balancedCap: 7,
  deepCap: 12
};
const POLICY_PRESETS = {
  current: { name: 'current', rolloutScale: 0, jamDefenseScale: 1, aggressionScale: 1, callScale: 1, foldScale: 1, cbetScale: 1, donkScale: 1, stabScale: 1, positionScale: 1, temperatureScale: 1, readScale: 1, actionReadScale: 0.75, comboContinueScale: 0.55, comboRangeScale: 0.5, multiwayCbetBrakeScale: 1.45, fullRing: { actionReadScale: 0, comboContinueScale: 1.15, comboRangeScale: 1 }, sixMax: { handQualityScale: 0.65, lineFoldReadScale: 0, lineCallReadScale: 0, potControlScale: 0.65 }, headsUp: { aggressionScale: 1.06, callScale: 0.92, foldScale: 1.08, cbetScale: 1.08, donkScale: 0.55, stabScale: 1.12, positionScale: 1.12, temperatureScale: 0.95, comboContinueScale: 1.15, comboRangeScale: 1, drawQualityScale: 0.65 }, duelHeadsUp: { rolloutScale: 0, jamDefenseScale: 1.05, aggressionScale: 1, callScale: 0.96, foldScale: 1.03, cbetScale: 1.04, donkScale: 0.45, stabScale: 1.08, positionScale: 1.1, temperatureScale: 1, actionReadScale: 0, comboContinueScale: 1.15, comboRangeScale: 1, drawQualityScale: 0.65 } },
  'rollout-lite': { name: 'rollout-lite', rolloutScale: 0.35 },
  'full-rollout': { name: 'full-rollout', rolloutScale: 1 },
  'no-rollout': { name: 'no-rollout', rolloutScale: 0 },
  'no-jam-defense': { name: 'no-jam-defense', jamDefenseScale: 0 },
  'hu-low-donk': { name: 'hu-low-donk', headsUp: { rolloutScale: 0, jamDefenseScale: 1.05, aggressionScale: 1, callScale: 0.96, foldScale: 1.03, cbetScale: 1.04, donkScale: 0.45, stabScale: 1.08, positionScale: 1.1, temperatureScale: 1 } },
  'hu-wide-call': { name: 'hu-wide-call', headsUp: { aggressionScale: 1.05, callScale: 1.04, foldScale: 0.94, cbetScale: 1.06, donkScale: 0.65, stabScale: 1.12, positionScale: 1.08, temperatureScale: 1.05 } },
  'hu-tight-pressure': { name: 'hu-tight-pressure', headsUp: { aggressionScale: 1.06, callScale: 0.92, foldScale: 1.08, cbetScale: 1.08, donkScale: 0.55, stabScale: 1.12, positionScale: 1.12, temperatureScale: 0.95 } },
  'local-sota': {
    name: 'local-sota',
    headsUp: { rolloutScale: 0, jamDefenseScale: 1.12, aggressionScale: 0.92, callScale: 0.88, foldScale: 1.1, cbetScale: 1.02, donkScale: 0.6, stabScale: 1, positionScale: 1.12, temperatureScale: 0.9 },
    sixMax: { rolloutScale: 0, jamDefenseScale: 1.05, aggressionScale: 1, callScale: 0.96, foldScale: 1.03, cbetScale: 1.04, donkScale: 0.45, stabScale: 1.08, positionScale: 1.1, temperatureScale: 1 },
    fullRing: { readScale: 1.25, aggressionScale: 1.04, callScale: 0.97, foldScale: 1.02, cbetScale: 1.06, donkScale: 0.75, stabScale: 1.12 }
  },
  'hu-solid': { name: 'hu-solid', headsUp: { rolloutScale: 0, jamDefenseScale: 1.12, aggressionScale: 0.92, callScale: 0.88, foldScale: 1.1, cbetScale: 1.02, donkScale: 0.6, stabScale: 1, positionScale: 1.12, temperatureScale: 0.9 } },
  'six-table': { name: 'six-table', sixMax: { rolloutScale: 0, jamDefenseScale: 1.05, aggressionScale: 1, callScale: 0.96, foldScale: 1.03, cbetScale: 1.04, donkScale: 0.45, stabScale: 1.08, positionScale: 1.1, temperatureScale: 1 } },
  'ring-read': { name: 'ring-read', fullRing: { readScale: 1.25, aggressionScale: 1.04, callScale: 0.97, foldScale: 1.02, cbetScale: 1.06, donkScale: 0.75, stabScale: 1.12 } },
  'field-tuned': {
    name: 'field-tuned',
    sixMax: { rolloutScale: 0, jamDefenseScale: 1.05, aggressionScale: 1, callScale: 0.96, foldScale: 1.03, cbetScale: 1.04, donkScale: 0.45, stabScale: 1.08, positionScale: 1.1, temperatureScale: 1 },
    fullRing: { readScale: 1.25, aggressionScale: 1.04, callScale: 0.97, foldScale: 1.02, cbetScale: 1.06, donkScale: 0.75, stabScale: 1.12 }
  },
  adaptive: { name: 'adaptive', headsUp: { aggressionScale: 1.14, callScale: 0.96, foldScale: 0.96, cbetScale: 1.12, donkScale: 0.76, stabScale: 1.22, positionScale: 1.12, temperatureScale: 1.02 } },
  'read-off': { name: 'read-off', readScale: 0 },
  'hu-read-off': { name: 'hu-read-off', headsUp: { readScale: 0 } },
  'read-light': { name: 'read-light', readScale: 0.65 },
  'read-heavy': { name: 'read-heavy', readScale: 1.35 },
  'action-read-off': { name: 'action-read-off', actionReadScale: 0, fullRing: { actionReadScale: 0 }, duelHeadsUp: { actionReadScale: 0 } },
  'combo-continue-off': { name: 'combo-continue-off', comboContinueScale: 0, comboRangeScale: 0, fullRing: { comboContinueScale: 0, comboRangeScale: 0 }, duelHeadsUp: { comboContinueScale: 0, comboRangeScale: 0 } },
  'combo-continue-soft': { name: 'combo-continue-soft', comboContinueScale: 0.55, comboRangeScale: 0.5 },
  'combo-continue': { name: 'combo-continue', comboContinueScale: 0.85, comboRangeScale: 0.8 },
  'combo-continue-heavy': { name: 'combo-continue-heavy', comboContinueScale: 1.15, comboRangeScale: 1 },
  'combo-table-tuned': { name: 'combo-table-tuned', comboContinueScale: 0.55, comboRangeScale: 0.5, sixMax: { comboContinueScale: 0.55, comboRangeScale: 0.5 }, fullRing: { comboContinueScale: 1.15, comboRangeScale: 1 }, duelHeadsUp: { comboContinueScale: 1.15, comboRangeScale: 1 } },
  'combo-table-mid': { name: 'combo-table-mid', comboContinueScale: 0.85, comboRangeScale: 0.8, sixMax: { comboContinueScale: 0.85, comboRangeScale: 0.8 }, fullRing: { comboContinueScale: 1.15, comboRangeScale: 1 }, duelHeadsUp: { comboContinueScale: 1.15, comboRangeScale: 1 } },
  'hand-quality-only': { name: 'hand-quality-only', handQualityScale: 1, lineFoldReadScale: 0, lineCallReadScale: 0, potControlScale: 1 },
  'hand-quality-soft': { name: 'hand-quality-soft', handQualityScale: 0.65, lineFoldReadScale: 0, lineCallReadScale: 0, potControlScale: 0.65 },
  'hand-quality-table-soft': { name: 'hand-quality-table-soft', handQualityScale: 0.65, lineFoldReadScale: 0, lineCallReadScale: 0, potControlScale: 0.65, fullRing: { handQualityScale: 0, lineFoldReadScale: 0, lineCallReadScale: 0, potControlScale: 0 } },
  'hand-quality-six-nonhu-soft': { name: 'hand-quality-six-nonhu-soft', headsUp: {}, sixMax: { handQualityScale: 0.65, lineFoldReadScale: 0, lineCallReadScale: 0, potControlScale: 0.65 } },
  'range-quality-soft': { name: 'range-quality-soft', handQualityScale: 0.65, lineFoldReadScale: 0.65, lineCallReadScale: 0.65, potControlScale: 0.65 },
  'range-quality': { name: 'range-quality', handQualityScale: 1, lineFoldReadScale: 1, lineCallReadScale: 1, potControlScale: 1 },
  'range-quality-heavy': { name: 'range-quality-heavy', handQualityScale: 1.35, lineFoldReadScale: 1.25, lineCallReadScale: 1.25, potControlScale: 1.25 },
  'range-quality-table': { name: 'range-quality-table', handQualityScale: 1, lineFoldReadScale: 1, lineCallReadScale: 1, potControlScale: 1, duelHeadsUp: { handQualityScale: 1.35, lineFoldReadScale: 1.25, lineCallReadScale: 1.25, potControlScale: 1.25 } },
  'draw-quality-soft': { name: 'draw-quality-soft', drawQualityScale: 0.65 },
  'draw-quality': { name: 'draw-quality', drawQualityScale: 1 },
  'draw-quality-heavy': { name: 'draw-quality-heavy', drawQualityScale: 1.35 },
  'draw-quality-six': { name: 'draw-quality-six', headsUp: {}, sixMax: { drawQualityScale: 1 } },
  'draw-quality-hu-soft': { name: 'draw-quality-hu-soft', headsUp: { drawQualityScale: 0.65 }, duelHeadsUp: { drawQualityScale: 0.65 } },
  'multiway-cbet-soft': { name: 'multiway-cbet-soft', multiwayCbetBrakeScale: 0.55 },
  'multiway-cbet': { name: 'multiway-cbet', multiwayCbetBrakeScale: 1 },
  'multiway-cbet-heavy': { name: 'multiway-cbet-heavy', multiwayCbetBrakeScale: 1.45 },
  'multiway-cbet-six-heavy': { name: 'multiway-cbet-six-heavy', sixMax: { multiwayCbetBrakeScale: 1.45 } },
  'read-pressure': { name: 'read-pressure', readScale: 1.25, aggressionScale: 1.04, callScale: 0.97, foldScale: 1.02, cbetScale: 1.06, donkScale: 0.75, stabScale: 1.12 },
  'short-read-pressure': { name: 'short-read-pressure', headsUp: { readScale: 1.25, aggressionScale: 1.04, callScale: 0.97, foldScale: 1.02, cbetScale: 1.06, donkScale: 0.75, stabScale: 1.12 }, sixMax: { readScale: 1.25, aggressionScale: 1.04, callScale: 0.97, foldScale: 1.02, cbetScale: 1.06, donkScale: 0.75, stabScale: 1.12 } },
  'table-adaptive': {
    name: 'table-adaptive',
    headsUp: { aggressionScale: 1.14, callScale: 0.96, foldScale: 0.96, cbetScale: 1.12, donkScale: 0.76, stabScale: 1.22, positionScale: 1.12, temperatureScale: 1.02 },
    sixMax: { rolloutScale: 0, jamDefenseScale: 1.05, aggressionScale: 1, callScale: 0.96, foldScale: 1.03, cbetScale: 1.04, donkScale: 0.45, stabScale: 1.08, positionScale: 1.1, temperatureScale: 1 },
    fullRing: { rolloutScale: 0, jamDefenseScale: 1.25, aggressionScale: 0.78, callScale: 0.76, foldScale: 1.25, cbetScale: 0.85, donkScale: 0.42, stabScale: 0.82, positionScale: 1.06, temperatureScale: 0.8 }
  },
  tight: { name: 'tight', jamDefenseScale: 1.15, aggressionScale: 0.88, callScale: 0.86, foldScale: 1.08, cbetScale: 0.96, donkScale: 0.82, stabScale: 0.94 },
  loose: { name: 'loose', jamDefenseScale: 0.9, aggressionScale: 1.12, callScale: 1.14, foldScale: 0.9, cbetScale: 1.04, donkScale: 1.1, stabScale: 1.08 },
  positional: { name: 'positional', aggressionScale: 1.02, callScale: 0.98, cbetScale: 1.08, donkScale: 0.68, stabScale: 1.16, positionScale: 1.25, temperatureScale: 0.96 },
  disciplined: { name: 'disciplined', rolloutScale: 0, jamDefenseScale: 1.12, aggressionScale: 0.94, callScale: 0.92, foldScale: 1.08, cbetScale: 1.04, donkScale: 0.62, stabScale: 1.06, positionScale: 1.18, temperatureScale: 0.92 },
  'disciplined-2': { name: 'disciplined-2', rolloutScale: 0, jamDefenseScale: 1.14, aggressionScale: 0.9, callScale: 0.88, foldScale: 1.1, cbetScale: 1.0, donkScale: 0.55, stabScale: 1.02, positionScale: 1.2, temperatureScale: 0.88 },
  'solid-tight': { name: 'solid-tight', rolloutScale: 0, jamDefenseScale: 1.12, aggressionScale: 0.92, callScale: 0.88, foldScale: 1.1, cbetScale: 1.02, donkScale: 0.6, stabScale: 1.0, positionScale: 1.12, temperatureScale: 0.9 },
  'value-tight': { name: 'value-tight', rolloutScale: 0, jamDefenseScale: 1.18, aggressionScale: 0.84, callScale: 0.82, foldScale: 1.16, cbetScale: 0.94, donkScale: 0.52, stabScale: 0.9, positionScale: 1.1, temperatureScale: 0.84 },
  'selective-pressure': { name: 'selective-pressure', rolloutScale: 0, jamDefenseScale: 1.1, aggressionScale: 0.98, callScale: 0.9, foldScale: 1.08, cbetScale: 1.08, donkScale: 0.58, stabScale: 1.12, positionScale: 1.15, temperatureScale: 0.92 },
  'low-donk': { name: 'low-donk', rolloutScale: 0, jamDefenseScale: 1.05, aggressionScale: 1, callScale: 0.96, foldScale: 1.03, cbetScale: 1.04, donkScale: 0.45, stabScale: 1.08, positionScale: 1.1, temperatureScale: 1 },
  nit: { name: 'nit', rolloutScale: 0, jamDefenseScale: 1.25, aggressionScale: 0.78, callScale: 0.76, foldScale: 1.25, cbetScale: 0.85, donkScale: 0.42, stabScale: 0.82, positionScale: 1.06, temperatureScale: 0.8 },
  pressure: { name: 'pressure', aggressionScale: 1.14, callScale: 0.96, foldScale: 0.96, cbetScale: 1.12, donkScale: 0.76, stabScale: 1.22, positionScale: 1.12, temperatureScale: 1.02 }
};
const DEFAULT_RULE_CONFIG = {
  mode: 'cash',
  blind: '1/2',
  startingStackBb: 100,
  anteFraction: 0,
  levelHands: 0
};

const DEFAULT_TEACHER_ROWS = [
  { id: '6max BTN AKs open', players: 6, street: 'preflop', position: 'BTN', hole: 'AsKs', board: '', pot: 3, heroBet: 0, toCall: 2, teacher: { raise: 0.98, call: 0.02, fold: 0 } },
  { id: '9max UTG 72o open', players: 9, street: 'preflop', position: 'UTG', hole: '7c2d', board: '', pot: 3, heroBet: 0, toCall: 2, teacher: { fold: 0.98, call: 0.01, raise: 0.01 } },
  { id: 'BB A5s vs minraise', players: 6, street: 'preflop', position: 'BB', hole: 'Ah5h', board: '', pot: 7, heroBet: 2, toCall: 2, active: [0, 1], teacher: { call: 0.58, raise: 0.18, fold: 0.24 } },
  { id: 'Flop nut flush draw cbet', players: 3, street: 'flop', hole: 'AhQh', board: 'Kh7h2c', pot: 10, heroBet: 0, toCall: 0, preflopAggressor: 0, teacher: { bet: 0.68, check: 0.32 } },
  { id: 'HU BB weak donk check', players: 2, street: 'flop', position: 'BB', hole: '9c8d', board: 'AsKh2c', pot: 9, heroBet: 0, toCall: 0, preflopAggressor: 1, teacher: { check: 0.84, bet: 0.16 } },
  { id: 'HU BTN missed cbet stab', players: 2, street: 'flop', position: 'BTN', hole: 'QhJc', board: '8s6d2c', pot: 9, heroBet: 0, toCall: 0, preflopAggressor: 1, history: [{ street: 'flop', player: 1, type: 'check' }], teacher: { bet: 0.55, check: 0.45 } },
  { id: 'Flop air facing multiway bet', players: 4, street: 'flop', hole: '7c2d', board: 'AsKdQh', pot: 16, heroBet: 0, toCall: 8, teacher: { fold: 0.94, call: 0.06, raise: 0 } },
  { id: 'River pot bet bluffcatcher', players: 2, street: 'river', hole: 'QhJc', board: 'Qs9s4d2c8h', pot: 40, heroBet: 0, toCall: 30, active: [0, 1], history: [{ street: 'river', player: 1, type: 'bet', amount: 30 }], teacher: { call: 0.46, fold: 0.54, raise: 0 } },
  { id: 'Turn weak pair facing 3bet', players: 2, street: 'turn', position: 'BTN', hole: 'Js8s', board: '2cAs9h8d', pot: 128, heroBet: 40, toCall: 48, active: [0, 1], history: [{ street: 'preflop', player: 1, type: 'raise', amount: 4 }, { street: 'flop', player: 1, type: 'bet', amount: 4 }, { street: 'turn', player: 1, type: 'bet', amount: 16 }, { street: 'turn', player: 0, type: 'raise', amount: 40 }, { street: 'turn', player: 1, type: 'raise', amount: 88 }], teacher: { fold: 0.72, call: 0.26, raise: 0.02 } },
  { id: '6max HU turn weak pair facing 3bet', players: 6, street: 'turn', position: 'BTN', hole: 'Js8s', board: '2cAs9h8d', pot: 128, heroBet: 40, toCall: 48, active: [0, 1], history: [{ street: 'preflop', player: 1, type: 'raise', amount: 4 }, { street: 'flop', player: 1, type: 'bet', amount: 4 }, { street: 'turn', player: 1, type: 'bet', amount: 16 }, { street: 'turn', player: 0, type: 'raise', amount: 40 }, { street: 'turn', player: 1, type: 'raise', amount: 88 }], teacher: { fold: 0.72, call: 0.26, raise: 0.02 } }
];

const AI_SPEED_DELAYS = { instant: 0, fast: 180, normal: 720, slow: 1250 };
const NEXT_HAND_DELAYS = { instant: 180, fast: 420, normal: 900, slow: 1400 };
const ACTION_FLASH_MS = 920;

const els = {};
let state = null;
let botTimer = null;
let actionFlashTimer = null;
let actionFlashSerial = 0;

function init() {
  [
    'statusLine', 'playTab', 'guideTab', 'playView', 'guideView', 'sidePanel', 'newHandBtn', 'resetBtn',
    'potValue', 'boardCards', 'pokerTable', 'seatsGrid', 'actionControls',
    'playerCountSelect', 'ruleModeSelect', 'blindSelect', 'stackBbSelect', 'anteSelect', 'levelHandsSelect',
    'advisorToggle', 'autoPlayToggle', 'aiSpeedSelect', 'depthSelect', 'peekToggle', 'advisorPanel',
    'selfplayBenchBtn', 'teacherBenchBtn', 'teacherInput', 'benchOutput', 'handLog'
  ].forEach(function (id) { els[id] = document.getElementById(id); });

  els.playTab.addEventListener('click', function () { setActiveView('play'); });
  els.guideTab.addEventListener('click', function () { setActiveView('guide'); });
  els.newHandBtn.addEventListener('click', function () {
    if (state.handOver) {
      startHand(state);
      render();
      maybeBotAct();
    }
  });
  els.resetBtn.addEventListener('click', resetMatch);
  ['playerCountSelect', 'ruleModeSelect', 'blindSelect', 'stackBbSelect', 'anteSelect', 'levelHandsSelect'].forEach(function (id) {
    els[id].addEventListener('change', resetMatch);
  });
  els.advisorToggle.addEventListener('change', function () { state.settings.showAdvisor = els.advisorToggle.checked; state.advisorCache = null; render(); });
  els.autoPlayToggle.addEventListener('change', function () {
    clearBotTimer();
    state.settings.autoPlay = els.autoPlayToggle.checked;
    state.players[HERO].isBot = state.settings.autoPlay;
    render();
    maybeBotAct();
  });
  els.aiSpeedSelect.addEventListener('change', function () { state.settings.aiSpeed = els.aiSpeedSelect.value || 'normal'; });
  els.depthSelect.addEventListener('change', function () { state.settings.depth = els.depthSelect.value; state.advisorCache = null; render(); });
  els.peekToggle.addEventListener('change', function () { state.settings.peekAiCards = els.peekToggle.checked; render(); });
  els.selfplayBenchBtn.addEventListener('click', runSelfplayFromUi);
  els.teacherBenchBtn.addEventListener('click', runTeacherFromUi);
  els.teacherInput.value = JSON.stringify(DEFAULT_TEACHER_ROWS, null, 2);
  resetMatch();
}

function setActiveView(view) {
  const guide = view === 'guide';
  els.playView.hidden = guide;
  els.sidePanel.hidden = guide;
  els.guideView.hidden = !guide;
  els.playTab.classList.toggle('active', !guide);
  els.guideTab.classList.toggle('active', guide);
  els.playTab.setAttribute('aria-selected', guide ? 'false' : 'true');
  els.guideTab.setAttribute('aria-selected', guide ? 'true' : 'false');
  if (guide) clearBotTimer();
  else maybeBotAct();
}

function resetMatch() {
  clearBotTimer();
  const settings = readSettings();
  state = createGame(settings.playerCount, settings, { logging: true, heroIsBot: settings.autoPlay });
  startHand(state);
  render();
  maybeBotAct();
}

function readSettings() {
  return {
    playerCount: clampInt(Number(els.playerCountSelect.value || 6), UI_MIN_PLAYERS, UI_MAX_PLAYERS),
    rules: readRulesFromControls(),
    showAdvisor: els.advisorToggle.checked,
    autoPlay: els.autoPlayToggle.checked,
    aiSpeed: els.aiSpeedSelect.value || 'normal',
    depth: els.depthSelect.value || 'balanced',
    peekAiCards: els.peekToggle.checked
  };
}

function readRulesFromControls() {
  const mode = els.ruleModeSelect.value || DEFAULT_RULE_CONFIG.mode;
  return {
    mode,
    blind: els.blindSelect.value || DEFAULT_RULE_CONFIG.blind,
    startingStackBb: Number(els.stackBbSelect.value || DEFAULT_RULE_CONFIG.startingStackBb),
    anteFraction: Number(els.anteSelect.value || DEFAULT_RULE_CONFIG.anteFraction),
    levelHands: mode === 'tournament' ? Number(els.levelHandsSelect.value || 0) : 0
  };
}

function makeRules(rawRules) {
  const raw = rawRules || {};
  const parsed = parseBlindLevel(raw.blind || DEFAULT_RULE_CONFIG.blind);
  const mode = raw.mode === 'tournament' ? 'tournament' : 'cash';
  const startingStackBb = clampInt(Number(raw.startingStackBb || DEFAULT_RULE_CONFIG.startingStackBb), 10, 500);
  const anteFraction = clamp(Number(raw.anteFraction ?? DEFAULT_RULE_CONFIG.anteFraction), 0, 1);
  const levelHands = mode === 'tournament' ? Math.max(0, Math.round(Number(raw.levelHands || 0))) : 0;
  const baseAnte = anteFraction > 0 ? Math.max(1, Math.round(parsed.bigBlind * anteFraction)) : 0;
  return {
    mode,
    blind: parsed.smallBlind + '/' + parsed.bigBlind,
    baseSmallBlind: parsed.smallBlind,
    baseBigBlind: parsed.bigBlind,
    smallBlind: parsed.smallBlind,
    bigBlind: parsed.bigBlind,
    startingStackBb,
    startingStack: startingStackBb * parsed.bigBlind,
    anteFraction,
    baseAnte,
    ante: baseAnte,
    levelHands,
    level: 1
  };
}

function parseBlindLevel(value) {
  const parts = String(value || DEFAULT_RULE_CONFIG.blind).split('/').map(function (part) { return Math.max(1, Math.round(Number(part))); });
  const smallBlind = parts[0] || SMALL_BLIND;
  const bigBlind = Math.max(smallBlind + 1, parts[1] || BIG_BLIND);
  return { smallBlind, bigBlind };
}

function updateRuleLevelForHand(game) {
  const rules = game.rules;
  if (rules.mode !== 'tournament' || rules.levelHands <= 0) {
    rules.level = 1;
    rules.smallBlind = rules.baseSmallBlind;
    rules.bigBlind = rules.baseBigBlind;
    rules.ante = rules.baseAnte;
    return;
  }
  const level = Math.floor(Math.max(0, game.handNo - 1) / rules.levelHands) + 1;
  const multiplier = Math.pow(2, level - 1);
  rules.level = level;
  rules.smallBlind = Math.max(1, Math.round(rules.baseSmallBlind * multiplier));
  rules.bigBlind = Math.max(rules.smallBlind + 1, Math.round(rules.baseBigBlind * multiplier));
  rules.ante = rules.baseAnte > 0 ? Math.max(1, Math.round(rules.baseAnte * multiplier)) : 0;
}

function smallBlindAmount(game) {
  return game.rules ? game.rules.smallBlind : SMALL_BLIND;
}

function bigBlindAmount(game) {
  return game.rules ? game.rules.bigBlind : BIG_BLIND;
}

function anteAmount(game) {
  return game.rules ? game.rules.ante : 0;
}

function startingStackAmount(game) {
  return game.rules ? game.rules.startingStack : STARTING_STACK;
}

function createGame(playerCount, settings, options) {
  const settingsObj = settings || {};
  const rules = makeRules(settingsObj.rules || settingsObj);
  const count = clampInt(Number(playerCount || 6), 2, ENGINE_MAX_PLAYERS);
  const opts = options || {};
  const game = {
    handNo: 0,
    dealer: count - 1,
    smallBlind: null,
    bigBlind: null,
    street: 'preflop',
    board: [],
    deck: [],
    pot: 0,
    current: null,
    minRaise: rules.bigBlind,
    handOver: true,
    log: [],
    handActions: [],
    reads: [],
    players: [],
    rules,
    settings: Object.assign({ playerCount: count, showAdvisor: false, autoPlay: false, aiSpeed: 'normal', depth: 'balanced', peekAiCards: false }, settingsObj, { rules }),
    lastAiAnalysis: null,
    advisorCache: null,
    visualAction: null,
    message: 'New Handで開始',
    logging: opts.logging !== false
  };

  for (let i = 0; i < count; i += 1) {
    const isHero = i === HERO;
    game.players.push(makePlayer(isHero ? 'You' : 'AI-' + i, rules.startingStack, !isHero || opts.heroIsBot, botStyleForSeat(i, count)));
    game.reads.push(makeRead());
  }
  return game;
}

function botStyleForSeat(index, playerCount) {
  const phase = (index * 1.618 + playerCount * 0.27) % 1;
  return {
    risk: 0.9 + phase * 0.35,
    bluff: 0.72 + ((phase * 7) % 1) * 0.72,
    call: 0.9 + ((phase * 5) % 1) * 0.34
  };
}

function makePlayer(name, stack, isBot, style) {
  return { name, stack, hole: [], bet: 0, folded: false, allIn: false, acted: false, totalInvested: 0, isBot, style, policyName: 'current', hand: { vpip: false, pfr: false } };
}

function makeRead() {
  return { aggression: 0, voluntary: 0, lastAggressiveStreet: null };
}

function decayRead(read) {
  const source = read || makeRead();
  return {
    aggression: (source.aggression || 0) * 0.72,
    voluntary: (source.voluntary || 0) * 0.72,
    lastAggressiveStreet: null
  };
}

function startHand(game) {
  if (shouldResetStacksForNewHand(game)) {
    resetAllStacks(game);
    game.handNo = 0;
  }

  game.handNo += 1;
  updateRuleLevelForHand(game);
  game.dealer = nextSeat(game, game.dealer, function (idx) { return game.players[idx].stack > 0; });
  game.street = 'preflop';
  game.board = [];
  game.deck = shuffledDeck();
  game.pot = 0;
  game.current = null;
  game.minRaise = bigBlindAmount(game);
  game.handOver = false;
  game.log = [];
  game.handActions = [];
  game.visualAction = null;
  clearActionFlashTimer();
  game.reads = game.players.map(function (_, idx) { return decayRead(game.reads[idx]); });
  game.lastAiAnalysis = null;
  game.advisorCache = null;
  game.message = 'Blinds posted';

  game.players.forEach(function (player) {
    player.hole = [];
    player.bet = 0;
    player.folded = player.stack <= 0;
    player.allIn = false;
    player.acted = false;
    player.totalInvested = 0;
    player.hand = { vpip: false, pfr: false };
  });

  for (let round = 0; round < 2; round += 1) {
    for (let step = 1; step <= game.players.length; step += 1) {
      const dealIndex = (game.dealer + step) % game.players.length;
      if (game.players[dealIndex].stack > 0) game.players[dealIndex].hole.push(drawCard(game));
    }
  }

  game.smallBlind = game.players.length === 2 ? game.dealer : nextSeat(game, game.dealer, function (idx) { return game.players[idx].stack > 0; });
  game.bigBlind = nextSeat(game, game.smallBlind, function (idx) { return game.players[idx].stack > 0; });
  postAntes(game);
  postBlind(game, game.smallBlind, smallBlindAmount(game), 'SB');
  postBlind(game, game.bigBlind, bigBlindAmount(game), 'BB');
  game.current = game.players.length === 2 ? game.smallBlind : nextActorAfter(game, game.bigBlind);
  if (game.current == null) game.current = nextActorAfter(game, game.dealer);
  addLog(game, blindVerb(game, game.smallBlind) + ' ' + smallBlindAmount(game) + ', ' + blindVerb(game, game.bigBlind) + ' ' + bigBlindAmount(game));
  if (game.current == null && !game.handOver) runoutAndShowdown(game);
}

function shouldResetStacksForNewHand(game) {
  const livePlayers = game.players.filter(function (p) { return p.stack > 0; }).length;
  if (game.rules.mode === 'tournament') return livePlayers < 2 || game.players[HERO].stack <= 0;
  return game.players.some(function (p) { return p.stack < bigBlindAmount(game); });
}

function resetAllStacks(game) {
  game.players.forEach(function (p) { p.stack = startingStackAmount(game); });
}

function postAntes(game) {
  const ante = anteAmount(game);
  if (ante <= 0) return;
  let total = 0;
  game.players.forEach(function (player, idx) {
    if (player.stack > 0) {
      total += commit(game, idx, ante);
      game.handActions.push({ player: idx, street: game.street, type: 'ante', amount: ante, aggressive: false });
    }
  });
  if (total > 0) addLog(game, 'Antes ' + ante + ' each');
}

function postBlind(game, playerIndex, amount, label) {
  const paid = commit(game, playerIndex, amount);
  game.handActions.push({ player: playerIndex, street: game.street, type: label, amount: paid, aggressive: false });
}

function shuffledDeck() {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit });
  return shuffle(deck);
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

function drawCard(game) {
  return game.deck.pop();
}

function nextSeat(game, from, predicate) {
  const n = game.players.length;
  for (let step = 1; step <= n; step += 1) {
    const idx = (from + step + n) % n;
    if (!predicate || predicate(idx)) return idx;
  }
  return null;
}

function nextActorAfter(game, from) {
  return nextSeat(game, from, function (idx) {
    const p = game.players[idx];
    return !p.folded && !p.allIn && p.stack > 0;
  });
}

function commit(game, playerIndex, requestedAmount) {
  const player = game.players[playerIndex];
  const amount = Math.max(0, Math.min(Math.round(requestedAmount), player.stack));
  player.stack -= amount;
  player.bet += amount;
  player.totalInvested += amount;
  game.pot += amount;
  if (player.stack === 0) player.allIn = true;
  return amount;
}

function addLog(game, text) {
  if (!game.logging) return;
  game.log.unshift(text);
  game.log = game.log.slice(0, MAX_LOG);
}

function currentBet(game) {
  return Math.max.apply(null, game.players.map(function (p) { return p.bet; }));
}

function amountToCall(game, playerIndex) {
  return Math.max(0, currentBet(game) - game.players[playerIndex].bet);
}

function activePlayers(game) {
  return game.players.map(function (_, idx) { return idx; }).filter(function (idx) { return !game.players[idx].folded; });
}

function actingPlayers(game) {
  return activePlayers(game).filter(function (idx) {
    const p = game.players[idx];
    return !p.allIn && p.stack > 0;
  });
}

function legalActions(game, playerIndex) {
  if (game.handOver || game.current !== playerIndex) return [];
  const player = game.players[playerIndex];
  if (player.folded || player.allIn || player.stack <= 0) return [];

  const callAmount = Math.min(amountToCall(game, playerIndex), player.stack);
  const actions = [];
  if (callAmount > 0) {
    actions.push({ type: 'fold', label: 'Fold' });
    actions.push({ type: 'call', label: 'Call ' + callAmount, cost: callAmount });
  } else {
    actions.push({ type: 'check', label: 'Check', cost: 0 });
  }

  raiseOptions(game, playerIndex).forEach(function (option) {
    const target = option.target;
    const verb = currentBet(game) > player.bet ? 'Raise' : 'Bet';
    actions.push({
      type: currentBet(game) > player.bet ? 'raise' : 'bet',
      label: formatAggressiveLabel(verb, option),
      target,
      cost: target - player.bet,
      sizeKey: option.key,
      potFraction: option.potFraction
    });
  });
  return dedupeActions(actions);
}

function dedupeActions(actions) {
  const seen = new Set();
  const result = [];
  actions.forEach(function (action) {
    const key = action.type + ':' + (action.target == null ? 0 : action.target);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(action);
    }
  });
  return result;
}

function maxTargetFor(game, playerIndex) {
  const player = game.players[playerIndex];
  return player.bet + player.stack;
}

function minRaiseTarget(game, playerIndex) {
  const player = game.players[playerIndex];
  const maxBet = currentBet(game);
  if (maxBet === player.bet) return player.bet + Math.min(player.stack, Math.max(bigBlindAmount(game), Math.ceil(game.pot * 0.33)));
  return maxBet + game.minRaise;
}

function raiseTargets(game, playerIndex) {
  return raiseOptions(game, playerIndex).map(function (option) { return option.target; });
}

function raiseOptions(game, playerIndex) {
  const player = game.players[playerIndex];
  const callAmount = Math.min(amountToCall(game, playerIndex), player.stack);
  if (player.stack <= callAmount) return [];
  const liveOpponents = activePlayers(game).filter(function (idx) { return idx !== playerIndex && !game.players[idx].allIn && game.players[idx].stack > 0; });
  if (liveOpponents.length === 0) return [];

  const maxTarget = maxTargetFor(game, playerIndex);
  const minTarget = minRaiseTarget(game, playerIndex);
  const maxBet = currentBet(game);
  if (maxTarget <= player.bet || maxTarget <= maxBet) return [];
  if (maxTarget < minTarget) return [{ target: maxTarget, key: 'jam', label: 'All-in', potFraction: null }];

  const options = game.street === 'preflop'
    ? preflopRaiseOptions(game, playerIndex, minTarget, maxTarget)
    : postflopRaiseOptions(game, playerIndex, minTarget, maxTarget);
  const spr = effectiveStackAfterCall(game, playerIndex) / Math.max(1, game.pot + callAmount);
  if (spr <= 2.2 || player.stack <= game.pot * 1.15) {
    options.push({ target: maxTarget, key: 'jam', label: 'All-in', potFraction: null });
  }
  return dedupeSizeOptions(options, maxBet);
}

function preflopRaiseOptions(game, playerIndex, minTarget, maxTarget) {
  const player = game.players[playerIndex];
  const maxBet = currentBet(game);
  const callAmount = Math.min(amountToCall(game, playerIndex), player.stack);
  const limpers = activePlayers(game).filter(function (idx) {
    return idx !== playerIndex && idx !== game.smallBlind && idx !== game.bigBlind && game.players[idx].bet >= bigBlindAmount(game);
  }).length;
  const options = [];

  if (maxBet <= bigBlindAmount(game)) {
    BET_SIZE_BUCKETS.preflopOpenBb.forEach(function (bb) {
      const target = clampInt(Math.round(bb * bigBlindAmount(game) + limpers * bigBlindAmount(game)), minTarget, maxTarget);
      options.push({ target, key: 'open-' + bb + 'bb', label: formatBbSize(target / bigBlindAmount(game)), potFraction: null });
    });
  } else {
    BET_SIZE_BUCKETS.preflopRaiseMultiplier.forEach(function (multiplier) {
      const deadMoney = Math.max(0, game.pot - maxBet - player.bet - callAmount);
      const target = clampInt(Math.round(maxBet * multiplier + deadMoney * 0.35), minTarget, maxTarget);
      options.push({ target, key: 'r' + multiplier + 'x', label: formatMultiplierSize(target / Math.max(1, maxBet)), potFraction: null });
    });
  }
  return options;
}

function postflopRaiseOptions(game, playerIndex, minTarget, maxTarget) {
  const player = game.players[playerIndex];
  const callAmount = Math.min(amountToCall(game, playerIndex), player.stack);
  const facingBet = currentBet(game) > player.bet;
  const activeOpponents = Math.max(1, activePlayers(game).length - 1);
  const buckets = facingBet
    ? BET_SIZE_BUCKETS.postflopRaise
    : activeOpponents >= 2 ? BET_SIZE_BUCKETS.postflopMultiway : BET_SIZE_BUCKETS.postflopSingle;
  const potBase = game.pot + callAmount;
  return buckets.map(function (fraction) {
    const target = clampInt(player.bet + callAmount + Math.ceil(potBase * fraction), minTarget, maxTarget);
    const actualFraction = (target - player.bet - callAmount) / Math.max(1, potBase);
    return {
      target,
      key: 'pot-' + Math.round(fraction * 100),
      label: formatPotSize(actualFraction),
      potFraction: actualFraction
    };
  });
}

function dedupeSizeOptions(options, maxBet) {
  const seen = new Set();
  return options
    .filter(function (option) { return option.target > maxBet || option.key === 'jam'; })
    .sort(function (a, b) { return a.target - b.target; })
    .filter(function (option) {
      if (seen.has(option.target)) return false;
      seen.add(option.target);
      return true;
    });
}

function effectiveStackAfterCall(game, playerIndex) {
  const player = game.players[playerIndex];
  const callAmount = Math.min(amountToCall(game, playerIndex), player.stack);
  const ownAfterCall = Math.max(0, player.stack - callAmount);
  const opponentStacks = activePlayers(game)
    .filter(function (idx) { return idx !== playerIndex && !game.players[idx].folded; })
    .map(function (idx) { return game.players[idx].stack + Math.max(0, game.players[idx].bet - player.bet - callAmount); });
  if (opponentStacks.length === 0) return ownAfterCall;
  return Math.min(ownAfterCall, Math.max.apply(null, opponentStacks));
}

function formatAggressiveLabel(verb, option) {
  return verb + ' ' + option.target + (option.label ? ' (' + option.label + ')' : '');
}

function formatBbSize(value) {
  return formatSizeNumber(value) + 'bb';
}

function formatMultiplierSize(value) {
  return formatSizeNumber(value) + 'x';
}

function formatPotSize(value) {
  return Math.round(value * 100) + '% pot';
}

function formatSizeNumber(value) {
  return value.toFixed(1).replace(/\.0$/, '');
}

function applyAction(game, playerIndex, action) {
  if (game.handOver || game.current !== playerIndex || !action) return;
  const player = game.players[playerIndex];
  const previousMaxBet = currentBet(game);
  const previousPlayerBet = player.bet;
  player.acted = true;

  if (action.type === 'fold') {
    player.folded = true;
    addLog(game, player.name + ' folds');
    game.handActions.push({ player: playerIndex, street: game.street, type: 'fold', amount: 0, aggressive: false });
    showActionFlash(game, playerIndex, 'Fold');
    if (!finishByFoldIfNeeded(game)) {
      afterAction(game);
    }
    return;
  }

  if (action.type === 'check') {
    addLog(game, player.name + ' checks');
    game.handActions.push({ player: playerIndex, street: game.street, type: 'check', amount: 0, aggressive: false });
    showActionFlash(game, playerIndex, 'Check');
    afterAction(game);
    return;
  }

  if (action.type === 'call') {
    const paid = commit(game, playerIndex, Math.min(amountToCall(game, playerIndex), player.stack));
    markVoluntary(game, playerIndex, paid, false);
    addLog(game, player.name + ' calls ' + paid);
    game.handActions.push({ player: playerIndex, street: game.street, type: 'call', amount: paid, aggressive: false });
    showActionFlash(game, playerIndex, 'Call ' + paid);
    afterAction(game);
    return;
  }

  const maxTarget = maxTargetFor(game, playerIndex);
  const legalMin = Math.min(minRaiseTarget(game, playerIndex), maxTarget);
  const target = clampInt(Number(action.target || 0), legalMin, maxTarget);
  const paid = commit(game, playerIndex, target - player.bet);
  const raiseSize = target - previousMaxBet;
  const fullRaise = previousMaxBet === previousPlayerBet || raiseSize >= game.minRaise;
  if (fullRaise) {
    game.minRaise = Math.max(bigBlindAmount(game), raiseSize);
    activePlayers(game).forEach(function (idx) {
      if (idx !== playerIndex && !game.players[idx].allIn) game.players[idx].acted = false;
    });
  }
  markVoluntary(game, playerIndex, paid, true);
  game.reads[playerIndex].aggression += 1 + Math.min(2, paid / Math.max(1, game.pot - paid));
  game.reads[playerIndex].lastAggressiveStreet = game.street;

  const verb = previousMaxBet > previousPlayerBet ? 'raises to' : 'bets';
  addLog(game, player.name + ' ' + verb + ' ' + target);
  game.handActions.push({ player: playerIndex, street: game.street, type: action.type, amount: paid, target, aggressive: true });
  showActionFlash(game, playerIndex, (action.type === 'raise' ? 'Raise ' : 'Bet ') + target);
  afterAction(game);
}

function showActionFlash(game, playerIndex, text) {
  const id = actionFlashSerial += 1;
  game.visualAction = { id, player: playerIndex, text };
  if (typeof window === 'undefined' || game !== state) return;
  if (game.settings && game.settings.aiSpeed === 'instant') {
    game.visualAction = null;
    return;
  }
  clearActionFlashTimer();
  actionFlashTimer = window.setTimeout(function () {
    if (state === game && state.visualAction && state.visualAction.id === id) {
      state.visualAction = null;
      render();
    }
  }, ACTION_FLASH_MS);
}

function clearActionFlashTimer() {
  if (actionFlashTimer != null && typeof window !== 'undefined') window.clearTimeout(actionFlashTimer);
  actionFlashTimer = null;
}

function markVoluntary(game, playerIndex, paid, aggressive) {
  if (paid <= 0) return;
  game.reads[playerIndex].voluntary += paid;
  if (game.street === 'preflop') {
    game.players[playerIndex].hand.vpip = true;
    if (aggressive) game.players[playerIndex].hand.pfr = true;
  }
}

function afterAction(game) {
  game.advisorCache = null;
  if (game.handOver) return;
  if (finishByFoldIfNeeded(game)) return;
  if (actingPlayers(game).length === 0) {
    runoutAndShowdown(game);
    return;
  }
  if (bettingRoundComplete(game)) {
    advanceStreet(game);
    return;
  }
  const next = nextActorAfter(game, game.current);
  if (next == null) {
    if (bettingRoundComplete(game)) advanceStreet(game);
    else runoutAndShowdown(game);
    return;
  }
  game.current = next;
}

function finishByFoldIfNeeded(game) {
  const active = activePlayers(game);
  if (active.length === 1) {
    finishByFold(game, active[0]);
    return true;
  }
  return false;
}

function bettingRoundComplete(game) {
  const maxBet = currentBet(game);
  return activePlayers(game).every(function (idx) {
    const player = game.players[idx];
    return player.allIn || (player.acted && player.bet === maxBet);
  });
}

function advanceStreet(game) {
  game.players.forEach(function (player) { player.bet = 0; player.acted = false; });
  game.minRaise = bigBlindAmount(game);

  if (actingPlayers(game).length === 0) {
    runoutAndShowdown(game);
    return;
  }

  if (game.street === 'preflop') {
    game.street = 'flop';
    game.board.push(drawCard(game), drawCard(game), drawCard(game));
  } else if (game.street === 'flop') {
    game.street = 'turn';
    game.board.push(drawCard(game));
  } else if (game.street === 'turn') {
    game.street = 'river';
    game.board.push(drawCard(game));
  } else {
    showdown(game);
    return;
  }

  addLog(game, STREET_LABELS[game.street] + ': ' + game.board.map(cardText).join(' '));
  game.current = nextActorAfter(game, game.dealer);
  if (game.current == null) runoutAndShowdown(game);
  else game.message = STREET_LABELS[game.street] + ' betting';
}

function runoutAndShowdown(game) {
  while (game.board.length < 5) game.board.push(drawCard(game));
  showdown(game);
}

function showdown(game) {
  game.street = 'showdown';
  game.current = null;
  while (game.board.length < 5) game.board.push(drawCard(game));
  const contenders = activePlayers(game);
  const scores = new Map();
  contenders.forEach(function (idx) { scores.set(idx, evaluateBest(game.players[idx].hole.concat(game.board))); });

  const awards = distributePots(game, scores);
  const byWinner = new Map();
  awards.forEach(function (a) { byWinner.set(a.winner, (byWinner.get(a.winner) || 0) + a.amount); });
  const summary = Array.from(byWinner.entries()).map(function (entry) { return game.players[entry[0]].name + ' +' + entry[1]; }).join(', ');
  addLog(game, 'Showdown: ' + summary);
  game.message = summary || 'Showdown settled';

  game.pot = 0;
  game.players.forEach(function (player) { player.bet = 0; player.acted = false; player.allIn = false; });
  game.handOver = true;
  game.advisorCache = null;
}

function distributePots(game, scores) {
  const levels = Array.from(new Set(game.players.map(function (p) { return p.totalInvested; }).filter(function (v) { return v > 0; }))).sort(function (a, b) { return a - b; });
  let previous = 0;
  const awards = [];
  levels.forEach(function (level) {
    const eligible = game.players.map(function (_, idx) { return idx; }).filter(function (idx) { return game.players[idx].totalInvested >= level; });
    const amount = (level - previous) * eligible.length;
    previous = level;
    if (amount <= 0) return;
    const contenders = eligible.filter(function (idx) { return !game.players[idx].folded; });
    if (contenders.length === 0) return;
    let best = contenders[0];
    contenders.slice(1).forEach(function (idx) { if (compareScores(scores.get(idx), scores.get(best)) > 0) best = idx; });
    const winners = contenders.filter(function (idx) { return compareScores(scores.get(idx), scores.get(best)) === 0; });
    const ordered = orderFromDealerLeft(game, winners);
    const share = Math.floor(amount / ordered.length);
    let remainder = amount - share * ordered.length;
    ordered.forEach(function (idx) {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      const won = share + extra;
      game.players[idx].stack += won;
      awards.push({ winner: idx, amount: won });
    });
  });
  return awards;
}

function orderFromDealerLeft(game, indexes) {
  const set = new Set(indexes);
  const ordered = [];
  for (let step = 1; step <= game.players.length; step += 1) {
    const idx = (game.dealer + step) % game.players.length;
    if (set.has(idx)) ordered.push(idx);
  }
  return ordered;
}

function finishByFold(game, winnerIndex) {
  game.players[winnerIndex].stack += game.pot;
  addLog(game, game.players[winnerIndex].name + ' wins ' + game.pot);
  game.message = game.players[winnerIndex].name + ' wins the pot';
  game.pot = 0;
  game.current = null;
  game.handOver = true;
  game.players.forEach(function (player) { player.bet = 0; player.acted = false; player.allIn = false; });
}

function maybeBotAct() {
  clearBotTimer();
  if (!state) return;
  if (state.handOver) {
    if (!state.settings.autoPlay) return;
    botTimer = window.setTimeout(function () {
      if (!state || !state.settings.autoPlay) return;
      startHand(state);
      render();
      maybeBotAct();
    }, nextHandDelayMs());
    return;
  }
  if (state.current == null || !state.players[state.current].isBot) return;
  state.message = state.players[state.current].name + ' thinking...';
  render();
  botTimer = window.setTimeout(function () {
    if (!state || state.handOver || state.current == null || !state.players[state.current].isBot) return;
    const idx = state.current;
    const analysis = FrequencyPolicy.decide(state, idx, sampleCount(state));
    state.lastAiAnalysis = analysis;
    applyAction(state, idx, chooseMixedAction(analysis));
    render();
    maybeBotAct();
  }, botActionDelayMs());
}

function botActionDelayMs() {
  const key = state && state.settings ? state.settings.aiSpeed : 'normal';
  return AI_SPEED_DELAYS[key] ?? AI_SPEED_DELAYS.normal;
}

function nextHandDelayMs() {
  const key = state && state.settings ? state.settings.aiSpeed : 'normal';
  return NEXT_HAND_DELAYS[key] ?? NEXT_HAND_DELAYS.normal;
}

function clearBotTimer() {
  if (botTimer != null) {
    window.clearTimeout(botTimer);
    botTimer = null;
  }
}

function chooseMixedAction(analysis) {
  if (!analysis || analysis.rows.length === 0) return null;
  const total = analysis.rows.reduce(function (sum, row) { return sum + row.frequency; }, 0);
  let roll = Math.random() * total;
  for (const row of analysis.rows) {
    roll -= row.frequency;
    if (roll <= 0) return row.action;
  }
  return analysis.best.action;
}

function sampleCount(game) {
  const base = DEPTH_SAMPLES[game.settings.depth] || DEPTH_SAMPLES.balanced;
  const opponents = Math.max(1, activePlayers(game).length - 1);
  return Math.max(70, Math.round(base / Math.sqrt(opponents)));
}

const FrequencyPolicy = {
  decide: function (game, playerIndex, samples) {
    const actions = legalActions(game, playerIndex);
    const policy = policyConfigFor(game, playerIndex);
    const equityResult = estimateEquity(game, playerIndex, samples, policy);
    const profile = handProfile(game, playerIndex);
    const position = positionFeatures(game, playerIndex);
    const initiative = initiativeFeatures(game, playerIndex);
    const toCall = Math.min(amountToCall(game, playerIndex), game.players[playerIndex].stack);
    const ctx = {
      equity: equityResult.equity,
      samples: equityResult.samples,
      profile,
      position,
      initiative,
      policy,
      boardTexture: textureScore(game.board),
      toCall,
      requiredEquity: toCall > 0 ? toCall / Math.max(1, game.pot + toCall) : 0,
      mdf: toCall > 0 ? game.pot / Math.max(1, game.pot + toCall) : 1,
      fieldCount: Math.max(1, activePlayers(game).length - 1),
      rangePressure: maxOpponentPressure(game, playerIndex) * policy.readScale,
      unopenedPreflop: game.street === 'preflop' && lastAggressorOnStreet(game, 'preflop') == null && currentBet(game) <= bigBlindAmount(game),
      facingPreflopJam: game.street === 'preflop' && toCall > bigBlindAmount(game) * 10 && currentBet(game) >= startingStackAmount(game) * 0.45,
      facingStreetReraise: isFacingStreetReraise(game, playerIndex, toCall),
      targetAggression: 0,
      continuationQuality: 1
    };
    ctx.continuationQuality = continuationQuality(game, playerIndex, ctx);
    ctx.targetAggression = targetAggressionFrequency(game, playerIndex, ctx);
    const rows = actions.map(function (action) { return evaluatePolicyAction(game, playerIndex, action, ctx); });
    applyFrequencies(game, rows, ctx);
    rows.sort(function (a, b) { return b.score - a.score; });
    return { playerIndex, samples: equityResult.samples, policy: policy.name, equity: equityResult.equity, rangePressure: ctx.rangePressure, boardTexture: ctx.boardTexture, toCall, requiredEquity: ctx.requiredEquity, mdf: ctx.mdf, targetAggression: ctx.targetAggression, profile, position, initiative, best: rows[0] || null, rows };
  }
};

function policyConfigFor(game, playerIndex) {
  const player = game.players[playerIndex] || {};
  const requested = player.policyName || game.settings.policyName || 'current';
  const preset = POLICY_PRESETS[requested] || POLICY_PRESETS.current;
  const activeCount = activePlayers(game).length;
  const config = Object.assign({}, POLICY_PRESETS.current);
  applyPolicyFieldOverride(config, POLICY_PRESETS.current, game, activeCount);
  Object.assign(config, policyBaseOverrides(preset));
  applyPolicyFieldOverride(config, preset, game, activeCount);
  config.name = preset.name || requested;
  return config;
}

function policyBaseOverrides(preset) {
  const base = Object.assign({}, preset);
  delete base.headsUp;
  delete base.sixMax;
  delete base.fullRing;
  delete base.duelHeadsUp;
  return base;
}

function applyPolicyFieldOverride(config, preset, game, activeCount) {
  if (activeCount === 2 && preset.headsUp) Object.assign(config, preset.headsUp);
  else if (activeCount !== 2 && game.players.length >= 8 && preset.fullRing) Object.assign(config, preset.fullRing);
  else if (activeCount !== 2 && game.players.length < 8 && preset.sixMax) Object.assign(config, preset.sixMax);
  if (game.players.length === 2 && preset.duelHeadsUp) Object.assign(config, preset.duelHeadsUp);
}

function evaluatePolicyAction(game, playerIndex, action, ctx) {
  const evInfo = approximateActionEv(game, playerIndex, action, ctx);
  const massInfo = strategyMass(game, playerIndex, action, ctx);
  return { action, ev: evInfo.ev, baseEv: evInfo.baseEv, rolloutEv: evInfo.rolloutEv, rolloutSamples: evInfo.rolloutSamples, foldProbability: evInfo.foldProbability, strategyMass: massInfo.mass, score: 0, frequency: 0, note: massInfo.note };
}

function approximateActionEv(game, playerIndex, action, ctx) {
  const player = game.players[playerIndex];
  const pot = game.pot;
  if (action.type === 'fold') return { ev: 0, baseEv: 0, rolloutEv: null, rolloutSamples: 0, foldProbability: 0 };
  if (action.type === 'check' || action.type === 'call') {
    const cost = action.type === 'call' ? Math.min(amountToCall(game, playerIndex), player.stack) : 0;
    const realization = equityRealization(game, playerIndex, cost, ctx);
    const ev = ctx.equity * realization * (pot + cost) - cost;
    return blendRolloutEv(game, playerIndex, action, ctx, ev, 0);
  }

  const target = action.target;
  const addCost = Math.max(0, Math.min(target - player.bet, player.stack));
  const opponents = activePlayers(game).filter(function (idx) { return idx !== playerIndex; });
  let allFoldProbability = 1;
  let expectedCallPot = 0;
  opponents.forEach(function (idx) {
    const fold = estimateFoldProbabilityAgainst(game, playerIndex, idx, action, ctx);
    allFoldProbability *= fold;
    expectedCallPot += Math.max(0, Math.min(target - game.players[idx].bet, game.players[idx].stack)) * (1 - fold);
  });
  allFoldProbability = clamp(allFoldProbability, 0, 0.86);
  const calledEv = ctx.equity * equityRealization(game, playerIndex, addCost, ctx) * (pot + addCost + expectedCallPot) - addCost;
  const ev = allFoldProbability * pot + (1 - allFoldProbability) * calledEv - largeBetRiskPenalty(game, playerIndex, action, ctx, addCost, pot);
  return blendRolloutEv(game, playerIndex, action, ctx, ev, allFoldProbability);
}

function blendRolloutEv(game, playerIndex, action, ctx, baseEv, foldProbability) {
  const rollout = rolloutEvForAction(game, playerIndex, action, ctx);
  if (!rollout || rollout.samples <= 0) return { ev: baseEv, baseEv, rolloutEv: null, rolloutSamples: 0, foldProbability };
  const weight = rolloutWeight(rollout.samples) * rolloutContextWeight(game, action, ctx) * ctx.policy.rolloutScale;
  const swing = clamp(rollout.ev - baseEv, -rolloutSwingCap(game, action, ctx), rolloutSwingCap(game, action, ctx));
  return {
    ev: baseEv + swing * weight,
    baseEv,
    rolloutEv: rollout.ev,
    rolloutSamples: rollout.samples,
    foldProbability
  };
}

function rolloutWeight(samples) {
  return clamp(0.1 + samples * 0.025, 0.14, 0.34);
}

function rolloutContextWeight(game, action, ctx) {
  let weight = activePlayers(game).length > 2 ? 0.72 : 1;
  if ((action.type === 'bet' || action.type === 'raise') && ctx.initiative.isDonkLead) weight *= 0.28;
  if (action.type === 'check' && ctx.initiative.isDonkLead) weight *= 0.72;
  if (ctx.initiative.missedCbetStab && ctx.position.hasPosition) weight *= 1.08;
  if (game.street === 'river') weight *= 0.65;
  return clamp(weight, 0.12, 1.08);
}

function rolloutSwingCap(game, action, ctx) {
  const base = Math.max(bigBlindAmount(game) * 2.5, game.pot * (action.type === 'raise' ? 0.9 : 0.62));
  const callPressure = ctx.toCall > 0 ? ctx.toCall * 0.35 : 0;
  return base + callPressure;
}

function rolloutSampleCount(game, ctx) {
  if (game.handOver || game.street === 'preflop' || game.street === 'showdown') return 0;
  if (!ctx.policy || ctx.policy.rolloutScale <= 0) return 0;
  if ((ctx.samples || 0) < 24) return 0;
  const activeCount = activePlayers(game).length;
  if (activeCount < 2 || activeCount > ROLLOUT_CONFIG.maxPlayers) return 0;
  const depth = game.settings && game.settings.depth ? game.settings.depth : 'balanced';
  const depthCap = depth === 'deep' ? ROLLOUT_CONFIG.deepCap : depth === 'balanced' ? ROLLOUT_CONFIG.balancedCap : ROLLOUT_CONFIG.fastCap;
  const sampleScaled = Math.max(1, Math.round(Math.sqrt(Math.max(1, ctx.samples || 1)) / 2));
  const fieldPenalty = Math.max(0, activeCount - 2);
  return Math.max(0, Math.min(depthCap, sampleScaled) - fieldPenalty);
}

function rolloutEvForAction(game, playerIndex, action, ctx) {
  const samples = rolloutSampleCount(game, ctx);
  if (samples <= 0) return null;
  let total = 0;
  let used = 0;
  for (let i = 0; i < samples; i += 1) {
    const rollout = cloneGameForRollout(game, playerIndex);
    const baseStack = rollout.players[playerIndex].stack;
    applyAction(rollout, playerIndex, cloneAction(action));
    simulateRollout(rollout, playerIndex, ROLLOUT_CONFIG.maxSteps);
    total += rollout.players[playerIndex].stack - baseStack;
    used += 1;
  }
  return used > 0 ? { ev: total / used, samples: used } : null;
}

function simulateRollout(game, heroIndex, maxSteps) {
  let guard = 0;
  while (!game.handOver && game.current != null && guard < maxSteps) {
    const current = game.current;
    const action = rolloutChooseAction(game, current, heroIndex);
    if (!action) break;
    applyAction(game, current, action);
    guard += 1;
  }
  if (!game.handOver) runoutAndShowdown(game);
}

function rolloutChooseAction(game, playerIndex) {
  const actions = legalActions(game, playerIndex);
  if (actions.length === 0) return null;
  const toCall = Math.min(amountToCall(game, playerIndex), game.players[playerIndex].stack);
  const callAction = actions.find(function (action) { return action.type === 'call'; });
  const checkAction = actions.find(function (action) { return action.type === 'check'; });
  const foldAction = actions.find(function (action) { return action.type === 'fold'; });
  const aggressiveActions = actions.filter(function (action) { return action.type === 'bet' || action.type === 'raise'; });
  const equity = rolloutKnownEquity(game, playerIndex, ROLLOUT_CONFIG.policyEquitySamples);
  const profile = handProfile(game, playerIndex);
  const position = positionFeatures(game, playerIndex);
  const initiative = initiativeFeatures(game, playerIndex);
  const boardTexture = textureScore(game.board);
  const fieldCount = Math.max(1, activePlayers(game).length - 1);

  if (toCall > 0) {
    const required = toCall / Math.max(1, game.pot + toCall);
    const continueScore = equity + profile.draw * 0.75 + profile.blocker * 0.22 + (position.hasPosition ? 0.035 : -0.025) - (fieldCount - 1) * 0.045;
    const polarScore = equity + profile.draw * 1.1 + profile.blocker * 0.55;
    if (aggressiveActions.length > 0 && polarScore > required + (game.street === 'river' ? 0.26 : 0.2) && Math.random() < clamp((polarScore - required - 0.14) * 1.4, 0.04, 0.42)) {
      return selectRolloutAggressiveAction(aggressiveActions, equity, profile, boardTexture);
    }
    if (callAction && continueScore >= required + (game.street === 'river' ? 0.015 : 0.035)) return callAction;
    return foldAction || callAction || actions[0];
  }

  const targetFrequency = rolloutBetFrequency(game, equity, profile, position, initiative, boardTexture, fieldCount);
  if (aggressiveActions.length > 0 && Math.random() < targetFrequency) {
    return selectRolloutAggressiveAction(aggressiveActions, equity, profile, boardTexture);
  }
  return checkAction || actions[0];
}

function rolloutBetFrequency(game, equity, profile, position, initiative, boardTexture, fieldCount) {
  const streetBase = game.street === 'flop' ? 0.44 : game.street === 'turn' ? 0.34 : 0.28;
  let target = streetBase + position.late * 0.16 - boardTexture * 0.08 - (fieldCount - 1) * 0.12;
  if (initiative.hasInitiative) target += game.street === 'flop' ? 0.18 : 0.1;
  if (initiative.isDonkLead) target -= game.street === 'flop' ? 0.22 : 0.14;
  if (initiative.missedCbetStab) target += position.hasPosition ? 0.18 : 0.08;
  target += (equity - 0.5) * 0.65 + profile.draw * 1.35 + profile.blocker * 0.45;
  return clamp(target, 0.04, position.hasPosition && fieldCount === 1 ? 0.92 : 0.78);
}

function selectRolloutAggressiveAction(actions, equity, profile, boardTexture) {
  const desired = equity > 0.72 ? 0.75 : profile.draw > 0.06 || profile.blocker > 0.12 || boardTexture > 0.55 ? 0.5 : 0.33;
  const candidates = actions.filter(function (action) { return action.sizeKey !== 'jam' || equity > 0.78; });
  const pool = candidates.length > 0 ? candidates : actions;
  return pool.slice().sort(function (a, b) {
    return Math.abs((a.potFraction || desired) - desired) - Math.abs((b.potFraction || desired) - desired);
  })[0];
}

function rolloutKnownEquity(game, playerIndex, samples) {
  const contenders = activePlayers(game);
  const player = game.players[playerIndex];
  if (!player || player.hole.length !== 2) return 0.5;
  const opponents = contenders.filter(function (idx) { return idx !== playerIndex && game.players[idx].hole.length === 2; });
  if (opponents.length === 0) return 1;
  const loops = game.street === 'river' || game.board.length >= 5 ? 1 : Math.max(1, samples || 1);
  let score = 0;
  for (let i = 0; i < loops; i += 1) {
    const deck = game.deck.slice();
    const board = game.board.map(copyCard);
    while (board.length < 5) board.push(drawRandomFrom(deck));
    const playerScore = evaluateBest(player.hole.concat(board));
    let beaten = false;
    let tied = 1;
    opponents.forEach(function (idx) {
      if (beaten) return;
      const cmp = compareScores(playerScore, evaluateBest(game.players[idx].hole.concat(board)));
      if (cmp < 0) beaten = true;
      else if (cmp === 0) tied += 1;
    });
    score += beaten ? 0 : 1 / tied;
  }
  return score / loops;
}

function cloneGameForRollout(game, heroIndex) {
  const rules = Object.assign({}, game.rules);
  const clone = {
    handNo: game.handNo,
    dealer: game.dealer,
    smallBlind: game.smallBlind,
    bigBlind: game.bigBlind,
    street: game.street,
    board: game.board.map(copyCard),
    deck: [],
    pot: game.pot,
    current: game.current,
    minRaise: game.minRaise,
    handOver: game.handOver,
    log: [],
    handActions: game.handActions.map(cloneHandAction),
    reads: game.reads.map(function (read) { return Object.assign({}, read); }),
    players: [],
    rules,
    settings: Object.assign({}, game.settings, { rules }),
    lastAiAnalysis: null,
    advisorCache: null,
    message: game.message,
    logging: false
  };
  const samplingPolicy = policyConfigFor(game, heroIndex);
  const known = game.players[heroIndex].hole.concat(game.board).filter(Boolean).map(copyCard);
  const deck = freshDeckWithout(known);
  game.players.forEach(function (player, idx) {
    const copy = {
      name: player.name,
      stack: player.stack,
      hole: [],
      bet: player.bet,
      folded: player.folded,
      allIn: player.allIn,
      acted: player.acted,
      totalInvested: player.totalInvested,
      isBot: player.isBot,
      style: Object.assign({}, player.style),
      policyName: player.policyName || 'current',
      hand: Object.assign({}, player.hand)
    };
    if (idx === heroIndex) {
      copy.hole = player.hole.map(copyCard);
    } else if (!player.folded) {
      const hole = drawWeightedOpponentHole(game, deck, idx, samplingPolicy).map(copyCard);
      copy.hole = hole;
      removeCardsFromDeck(deck, hole);
    }
    clone.players.push(copy);
  });
  clone.deck = shuffle(deck);
  return clone;
}

function copyCard(card) {
  return { rank: card.rank, suit: card.suit };
}

function cloneAction(action) {
  return Object.assign({}, action);
}

function cloneHandAction(action) {
  return Object.assign({}, action);
}

function equityRealization(game, playerIndex, cost, ctx) {
  const outOfPosition = game.street !== 'preflop' && !ctx.position.hasPosition;
  const streetFactor = game.street === 'river' ? 1 : game.street === 'turn' ? 0.94 : game.street === 'flop' ? 0.86 : 0.82;
  const positionSwing = outOfPosition ? -0.08 : 0.03;
  const positionFactor = 1 + positionSwing * ctx.policy.positionScale;
  const callPressure = cost > 0 ? 0.97 : 1;
  const fieldPenalty = 1 - Math.min(0.24, (ctx.fieldCount - 1) * 0.055);
  return clamp(streetFactor * positionFactor * callPressure * fieldPenalty, 0.54, 1.06);
}

function largeBetRiskPenalty(game, playerIndex, action, ctx, cost, pot) {
  const ratio = cost / Math.max(1, pot);
  const isMax = action.target >= maxTargetFor(game, playerIndex);
  const handQualityScale = policyScalar(ctx.policy, 'handQualityScale', 0);
  const madeQuality = Number.isFinite(ctx.profile.madeQuality) ? ctx.profile.madeQuality : ctx.profile.made;
  const madeForPolar = handQualityScale > 0 ? madeQuality : ctx.profile.made;
  const polarized = game.street === 'preflop' ? ctx.equity > 0.72 : madeForPolar >= 0.66 || (game.street !== 'river' && ctx.profile.draw > 0.06) || (game.street === 'river' && ctx.equity < 0.28 && ctx.profile.blocker > 0.15);
  let penalty = 0;
  if (ratio > 1.15) penalty += cost * Math.min(0.34, (ratio - 1.15) * 0.08);
  if (ctx.toCall > 0 && !ctx.unopenedPreflop && action.type === 'raise' && !polarized) penalty += cost * (game.street === 'river' ? 0.28 : 0.12);
  if (game.street !== 'preflop' && handQualityScale > 0 && (action.type === 'bet' || action.type === 'raise')) {
    const marginalShowdown = ctx.profile.made >= 0.3 && madeQuality < 0.48 && ctx.profile.draw < 0.055;
    if (marginalShowdown && ratio > 0.28) penalty += cost * clamp((ratio - 0.28) * 0.18 * handQualityScale + ctx.rangePressure * 0.035 * handQualityScale, 0, 0.26);
  }
  if (isMax && !polarized && pot < startingStackAmount(game) * 0.7) penalty += cost * 0.24;
  if (game.street === 'preflop' && isMax && pot < 18) penalty += cost * (ctx.equity < 0.82 ? 0.55 : 0.2);
  if (ctx.fieldCount >= 3 && ctx.equity < 0.68) penalty += cost * 0.08;
  return penalty;
}

function estimateFoldProbabilityAgainst(game, playerIndex, opponentIndex, action, ctx) {
  const player = game.players[playerIndex];
  const opponent = game.players[opponentIndex];
  if (opponent.allIn || opponent.stack <= 0) return 0;
  const opponentCallCost = Math.max(0, Math.min(action.target - opponent.bet, opponent.stack));
  if (opponentCallCost <= 0) return 0.04;
  const sizePressure = opponentCallCost / Math.max(1, game.pot + opponentCallCost);
  const streetBase = { preflop: 0.1, flop: 0.2, turn: 0.24, river: 0.29, showdown: 0 }[game.street];
  const opponentCommitment = opponent.bet / Math.max(1, opponent.stack + opponent.bet);
  const pressure = clamp(rangePressure(game, opponentIndex) + currentHandRangePressure(game, opponentIndex) * policyScalar(ctx.policy, 'lineFoldReadScale', 0), 0, 0.9);
  const spr = Math.min(player.stack, opponent.stack) / Math.max(1, game.pot);
  const jamBonus = action.target >= maxTargetFor(game, playerIndex) ? (spr < 2.2 ? 0.07 : 0.015) : 0;
  const multiwayTightening = Math.min(0.12, (ctx.fieldCount - 1) * 0.035);
  const valueDampener = ctx.equity > 0.72 ? 0.07 : 0;
  const facingBet = currentBet(game) > player.bet && !ctx.unopenedPreflop;
  const initiativeFold = game.street !== 'preflop' && !facingBet ? (ctx.initiative.hasInitiative ? 0.04 : ctx.initiative.isDonkLead ? -0.1 : ctx.initiative.missedCbetStab ? 0.02 : 0) : 0;
  const raiseIntoStrength = facingBet && action.type === 'raise' ? (game.street === 'river' ? 0.16 : 0.09) : 0;
  const raw = streetBase + sizePressure * 0.48 + ctx.boardTexture * 0.07 + jamBonus + multiwayTightening + initiativeFold - pressure * 0.15 - opponentCommitment * 0.2 - valueDampener - raiseIntoStrength;
  return clamp(raw, 0.03, 0.78);
}

function strategyMass(game, playerIndex, action, ctx) {
  const style = game.players[playerIndex].style || { risk: 1, bluff: 1, call: 1 };
  if (action.type === 'fold') {
    if (ctx.unopenedPreflop) {
      const openThreshold = 0.44 + ctx.position.playersBehind * 0.035 - ctx.position.late * 0.08 - ctx.position.blindDefense * 0.03;
      const openFit = sigmoid((ctx.profile.preflop - openThreshold) * 13);
      return { mass: clamp((0.06 + (1 - openFit) * 1.25) * ctx.policy.foldScale, 0.03, 1.4), note: 'open range ' + percent(openFit) };
    }
    if (ctx.facingPreflopJam && ctx.policy.jamDefenseScale > 0) {
      const jamContinue = sigmoid((ctx.profile.preflop - 0.58) * 13 + ctx.profile.blocker * 1.8 + (ctx.equity - ctx.requiredEquity) * 6);
      const pressureFold = sigmoid((ctx.requiredEquity - ctx.equity + 0.04) * 10);
      const jamScale = ctx.policy.jamDefenseScale;
      return { mass: clamp((0.14 + (1 - jamContinue) * 1.18 * jamScale + pressureFold * 0.38 * jamScale) * ctx.policy.foldScale, 0.06, 1.85), note: 'jam defense ' + percent(jamContinue) };
    }
    const pressureFold = sigmoid((ctx.requiredEquity - ctx.equity + 0.05) * 11);
    const multiwayFold = Math.min(0.25, (ctx.fieldCount - 1) * 0.07);
    const comboScale = policyScalar(ctx.policy, 'comboContinueScale', 0);
    const reraisedFold = ctx.facingStreetReraise ? (1 - ctx.continuationQuality) * 0.72 * comboScale : 0;
    const note = ctx.facingStreetReraise ? 'MDF ' + percent(ctx.mdf) + ' / continue ' + percent(ctx.continuationQuality) : 'MDF ' + percent(ctx.mdf);
    return { mass: clamp((0.03 + pressureFold + multiwayFold + reraisedFold) * ctx.policy.foldScale, 0.03, 1.85), note };
  }
  if (action.type === 'call') {
    const potOddsFit = sigmoid((ctx.equity - ctx.requiredEquity) * 12);
    const drawHelp = ctx.profile.draw * 1.4 + ctx.profile.blocker * 0.35;
    const dominatedPenalty = game.street === 'preflop' && ctx.position.playersBehind >= 4 ? 0.18 : 0;
    if (ctx.facingPreflopJam && ctx.policy.jamDefenseScale > 0) {
      const jamContinue = sigmoid((ctx.profile.preflop - 0.58) * 13 + ctx.profile.blocker * 1.8 + (ctx.equity - ctx.requiredEquity) * 6);
      const mass = (0.04 + jamContinue * 1.25 / ctx.policy.jamDefenseScale + Math.max(0, ctx.equity - ctx.requiredEquity) * 1.1) * style.call * ctx.policy.callScale;
      return { mass: clamp(mass, 0.025, 1.25), note: 'jam call ' + percent(jamContinue) };
    }
    const limpBrake = ctx.unopenedPreflop && !ctx.position.blindDefense ? 0.28 : 1;
    const comboScale = policyScalar(ctx.policy, 'comboContinueScale', 0);
    const comboBrake = ctx.facingStreetReraise ? clamp(1 - (1 - ctx.continuationQuality) * 0.78 * comboScale, 0.18, 1.05) : 1;
    const mass = (0.08 + potOddsFit + drawHelp - dominatedPenalty) * style.call * ctx.policy.callScale * limpBrake * comboBrake / Math.sqrt(ctx.fieldCount);
    const note = ctx.facingStreetReraise ? 'pot odds ' + percent(ctx.requiredEquity) + ' / continue ' + percent(ctx.continuationQuality) : 'pot odds ' + percent(ctx.requiredEquity);
    return { mass: clamp(mass, 0.025, 1.65), note };
  }
  if (action.type === 'check') {
    const showdownValue = clamp(1 - Math.abs(ctx.equity - 0.52) * 1.35, 0, 1);
    const trap = ctx.equity > 0.78 ? 0.18 : 0;
    const madeQuality = Number.isFinite(ctx.profile.madeQuality) ? ctx.profile.madeQuality : ctx.profile.made;
    const potControlScale = policyScalar(ctx.policy, 'potControlScale', 0);
    const marginalMade = game.street !== 'preflop' && ctx.profile.made >= 0.3 && madeQuality < 0.52 && ctx.profile.draw < 0.055;
    const potControl = marginalMade ? (0.34 + ctx.boardTexture * 0.18 + (ctx.position.hasPosition ? 0.02 : 0.12) + ctx.rangePressure * 0.12) * potControlScale : 0;
    const frequencyBrake = 1.18 - ctx.targetAggression * 0.72;
    return { mass: clamp((0.22 + showdownValue * 0.72 + trap + potControl + (ctx.fieldCount - 1) * 0.08) * frequencyBrake, 0.08, 1.85), note: 'target bet ' + percent(ctx.targetAggression) };
  }

  const target = action.target;
  const avgCallCost = averageOpponentCallCost(game, playerIndex, target);
  const bluffRatio = avgCallCost / Math.max(1, game.pot + 2 * avgCallCost);
  const multiwayDiscount = 1 / Math.sqrt(ctx.fieldCount);
  const sizeRatio = avgCallCost / Math.max(1, game.pot + avgCallCost);
  let valueThreshold;
  if (game.street === 'preflop') {
    valueThreshold = (ctx.unopenedPreflop ? 0.42 : 0.5) + ctx.position.playersBehind * 0.038 + sizeRatio * 0.1 - ctx.position.late * 0.1 - ctx.position.blindDefense * 0.06;
  } else {
    const handQualityScale = policyScalar(ctx.policy, 'handQualityScale', 0);
    const madeQuality = Number.isFinite(ctx.profile.madeQuality) ? ctx.profile.madeQuality : ctx.profile.made;
    const marginalMadeTax = Math.max(0, 0.52 - madeQuality) * 0.28 * handQualityScale;
    valueThreshold = 0.53 + Math.min(0.18, (ctx.fieldCount - 1) * 0.045) + sizeRatio * 0.16 - ctx.position.late * 0.08 + marginalMadeTax;
  }
  const isJam = target >= maxTargetFor(game, playerIndex);
  let jamPenalty = isJam ? (ctx.equity > 0.78 || (game.street === 'river' && ctx.profile.blocker > 0.16) ? 0.72 : 0.18) : 1;
  if (game.street === 'preflop' && isJam && game.pot < 18) jamPenalty *= ctx.equity > 0.86 ? 0.55 : 0.06;
  const frequencyBoost = 0.45 + ctx.targetAggression * 1.45 * ctx.policy.aggressionScale;
  const handQualityScale = policyScalar(ctx.policy, 'handQualityScale', 0);
  const madeQuality = Number.isFinite(ctx.profile.madeQuality) ? ctx.profile.madeQuality : ctx.profile.made;
  const madeForPolar = handQualityScale > 0 ? madeQuality : ctx.profile.made;
  const polarRaise = game.street === 'preflop' ? ctx.profile.preflop > 0.72 : madeForPolar >= 0.66 || (game.street !== 'river' && ctx.profile.draw > 0.06) || (game.street === 'river' && ctx.equity < 0.32 && ctx.profile.blocker > 0.15);
  const raiseVsBetPenalty = action.type === 'raise' && ctx.toCall > 0 && !ctx.unopenedPreflop && !polarRaise ? (game.street === 'river' ? 0.1 : 0.35) : 1;
  const comboScale = policyScalar(ctx.policy, 'comboContinueScale', 0);
  const continuePressurePenalty = action.type === 'raise' && ctx.facingStreetReraise ? clamp(1 - (1 - ctx.continuationQuality) * 0.68 * comboScale, 0.18, 1) : 1;
  const marginalShowdown = game.street !== 'preflop' && ctx.profile.made >= 0.3 && madeQuality < 0.52 && ctx.profile.draw < 0.055;
  const potControlScale = policyScalar(ctx.policy, 'potControlScale', 0);
  const potControlBrake = marginalShowdown ? clamp(1 - (0.22 + sizeRatio * 0.75 + ctx.rangePressure * 0.12) * potControlScale, 0.22, 1) : 1;
  const thinValueBrake = marginalShowdown ? clamp(1 - (0.18 + sizeRatio * 1.05 + ctx.rangePressure * 0.16) * handQualityScale, 0.32, 1) * potControlBrake : 1;
  const multiwayCbetBrakeScale = policyScalar(ctx.policy, 'multiwayCbetBrakeScale', 0);
  const weakMultiwayCbet = game.street !== 'preflop' && ctx.fieldCount >= 2 && ctx.initiative.hasInitiative && ctx.toCall <= 0 && madeQuality < 0.54 && ctx.profile.draw < 0.055 && (ctx.profile.drawQuality || 0) < 0.11;
  const multiwayCbetBrake = weakMultiwayCbet ? clamp(1 - ((ctx.fieldCount - 1) * 0.18 + sizeRatio * 0.42 + ctx.boardTexture * 0.08) * multiwayCbetBrakeScale, 0.38, 1) : 1;
  const valueMass = sigmoid((ctx.equity - valueThreshold) * 12) * style.risk * jamPenalty * frequencyBoost * raiseVsBetPenalty * continuePressurePenalty * thinValueBrake * multiwayCbetBrake;
  const drawQualityScale = policyScalar(ctx.policy, 'drawQualityScale', 0);
  const drawForBluff = ctx.profile.draw + Math.max(0, (ctx.profile.drawQuality || ctx.profile.draw) - ctx.profile.draw) * drawQualityScale;
  const naturalDrawBonus = ((ctx.profile.nutDraw || 0) * 0.08 + (ctx.profile.comboDraw || 0) * 0.12) * drawQualityScale;
  const semiBluff = (drawForBluff * 1.35 + naturalDrawBonus + ctx.profile.blocker * 0.8 + ctx.boardTexture * 0.18) * bluffRatio * multiwayDiscount * style.bluff * jamPenalty * frequencyBoost * raiseVsBetPenalty * continuePressurePenalty * potControlBrake * multiwayCbetBrake;
  const lowEquityBluff = game.street === 'river' ? sigmoid((0.35 - ctx.equity) * 9) * ctx.profile.blocker * bluffRatio * 1.8 * multiwayDiscount * style.bluff * frequencyBoost * raiseVsBetPenalty * continuePressurePenalty * potControlBrake * multiwayCbetBrake : 0;
  const denyBrake = marginalShowdown ? clamp(thinValueBrake + 0.08, 0.28, 1) : 1;
  const denyEquity = game.street !== 'river' && ctx.equity > 0.46 && ctx.equity < 0.63 ? 0.16 * multiwayDiscount * frequencyBoost * raiseVsBetPenalty * continuePressurePenalty * denyBrake * multiwayCbetBrake : 0;
  return { mass: clamp(0.035 + valueMass + semiBluff + lowEquityBluff + denyEquity, 0.025, 2.35), note: 'target ' + percent(ctx.targetAggression) + ' / bluff ' + percent(bluffRatio * multiwayDiscount) };
}

function averageOpponentCallCost(game, playerIndex, target) {
  const opponents = activePlayers(game).filter(function (idx) { return idx !== playerIndex && !game.players[idx].folded; });
  if (opponents.length === 0) return 0;
  return opponents.reduce(function (sum, idx) { return sum + Math.max(0, Math.min(target - game.players[idx].bet, game.players[idx].stack)); }, 0) / opponents.length;
}

function applyFrequencies(game, rows, ctx) {
  if (rows.length === 0) return;
  const maxEv = Math.max.apply(null, rows.map(function (row) { return row.ev; }));
  const temperature = Math.max(1.25, game.pot * 0.075 + ctx.fieldCount * 0.2) * ctx.policy.temperatureScale;
  let total = 0;
  rows.forEach(function (row) {
    const prior = Math.log(Math.max(0.015, row.strategyMass));
    row.score = (row.ev - maxEv) / temperature + prior;
    row.frequency = Math.exp(row.score);
    total += row.frequency;
  });
  rows.forEach(function (row) { row.frequency = total > 0 ? row.frequency / total : 1 / rows.length; });
}

function targetAggressionFrequency(game, playerIndex, ctx) {
  const facingBet = ctx.toCall > 0 && !ctx.unopenedPreflop;
  let target;
  if (game.street === 'preflop') {
    target = facingBet ? 0.16 : 0.18 + ctx.position.late * 0.34 - ctx.position.playersBehind * 0.032 + ctx.position.blindDefense * 0.04;
  } else if (game.street === 'flop') {
    target = facingBet ? 0.18 : 0.62 + ctx.position.late * 0.12 - ctx.boardTexture * 0.2 - (ctx.fieldCount - 1) * 0.12;
  } else if (game.street === 'turn') {
    target = facingBet ? 0.14 : 0.48 + ctx.position.late * 0.1 - ctx.boardTexture * 0.14 - (ctx.fieldCount - 1) * 0.09;
  } else {
    target = facingBet ? 0.1 : 0.42 + ctx.position.late * 0.08 - (ctx.fieldCount - 1) * 0.07;
  }
  if (game.street !== 'preflop' && !facingBet) {
    if (ctx.initiative.hasInitiative) target += game.street === 'flop' ? 0.14 : game.street === 'turn' ? 0.09 : 0.04;
    if (ctx.initiative.isDonkLead) target -= game.street === 'flop' ? 0.2 : game.street === 'turn' ? 0.14 : 0.08;
    if (ctx.initiative.hasInitiative && ctx.position.hasPosition && ctx.fieldCount === 1 && ctx.boardTexture < 0.45) target += 0.08;
  }
  if (game.street !== 'preflop' && facingBet && ctx.initiative.hasInitiative && ctx.profile.draw > 0.05) target += 0.04;
  const drawQualityScale = policyScalar(ctx.policy, 'drawQualityScale', 0);
  const drawPressure = ctx.profile.draw * 0.55 + Math.max(0, (ctx.profile.drawQuality || ctx.profile.draw) - ctx.profile.draw) * 0.78 * drawQualityScale + ((ctx.profile.nutDraw || 0) * 0.04 + (ctx.profile.comboDraw || 0) * 0.05) * drawQualityScale;
  target += drawPressure + ctx.profile.blocker * 0.35;
  if (ctx.equity > 0.68) target += 0.16;
  if (ctx.equity < 0.28 && game.street !== 'river') target -= 0.14;
  if (ctx.equity < 0.22 && game.street === 'river') target += ctx.profile.blocker * 0.55;
  if (game.street !== 'preflop' && !facingBet && ctx.initiative.isDonkLead) {
    target = target * (ctx.fieldCount === 1 ? 0.38 : 0.5) - 0.08;
  }
  if (game.street !== 'preflop' && !facingBet && ctx.initiative.missedCbetStab) {
    target += game.street === 'flop' ? 0.08 : 0.04;
  }
  const multiwayCbetBrakeScale = policyScalar(ctx.policy, 'multiwayCbetBrakeScale', 0);
  if (game.street !== 'preflop' && !facingBet && ctx.fieldCount >= 2 && ctx.initiative.hasInitiative) {
    const madeQuality = Number.isFinite(ctx.profile.madeQuality) ? ctx.profile.madeQuality : ctx.profile.made;
    const drawQuality = ctx.profile.drawQuality || ctx.profile.draw || 0;
    const robust = ctx.equity > 0.66 || madeQuality > 0.58 || drawQuality > 0.11 || (ctx.profile.nutDraw || 0) > 0;
    target -= (ctx.fieldCount - 1) * (robust ? 0.025 : 0.09) * multiwayCbetBrakeScale;
  }
  if (game.street !== 'preflop' && !facingBet) {
    if (ctx.initiative.hasInitiative) target *= ctx.policy.cbetScale;
    else if (ctx.initiative.isDonkLead) target *= ctx.policy.donkScale;
    else if (ctx.initiative.missedCbetStab) target *= ctx.policy.stabScale;
  }
  target *= ctx.policy.aggressionScale;
  return clamp(target, facingBet ? 0.04 : 0.08, facingBet ? 0.42 : 0.82);
}

function initiativeFeatures(game, playerIndex) {
  const preflopAggressor = lastAggressorOnStreet(game, 'preflop');
  const currentStreetAggressor = lastAggressorOnStreet(game, game.street);
  const firstAggressiveOnStreet = currentStreetAggressor == null;
  const preflopAggressorActive = preflopAggressor != null && !game.players[preflopAggressor].folded;
  const preflopAggressorActed = preflopAggressorActive && hasPlayerActedOnStreet(game, preflopAggressor, game.street);
  const hasInitiative = game.street !== 'preflop' && preflopAggressor === playerIndex && firstAggressiveOnStreet;
  const isDonkLead = game.street !== 'preflop' && firstAggressiveOnStreet && preflopAggressorActive && preflopAggressor !== playerIndex && !preflopAggressorActed;
  const missedCbetStab = game.street !== 'preflop' && firstAggressiveOnStreet && preflopAggressorActive && preflopAggressor !== playerIndex && preflopAggressorActed;
  return { preflopAggressor, currentStreetAggressor, hasInitiative, isDonkLead, missedCbetStab };
}

function lastAggressorOnStreet(game, street) {
  for (let i = game.handActions.length - 1; i >= 0; i -= 1) {
    const action = game.handActions[i];
    if (action.street === street && action.aggressive) return action.player;
  }
  return null;
}

function hasPlayerActedOnStreet(game, playerIndex, street) {
  return game.handActions.some(function (action) {
    return action.street === street && action.player === playerIndex;
  });
}

function hasPlayerAggressedOnStreet(game, playerIndex, street) {
  return game.handActions.some(function (action) {
    return action.street === street && action.player === playerIndex && action.aggressive;
  });
}

function isFacingStreetReraise(game, playerIndex, toCall) {
  if (game.street === 'preflop' || game.street === 'showdown' || toCall <= 0) return false;
  const aggressor = lastAggressorOnStreet(game, game.street);
  return aggressor != null && aggressor !== playerIndex && hasPlayerAggressedOnStreet(game, playerIndex, game.street);
}

function positionFeatures(game, playerIndex) {
  const order = actionOrder(game.street === 'preflop' ? 'preflop' : 'postflop', game);
  const liveOrder = order.filter(function (idx) { return !game.players[idx].folded && !game.players[idx].allIn; });
  const index = Math.max(0, liveOrder.indexOf(playerIndex));
  const denom = Math.max(1, liveOrder.length - 1);
  const late = index / denom;
  const playersBehind = Math.max(0, liveOrder.length - index - 1);
  return { late, playersBehind, hasPosition: index === liveOrder.length - 1, blindDefense: playerIndex === game.bigBlind || playerIndex === game.smallBlind ? 1 : 0 };
}

function actionOrder(kind, game) {
  const order = [];
  let start;
  if (kind === 'preflop') start = game.players.length === 2 ? game.smallBlind : nextSeat(game, game.bigBlind);
  else start = nextSeat(game, game.dealer);
  if (start == null) return order;
  order.push(start);
  while (order.length < game.players.length) order.push((order[order.length - 1] + 1) % game.players.length);
  return order;
}

function estimateEquity(game, playerIndex, samples, policy) {
  const player = game.players[playerIndex];
  const opponents = activePlayers(game).filter(function (idx) { return idx !== playerIndex; });
  const known = player.hole.concat(game.board).filter(Boolean);
  const available = freshDeckWithout(known);
  let score = 0;
  let actualSamples = 0;
  const loops = Math.max(1, samples || 1);

  for (let sample = 0; sample < loops; sample += 1) {
    const deck = available.slice();
    const sampled = new Map();
    opponents.forEach(function (idx) {
      const hole = drawWeightedOpponentHole(game, deck, idx, policy);
      sampled.set(idx, hole);
      removeCardsFromDeck(deck, hole);
    });
    const board = game.board.slice();
    while (board.length < 5) board.push(drawRandomFrom(deck));
    const heroScore = evaluateBest(player.hole.concat(board));
    let beaten = false;
    let tied = 1;
    opponents.forEach(function (idx) {
      if (beaten) return;
      const oppScore = evaluateBest(sampled.get(idx).concat(board));
      const cmp = compareScores(heroScore, oppScore);
      if (cmp < 0) beaten = true;
      else if (cmp === 0) tied += 1;
    });
    score += beaten ? 0 : 1 / tied;
    actualSamples += 1;
  }
  return { equity: actualSamples > 0 ? score / actualSamples : 0.5, samples: actualSamples };
}

function freshDeckWithout(knownCards) {
  const known = new Set(knownCards.map(cardKey));
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const card = { rank, suit };
      if (!known.has(cardKey(card))) deck.push(card);
    }
  }
  return deck;
}

function drawWeightedOpponentHole(game, deck, opponentIndex, policy) {
  let fallback = null;
  for (let attempt = 0; attempt < 34; attempt += 1) {
    const firstIndex = Math.floor(Math.random() * deck.length);
    let secondIndex = Math.floor(Math.random() * (deck.length - 1));
    if (secondIndex >= firstIndex) secondIndex += 1;
    const hole = [deck[firstIndex], deck[secondIndex]];
    fallback = hole;
    if (Math.random() <= rangeWeight(game, hole, opponentIndex, policy)) return hole;
  }
  return fallback;
}

function drawRandomFrom(deck) {
  const index = Math.floor(Math.random() * deck.length);
  const card = deck[index];
  deck.splice(index, 1);
  return card;
}

function removeCardsFromDeck(deck, cards) {
  const remove = new Set(cards.map(cardKey));
  for (let i = deck.length - 1; i >= 0; i -= 1) if (remove.has(cardKey(deck[i]))) deck.splice(i, 1);
}

function maxOpponentPressure(game, playerIndex) {
  const pressures = activePlayers(game).filter(function (idx) { return idx !== playerIndex; }).map(function (idx) { return rangePressure(game, idx); });
  return pressures.length === 0 ? 0 : Math.max.apply(null, pressures);
}

function rangePressure(game, playerIndex) {
  const stats = game.reads[playerIndex] || makeRead();
  const streetBoost = stats.lastAggressiveStreet === game.street ? 0.12 : 0;
  const betPressure = game.players[playerIndex].bet / Math.max(1, game.pot + game.players[playerIndex].bet);
  return clamp(stats.aggression * 0.105 + stats.voluntary / 170 + streetBoost + betPressure * 0.25, 0, 0.84);
}

function currentHandRangePressure(game, playerIndex) {
  const player = game.players[playerIndex];
  if (!player) return 0;
  const actions = game.handActions.filter(function (action) {
    return action.player === playerIndex && action.type !== 'ante' && action.type !== 'SB' && action.type !== 'BB';
  });
  if (actions.length === 0) return 0;

  const bb = Math.max(1, bigBlindAmount(game));
  const startingStack = Math.max(1, startingStackAmount(game));
  const preflopOrder = actionOrder('preflop', game);
  const orderIndex = preflopOrder.indexOf(playerIndex);
  const earlySeatBoost = orderIndex >= 0 ? Math.max(0, preflopOrder.length - orderIndex - 1) * 0.012 : 0;
  let pressure = 0;
  let aggressionCount = 0;
  let callCount = 0;
  let checkCount = 0;

  actions.forEach(function (action) {
    const amount = Math.max(0, Number(action.amount) || 0);
    const target = Math.max(amount, Number(action.target) || 0);
    const sizeBb = target > 0 ? target / bb : amount / bb;
    const sizeBoost = clamp(Math.log2(1 + sizeBb) * 0.025, 0, 0.1);
    const isCurrentStreet = action.street === game.street;
    if (action.aggressive) {
      aggressionCount += 1;
      const preflopJam = action.street === 'preflop' && (target >= startingStack * 0.45 || player.allIn);
      if (preflopJam) {
        pressure += 0.035 + (isCurrentStreet ? 0.015 : 0);
        return;
      }
      pressure += (action.street === 'preflop' ? 0.11 : 0.085) + (action.type === 'raise' ? 0.045 : 0.02) + sizeBoost + (isCurrentStreet ? 0.035 : 0);
      if (action.street === 'preflop') pressure += earlySeatBoost;
    } else if (action.type === 'call') {
      callCount += 1;
      pressure += (action.street === 'preflop' ? 0.038 : 0.03) + sizeBoost * 0.55 + (isCurrentStreet ? 0.015 : 0);
    } else if (action.type === 'check') {
      checkCount += 1;
      pressure -= isCurrentStreet ? 0.018 : 0.01;
    }
  });

  if (aggressionCount > 1) pressure += Math.min(0.16, (aggressionCount - 1) * 0.055);
  if (callCount > 1 && aggressionCount === 0) pressure += Math.min(0.06, (callCount - 1) * 0.025);
  if (checkCount > 1 && aggressionCount === 0) pressure -= Math.min(0.05, (checkCount - 1) * 0.015);
  pressure += clamp((player.totalInvested || player.bet || 0) / startingStack * 0.18, 0, 0.12);
  return clamp(pressure, 0, 0.64);
}

function policyScalar(policy, key, fallback) {
  const value = policy ? Number(policy[key]) : NaN;
  return Number.isFinite(value) ? value : fallback;
}

function lineCallRangePressure(game, playerIndex) {
  const bb = Math.max(1, bigBlindAmount(game));
  let pressure = 0;
  game.handActions.forEach(function (action, index) {
    if (action.player !== playerIndex || action.type !== 'call' || action.street === 'preflop') return;
    const priorAggression = lastAggressionBefore(game, action.street, index);
    if (!priorAggression || priorAggression.player === playerIndex) return;
    const amount = Math.max(0, Number(action.amount) || 0);
    const sizeBoost = clamp(Math.log2(1 + amount / bb) * 0.03, 0, 0.12);
    const streetBoost = action.street === 'turn' || action.street === 'river' ? 0.035 : 0;
    const carriesForward = action.street !== game.street ? 0.025 : 0.01;
    pressure += 0.095 + sizeBoost + streetBoost + carriesForward;
  });
  return clamp(pressure, 0, 0.46);
}

function lastAggressionBefore(game, street, beforeIndex) {
  for (let i = beforeIndex - 1; i >= 0; i -= 1) {
    const action = game.handActions[i];
    if (action.street === street && action.aggressive) return action;
  }
  return null;
}

function rangeWeight(game, hole, playerIndex, policy) {
  const pressure = clamp(rangePressure(game, playerIndex) + currentHandRangePressure(game, playerIndex) * policyScalar(policy, 'actionReadScale', 0) + lineCallRangePressure(game, playerIndex) * policyScalar(policy, 'lineCallReadScale', 0), 0, 0.9);
  if (pressure <= 0.03) return 1;
  const preflop = preflopStrength(hole);
  const rawMade = game.board.length >= 3 ? madeOrDrawStrength(hole, game.board) : preflop;
  const comboRangeScale = policyScalar(policy, 'comboRangeScale', 0);
  const madeQuality = game.board.length >= 3 ? madeDetail(hole, game.board).quality + drawPotential(hole.concat(game.board)) : preflop;
  const made = game.board.length >= 3 ? rawMade * (1 - comboRangeScale) + madeQuality * comboRangeScale : preflop;
  const combined = game.board.length >= 3 ? preflop * 0.4 + made * 0.6 : preflop;
  const threshold = 0.18 + pressure * 0.56;
  return clamp(0.07 + (combined - threshold + 0.32) * 1.65, 0.05, 1);
}

function handProfile(game, playerIndex) {
  const hole = game.players[playerIndex].hole;
  const preflop = preflopStrength(hole);
  const detail = game.board.length >= 3 ? madeDetail(hole, game.board) : { quality: preflop, pairQuality: 0, holeMade: 0 };
  const made = game.board.length >= 3 ? madeStrength(hole, game.board) : preflop;
  const drawInfo = game.board.length >= 3 ? drawDetail(hole, game.board) : { potential: preflopDrawBonus(hole), quality: preflopDrawBonus(hole), nut: 0, combo: 0 };
  const draw = drawInfo.potential;
  const blocker = blockerScore(hole, game.board);
  return { preflop, made, madeQuality: detail.quality, pairQuality: detail.pairQuality, holeMade: detail.holeMade, draw, drawQuality: drawInfo.quality, nutDraw: drawInfo.nut, comboDraw: drawInfo.combo, blocker };
}

function preflopStrength(hole) {
  const a = hole[0];
  const b = hole[1];
  if (!a || !b) return 0.5;
  const hi = Math.max(a.rank, b.rank);
  const lo = Math.min(a.rank, b.rank);
  const pair = hi === lo;
  const suited = a.suit === b.suit;
  const gap = hi - lo;
  let score = hi / 14 * 0.34 + lo / 14 * 0.24;
  if (pair) score = 0.52 + hi / 14 * 0.42;
  if (suited) score += 0.06;
  if (gap === 1) score += 0.06;
  if (gap === 2) score += 0.035;
  if (gap >= 5 && !pair) score -= 0.06;
  if (hi >= 11 && lo >= 10) score += 0.08;
  if (hi === 14 && lo >= 10) score += 0.05;
  return clamp(score, 0.04, 0.98);
}

function preflopDrawBonus(hole) {
  if (!hole[0] || !hole[1]) return 0;
  const suited = hole[0].suit === hole[1].suit ? 0.035 : 0;
  const gap = Math.abs(hole[0].rank - hole[1].rank);
  return suited + (gap <= 2 ? 0.04 : 0);
}

function continuationQuality(game, playerIndex, ctx) {
  if (game.street === 'preflop' || game.street === 'showdown') return 1;
  const madeQuality = Number.isFinite(ctx.profile.madeQuality) ? ctx.profile.madeQuality : ctx.profile.made;
  const equityFit = sigmoid((ctx.equity - ctx.requiredEquity) * 10);
  const madeFit = sigmoid((madeQuality - 0.46) * 9);
  const nutFit = sigmoid((madeQuality - 0.66) * 10);
  const drawQualityScale = policyScalar(ctx.policy, 'drawQualityScale', 0);
  const drawValue = ctx.profile.draw + Math.max(0, (ctx.profile.drawQuality || ctx.profile.draw) - ctx.profile.draw) * drawQualityScale;
  const drawFit = game.street === 'river' ? 0 : clamp(drawValue * 4.8 + (ctx.profile.nutDraw || 0) * 0.08 * drawQualityScale + (ctx.profile.comboDraw || 0) * 0.08 * drawQualityScale, 0, 0.48);
  const blockerFit = clamp(ctx.profile.blocker * 1.9, 0, 0.28);
  let quality = equityFit * 0.45 + madeFit * 0.28 + nutFit * 0.14 + drawFit + blockerFit;
  if (ctx.facingStreetReraise) {
    const weakMade = madeQuality < 0.45 && ctx.profile.made >= 0.3 && ctx.profile.draw < 0.055;
    if (weakMade) quality -= 0.22 + Math.min(0.16, ctx.rangePressure * 0.18);
    if (!ctx.position.hasPosition) quality -= 0.04;
  }
  quality -= Math.min(0.12, Math.max(0, ctx.fieldCount - 1) * 0.04);
  return clamp(quality, 0, 1);
}

function madeDetail(hole, board) {
  const cards = hole.concat(board);
  if (cards.length < 5) return { quality: preflopStrength(hole), pairQuality: 0, holeMade: 0 };
  const best = evaluateBest(cards);
  const base = [0.18, 0.34, 0.52, 0.66, 0.78, 0.82, 0.9, 0.96, 1][best.category] || 0.2;
  if (best.category === 1) return pairMadeDetail(hole, board, best);
  if (best.category === 2) return twoPairMadeDetail(hole, board, best, base);
  if (best.category === 3) return tripsMadeDetail(hole, board, best, base);
  return { quality: base, pairQuality: 0, holeMade: best.category >= 4 ? 1 : 0 };
}

function pairMadeDetail(hole, board, best) {
  const pairRank = best.values[0];
  const holeRanks = hole.map(function (card) { return card.rank; });
  const boardRanks = Array.from(new Set(board.map(function (card) { return card.rank; })));
  const topBoardRank = Math.max.apply(null, boardRanks);
  const boardRanksAbove = boardRanks.filter(function (rank) { return rank > pairRank; }).length;
  const pairFromHole = holeRanks.includes(pairRank);
  const kickerFit = rankFit(best.values[1] || Math.max.apply(null, holeRanks));
  let quality;
  if (!pairFromHole) quality = 0.2 + rankFit(Math.max.apply(null, holeRanks)) * 0.1;
  else if (pairRank > topBoardRank) quality = 0.55 + rankFit(pairRank) * 0.1 + kickerFit * 0.04;
  else if (pairRank === topBoardRank) quality = 0.44 + rankFit(pairRank) * 0.08 + kickerFit * 0.1;
  else if (boardRanksAbove === 1) quality = 0.36 + rankFit(pairRank) * 0.06 + kickerFit * 0.07;
  else quality = 0.26 + rankFit(pairRank) * 0.06 + kickerFit * 0.06;
  return { quality: clamp(quality, 0.18, 0.68), pairQuality: clamp(quality, 0, 1), holeMade: pairFromHole ? 1 : 0 };
}

function twoPairMadeDetail(hole, board, best, base) {
  const pairRanks = best.values.slice(0, 2);
  const holeRanks = hole.map(function (card) { return card.rank; });
  const boardRanks = board.map(function (card) { return card.rank; });
  const topBoardRank = Math.max.apply(null, boardRanks);
  const holeHits = pairRanks.filter(function (rank) { return holeRanks.includes(rank); }).length;
  const boardOnly = holeHits === 0;
  let quality = boardOnly ? 0.43 : base + holeHits * 0.045;
  if (pairRanks.includes(topBoardRank)) quality += 0.045;
  quality += rankFit(pairRanks[0]) * 0.035;
  return { quality: clamp(quality, 0.42, 0.72), pairQuality: clamp(quality, 0, 1), holeMade: boardOnly ? 0 : 1 };
}

function tripsMadeDetail(hole, board, best, base) {
  const tripRank = best.values[0];
  const holeTrips = hole.filter(function (card) { return card.rank === tripRank; }).length;
  const boardTrips = board.filter(function (card) { return card.rank === tripRank; }).length;
  let quality = base;
  if (holeTrips === 0 && boardTrips >= 3) quality = 0.53 + rankFit(best.values[1] || 2) * 0.12;
  else if (holeTrips === 1 && boardTrips === 2) quality = 0.67 + rankFit(tripRank) * 0.06;
  else if (holeTrips === 2) quality = 0.72 + rankFit(tripRank) * 0.05;
  return { quality: clamp(quality, 0.5, 0.82), pairQuality: 0, holeMade: holeTrips > 0 ? 1 : 0 };
}

function rankFit(rank) {
  return clamp(((Number(rank) || 2) - 2) / 12, 0, 1);
}

function madeStrength(hole, board) {
  const cards = hole.concat(board);
  if (cards.length < 5) return preflopStrength(hole);
  const best = evaluateBest(cards);
  return [0.18, 0.34, 0.52, 0.66, 0.78, 0.82, 0.9, 0.96, 1][best.category] || 0.2;
}

function madeOrDrawStrength(hole, board) {
  return clamp(madeStrength(hole, board) + drawPotential(hole.concat(board)), 0.04, 1);
}

function drawDetail(hole, board) {
  const cards = hole.concat(board);
  const potential = drawPotential(cards);
  if (board.length < 3 || potential <= 0) return { potential, quality: potential, nut: 0, combo: 0 };

  const suitCounts = new Map();
  cards.forEach(function (card) { suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1); });
  let flushQuality = 0;
  let nut = 0;
  suitCounts.forEach(function (count, suit) {
    if (count !== 4) return;
    const suitedHole = hole.filter(function (card) { return card.suit === suit; });
    if (suitedHole.length === 0) return;
    const high = Math.max.apply(null, suitedHole.map(function (card) { return card.rank; }));
    const highFit = rankFit(high);
    const nutFit = high === 14 ? 1 : high >= 13 ? 0.55 : high >= 11 ? 0.25 : 0;
    nut = Math.max(nut, nutFit);
    flushQuality = Math.max(flushQuality, 0.04 + highFit * 0.06 + nutFit * 0.055);
  });

  const rankItems = cards.map(function (card) { return card.rank === 14 ? [14, 1] : [card.rank]; }).flat();
  const ranks = Array.from(new Set(rankItems)).sort(function (a, b) { return a - b; });
  const holeRankSet = new Set(hole.map(function (card) { return card.rank === 14 ? [14, 1] : [card.rank]; }).flat());
  let straightQuality = 0;
  for (let low = 1; low <= 10; low += 1) {
    const window = [low, low + 1, low + 2, low + 3, low + 4];
    const hits = window.filter(function (rank) { return ranks.includes(rank); });
    if (hits.length !== 4) continue;
    const heroHits = hits.filter(function (rank) { return holeRankSet.has(rank); }).length;
    if (heroHits <= 0) continue;
    const highFit = rankFit(Math.min(14, low + 4));
    straightQuality = Math.max(straightQuality, 0.025 + heroHits * 0.018 + highFit * 0.025);
  }

  const combo = flushQuality > 0 && straightQuality > 0 ? 1 : 0;
  const quality = clamp(potential + flushQuality + straightQuality + combo * 0.08, potential, 0.28);
  return { potential, quality, nut, combo };
}

function drawPotential(cards) {
  const suitCounts = new Map();
  cards.forEach(function (card) { suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1); });
  const maxSuit = Math.max.apply(null, Array.from(suitCounts.values()));
  const flushDraw = maxSuit === 4 ? 0.08 : maxSuit >= 5 ? 0.03 : 0;
  const ranks = Array.from(new Set(cards.map(function (card) { return card.rank === 14 ? [14, 1] : [card.rank]; }).flat())).sort(function (a, b) { return a - b; });
  let straightDraw = 0;
  for (let low = 1; low <= 10; low += 1) {
    const hits = [low, low + 1, low + 2, low + 3, low + 4].filter(function (rank) { return ranks.includes(rank); }).length;
    if (hits === 4) straightDraw = 0.07;
    if (hits === 5) straightDraw = Math.max(straightDraw, 0.03);
  }
  return flushDraw + straightDraw;
}

function blockerScore(hole, board) {
  let score = 0;
  hole.forEach(function (card) {
    if (card.rank === 14) score += 0.08;
    if (card.rank >= 12) score += 0.035;
  });
  if (board.length >= 3) {
    const suitCounts = new Map();
    board.forEach(function (card) { suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1); });
    const pressuredSuit = Array.from(suitCounts.entries()).sort(function (a, b) { return b[1] - a[1]; })[0];
    if (pressuredSuit && pressuredSuit[1] >= 3 && hole.some(function (card) { return card.suit === pressuredSuit[0] && card.rank >= 12; })) score += 0.12;
  }
  return clamp(score, 0, 0.32);
}

function textureScore(board) {
  if (board.length < 3) return 0.18;
  const suitCounts = new Map();
  const rankCounts = new Map();
  board.forEach(function (card) {
    suitCounts.set(card.suit, (suitCounts.get(card.suit) || 0) + 1);
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
  });
  const maxSuit = Math.max.apply(null, Array.from(suitCounts.values()));
  const paired = Array.from(rankCounts.values()).some(function (count) { return count >= 2; }) ? 0.16 : 0;
  const ranks = Array.from(new Set(board.map(function (card) { return card.rank === 14 ? [14, 1] : [card.rank]; }).flat())).sort(function (a, b) { return a - b; });
  let connected = 0;
  for (let low = 1; low <= 10; low += 1) {
    const hits = [low, low + 1, low + 2, low + 3, low + 4].filter(function (rank) { return ranks.includes(rank); }).length;
    connected = Math.max(connected, hits / 5);
  }
  return clamp((maxSuit >= 3 ? 0.28 : 0.08) + connected * 0.42 + paired, 0, 1);
}

function evaluateBest(cards) {
  if (cards.length < 5) return evaluatePartial(cards);
  let best = null;
  for (let a = 0; a < cards.length - 4; a += 1) {
    for (let b = a + 1; b < cards.length - 3; b += 1) {
      for (let c = b + 1; c < cards.length - 2; c += 1) {
        for (let d = c + 1; d < cards.length - 1; d += 1) {
          for (let e = d + 1; e < cards.length; e += 1) {
            const score = scoreFive([cards[a], cards[b], cards[c], cards[d], cards[e]]);
            if (!best || compareScores(score, best) > 0) best = score;
          }
        }
      }
    }
  }
  return best;
}

function evaluatePartial(cards) {
  if (cards.length === 2) {
    const a = cards[0];
    const b = cards[1];
    const suited = a.suit === b.suit ? ' suited' : '';
    if (a.rank === b.rank) return { category: 1, values: [a.rank], value: encodeScore(1, [a.rank]), name: RANK_LABELS[a.rank] + RANK_LABELS[b.rank] + ' pair' };
    const hi = Math.max(a.rank, b.rank);
    const lo = Math.min(a.rank, b.rank);
    return { category: 0, values: [hi, lo], value: encodeScore(0, [hi, lo]), name: RANK_LABELS[hi] + RANK_LABELS[lo] + suited };
  }
  const ranks = cards.map(function (card) { return card.rank; }).sort(function (a, b) { return b - a; });
  return { category: 0, values: ranks, value: encodeScore(0, ranks), name: RANK_LABELS[ranks[0]] + '-high' };
}

function scoreFive(cards) {
  const ranks = cards.map(function (card) { return card.rank; }).sort(function (a, b) { return b - a; });
  const flush = cards.every(function (card) { return card.suit === cards[0].suit; });
  const straightHigh = getStraightHigh(ranks);
  const counts = new Map();
  ranks.forEach(function (rank) { counts.set(rank, (counts.get(rank) || 0) + 1); });
  const groups = Array.from(counts.entries()).map(function (entry) { return { rank: entry[0], count: entry[1] }; }).sort(function (a, b) { return b.count - a.count || b.rank - a.rank; });
  if (flush && straightHigh) return namedScore(8, [straightHigh], straightHigh === 14 ? 'Royal flush' : 'Straight flush');
  if (groups[0].count === 4) return namedScore(7, [groups[0].rank, groups.find(function (g) { return g.count === 1; }).rank], 'Four of a kind');
  if (groups[0].count === 3 && groups[1].count === 2) return namedScore(6, [groups[0].rank, groups[1].rank], 'Full house');
  if (flush) return namedScore(5, ranks, 'Flush');
  if (straightHigh) return namedScore(4, [straightHigh], 'Straight');
  if (groups[0].count === 3) return namedScore(3, [groups[0].rank].concat(groups.filter(function (g) { return g.count === 1; }).map(function (g) { return g.rank; }).sort(function (a, b) { return b - a; })), 'Three of a kind');
  if (groups[0].count === 2 && groups[1].count === 2) {
    const pairs = groups.filter(function (g) { return g.count === 2; }).map(function (g) { return g.rank; }).sort(function (a, b) { return b - a; });
    const kicker = groups.find(function (g) { return g.count === 1; }).rank;
    return namedScore(2, pairs.concat([kicker]), 'Two pair');
  }
  if (groups[0].count === 2) return namedScore(1, [groups[0].rank].concat(groups.filter(function (g) { return g.count === 1; }).map(function (g) { return g.rank; }).sort(function (a, b) { return b - a; })), 'Pair');
  return namedScore(0, ranks, 'High card');
}

function namedScore(category, values, name) {
  return { category, values, value: encodeScore(category, values), name };
}

function encodeScore(category, values) {
  const padded = values.slice(0, 5);
  while (padded.length < 5) padded.push(0);
  return padded.reduce(function (score, value) { return score * 15 + value; }, category);
}

function getStraightHigh(ranks) {
  const unique = Array.from(new Set(ranks));
  if (unique.includes(14)) unique.push(1);
  unique.sort(function (a, b) { return b - a; });
  for (let i = 0; i <= unique.length - 5; i += 1) {
    const windowRanks = unique.slice(i, i + 5);
    if (windowRanks[0] - windowRanks[4] === 4 && new Set(windowRanks).size === 5) return windowRanks[0];
  }
  return 0;
}

function compareScores(a, b) {
  return a.value - b.value;
}

function runSelfplayFromUi() {
  els.benchOutput.textContent = 'Running selfplay...';
  window.setTimeout(function () {
    const result = runSelfplayBenchmark(state.settings.playerCount, 35, 24, state.settings.rules);
    els.benchOutput.textContent = formatSelfplayResult(result);
  }, 20);
}

function runSelfplayBenchmark(playerCount, hands, samples, rules) {
  const totals = Array.from({ length: playerCount }, function () { return 0; });
  let decisions = 0;
  let benchmarkBigBlind = BIG_BLIND;
  let benchmarkStartingStack = STARTING_STACK;
  const start = performance.now();
  for (let h = 0; h < hands; h += 1) {
    const game = createGame(playerCount, { playerCount, depth: 'fast', rules: rules || DEFAULT_RULE_CONFIG }, { logging: false, heroIsBot: true });
    benchmarkBigBlind = bigBlindAmount(game);
    benchmarkStartingStack = startingStackAmount(game);
    game.dealer = (h - 1 + playerCount) % playerCount;
    startHand(game);
    let guard = 0;
    while (!game.handOver && guard < 700) {
      const analysis = FrequencyPolicy.decide(game, game.current, samples);
      applyAction(game, game.current, chooseMixedAction(analysis));
      decisions += 1;
      guard += 1;
    }
    game.players.forEach(function (p, idx) { totals[idx] += p.stack - benchmarkStartingStack; });
  }
  return { playerCount, hands, totals, decisions, elapsed: performance.now() - start, bigBlind: benchmarkBigBlind } ;
}

function formatSelfplayResult(result) {
  const lines = [];
  lines.push('Selfplay: ' + result.hands + ' hands, ' + result.playerCount + ' players');
  lines.push('decisions: ' + result.decisions + ', ms/decision: ' + (result.elapsed / Math.max(1, result.decisions)).toFixed(2));
  result.totals.forEach(function (total, idx) {
    const bb100 = total / Math.max(1, result.bigBlind) / result.hands * 100;
    lines.push((idx === HERO ? 'You-policy' : 'AI-' + idx) + ': ' + formatChip(total) + ' chips, ' + bb100.toFixed(1) + ' bb/100');
  });
  return lines.join('\n');
}

function runTeacherFromUi() {
  try {
    const rows = JSON.parse(els.teacherInput.value || '[]');
    els.benchOutput.textContent = formatTeacherResult(evaluateTeacherRows(rows, 200));
  } catch (err) {
    els.benchOutput.textContent = 'Teacher JSON parse error: ' + err.message;
  }
}

function evaluateTeacherRows(rows, samples) {
  const results = rows.map(function (row) {
    const game = teacherSpotToGame(row);
    const analysis = FrequencyPolicy.decide(game, HERO, samples);
    const pred = aggregateActionDistribution(analysis.rows, row.teacher || {});
    const target = normalizeDistribution(row.teacher || {});
    const kl = klDivergence(target, pred);
    const topPred = topKey(pred);
    const topTarget = topKey(target);
    return { id: row.id || 'spot', pred, target, kl, topPred, topTarget, match: topPred === topTarget };
  });
  return { rows: results, avgKl: results.reduce(function (sum, r) { return sum + r.kl; }, 0) / Math.max(1, results.length), top1: results.filter(function (r) { return r.match; }).length / Math.max(1, results.length) };
}

function teacherSpotToGame(row) {
  const playerCount = clampInt(Number(row.players || 6), 2, ENGINE_MAX_PLAYERS);
  const ruleOverrides = Object.assign({}, row.rules || {});
  if (row.blind || row.blinds) ruleOverrides.blind = row.blind || row.blinds;
  if (row.stackBb) ruleOverrides.startingStackBb = row.stackBb;
  const game = createGame(playerCount, { playerCount, depth: 'balanced', rules: ruleOverrides }, { logging: false, heroIsBot: true });
  game.handOver = false;
  game.street = row.street || 'preflop';
  game.board = parseCards(row.board || '');
  game.deck = freshDeckWithout(game.board);
  game.pot = Number(row.pot || 0);
  game.current = HERO;
  game.dealer = clampInt(Number(row.dealer == null ? playerCount - 1 : row.dealer), 0, playerCount - 1);
  game.smallBlind = playerCount === 2 ? game.dealer : nextSeat(game, game.dealer);
  game.bigBlind = nextSeat(game, game.smallBlind);
  game.minRaise = Number(row.minRaise || bigBlindAmount(game));
  game.players.forEach(function (p) { p.stack = Number(row.stack || startingStackAmount(game)); p.hole = []; p.bet = 0; p.folded = false; p.allIn = false; p.acted = false; p.totalInvested = 0; });
  game.players[HERO].hole = parseCards(row.hole || 'AsKs');
  if (game.players[HERO].hole.length !== 2) game.players[HERO].hole = parseCards('AsKs');
  applyTeacherPosition(game, row.position);
  if (Array.isArray(row.bets)) {
    row.bets.slice(0, playerCount).forEach(function (bet, idx) { game.players[idx].bet = Number(bet || 0); game.players[idx].totalInvested = Number(bet || 0); });
  } else {
    const heroBet = Number(row.heroBet || 0);
    const toCall = Number(row.toCall || 0);
    game.players[HERO].bet = heroBet;
    game.players[HERO].totalInvested = heroBet;
    if (toCall > 0 && playerCount > 1) {
      game.players[1].bet = heroBet + toCall;
      game.players[1].totalInvested = heroBet + toCall;
    }
  }
  applyTeacherActivePlayers(game, row);
  const invested = game.players.reduce(function (sum, p) { return sum + p.totalInvested; }, 0);
  game.pot = Math.max(game.pot, invested);
  applyTeacherHistory(game, row);
  return game;
}

function applyTeacherActivePlayers(game, row) {
  if (!Array.isArray(row.active) && !Array.isArray(row.folded)) return;
  const active = Array.isArray(row.active) ? new Set(row.active.map(function (idx) { return teacherPlayerIndex(game, idx); })) : null;
  const folded = Array.isArray(row.folded) ? new Set(row.folded.map(function (idx) { return teacherPlayerIndex(game, idx); })) : new Set();
  if (active) active.add(HERO);
  game.players.forEach(function (player, idx) {
    player.folded = active ? !active.has(idx) : folded.has(idx);
  });
  game.players[HERO].folded = false;
}

function applyTeacherHistory(game, row) {
  const actions = [];
  const explicitHistory = Array.isArray(row.history) ? row.history : [];
  const hasPreflopAggressor = explicitHistory.some(function (action) {
    return action.street === 'preflop' && action.aggressive !== false && ['bet', 'raise', 'open', 'reraise'].includes(String(action.type || '').toLowerCase());
  });
  if (row.preflopAggressor != null && !hasPreflopAggressor) {
    actions.push({ player: teacherPlayerIndex(game, row.preflopAggressor), street: 'preflop', type: 'raise', amount: 0, aggressive: true });
  }
  explicitHistory.forEach(function (action) {
    const type = String(action.type || 'check').toLowerCase();
    actions.push({
      player: teacherPlayerIndex(game, action.player),
      street: action.street || 'preflop',
      type,
      amount: Number(action.amount || 0),
      target: action.target == null ? undefined : Number(action.target),
      aggressive: action.aggressive == null ? type === 'bet' || type === 'raise' || type === 'open' || type === 'reraise' : Boolean(action.aggressive)
    });
  });
  game.handActions = actions;
  actions.forEach(function (action) {
    if (action.aggressive && game.reads[action.player]) {
      game.reads[action.player].aggression += 1 + Math.min(2, Number(action.amount || 0) / Math.max(1, game.pot));
      game.reads[action.player].lastAggressiveStreet = action.street;
    }
  });
}

function teacherPlayerIndex(game, value) {
  if (String(value).toLowerCase() === 'hero') return HERO;
  return clampInt(Number(value == null ? HERO : value), 0, game.players.length - 1);
}

function applyTeacherPosition(game, position) {
  if (!position) return;
  const pos = String(position).toUpperCase();
  const n = game.players.length;
  if (pos === 'BTN') game.dealer = HERO;
  if (pos === 'SB') game.dealer = n === 2 ? HERO : (HERO - 1 + n) % n;
  if (pos === 'BB') game.dealer = n === 2 ? (HERO + 1) % n : (HERO - 2 + n * 2) % n;
  if (pos === 'UTG' && n > 2) game.dealer = (HERO - 3 + n * 3) % n;
  game.smallBlind = n === 2 ? game.dealer : nextSeat(game, game.dealer);
  game.bigBlind = nextSeat(game, game.smallBlind);
}

function aggregateActionDistribution(rows, teacher) {
  const dist = {};
  rows.forEach(function (row) {
    const bucket = actionBucket(row.action, teacher);
    dist[bucket] = (dist[bucket] || 0) + row.frequency;
  });
  return normalizeDistribution(dist);
}

function actionBucket(action, teacher) {
  if (action.type === 'bet') return 'bet';
  if (action.type === 'raise') return teacher && Object.prototype.hasOwnProperty.call(teacher, 'jam') && action.sizeKey === 'jam' ? 'jam' : 'raise';
  return action.type;
}

function normalizeDistribution(dist) {
  const out = {};
  const entries = Object.entries(dist).filter(function (entry) { return Number(entry[1]) > 0; });
  const total = entries.reduce(function (sum, entry) { return sum + Number(entry[1]); }, 0);
  if (total <= 0) return out;
  entries.forEach(function (entry) { out[entry[0]] = Number(entry[1]) / total; });
  return out;
}

function klDivergence(target, pred) {
  let kl = 0;
  Object.keys(target).forEach(function (key) {
    const t = Math.max(0, target[key]);
    if (t > 0) kl += t * Math.log(t / Math.max(0.0001, pred[key] || 0));
  });
  return kl;
}

function topKey(dist) {
  const entries = Object.entries(dist).sort(function (a, b) { return b[1] - a[1]; });
  return entries.length ? entries[0][0] : 'none';
}

function formatTeacherResult(result) {
  const lines = [];
  lines.push('Teacher bench: ' + result.rows.length + ' spots');
  lines.push('top1: ' + percent(result.top1) + ', avg KL: ' + result.avgKl.toFixed(3));
  result.rows.forEach(function (row) { lines.push(row.id + ': target ' + row.topTarget + ', pred ' + row.topPred + ', KL ' + row.kl.toFixed(3)); });
  return lines.join('\n');
}

function parseCards(text) {
  const cards = [];
  const cleaned = String(text || '').replace(/[^2-9TJQKAshdc]/gi, '');
  for (let i = 0; i < cleaned.length - 1; i += 2) {
    const rank = RANK_VALUES[cleaned[i].toUpperCase()];
    const suit = cleaned[i + 1].toLowerCase();
    if (rank && SUITS.includes(suit)) cards.push({ rank, suit });
  }
  return cards;
}

function render() {
  if (!state) return;
  els.statusLine.textContent = statusText();
  els.potValue.textContent = String(state.pot);
  els.pokerTable.className = 'poker-table players-' + state.players.length;
  els.seatsGrid.className = 'seats-grid players-' + state.players.length;
  els.boardCards.innerHTML = renderBoard();
  els.seatsGrid.innerHTML = state.players.map(function (_, idx) { return renderSeat(idx); }).join('');
  renderActions();
  renderAdvisor();
  renderLog();
  els.newHandBtn.disabled = !state.handOver;
}

function statusText() {
  const street = STREET_LABELS[state.street] || state.street;
  const rules = rulesText(state);
  if (state.handOver) return state.message + ' · ' + street + ' · Hand ' + state.handNo + ' · ' + rules;
  const player = state.players[state.current];
  return (player ? player.name + ' turn' : 'Settling') + ' · ' + street + ' · Hand ' + state.handNo + ' · ' + rules;
}

function rulesText(game) {
  const rules = game.rules;
  const mode = rules.mode === 'tournament' ? 'Tourney' : 'Cash';
  const level = rules.mode === 'tournament' && rules.levelHands > 0 ? ' L' + rules.level : '';
  const ante = rules.ante > 0 ? ' ante ' + rules.ante : '';
  return mode + level + ' ' + rules.smallBlind + '/' + rules.bigBlind + ante;
}

function renderBoard() {
  const cards = state.board.map(cardHtml).join('');
  const empties = Array.from({ length: 5 - state.board.length }, function (_, i) { return '<div class="empty-card">' + (i + state.board.length + 1) + '</div>'; }).join('');
  return cards + empties;
}

function renderSeat(playerIndex) {
  const player = state.players[playerIndex];
  const showCards = playerIndex === HERO || state.handOver || state.settings.peekAiCards;
  const score = showCards && player.hole.length === 2 ? evaluateBest(player.hole.concat(state.board)) : null;
  const holeCards = player.hole.length === 2 ? player.hole.map(function (card) { return showCards ? cardHtml(card) : cardBackHtml(); }).join('') : cardBackHtml() + cardBackHtml();
  const badges = [
    state.dealer === playerIndex ? '<span class="dealer-badge">D</span>' : '',
    state.smallBlind === playerIndex ? '<span class="blind-badge">SB</span>' : '',
    state.bigBlind === playerIndex ? '<span class="blind-badge">BB</span>' : '',
    state.current === playerIndex && !state.handOver ? '<span class="turn-badge">Turn</span>' : ''
  ].join('');
  const latestAction = latestActionForPlayer(playerIndex);
  const classes = ['seat', playerIndex === HERO ? 'hero' : '', player.folded ? 'folded' : '', state.current === playerIndex && !state.handOver ? 'acting' : ''].filter(Boolean).join(' ');
  const label = player.folded ? 'Folded' : score ? score.name : 'Hidden';
  return '<section class="' + classes + '">' +
    '<div class="player-name-row"><span class="player-name">' + escapeHtml(player.name) + '</span><span class="badges">' + badges + '</span></div>' +
    '<div class="stack-grid"><div class="metric"><span>Stack</span><strong>' + player.stack + '</strong></div><div class="metric"><span>Bet</span><strong>' + player.bet + '</strong></div></div>' +
    '<div class="cards hole-cards">' + holeCards + '</div><div class="hand-label">' + escapeHtml(label) + '</div>' +
    (latestAction ? '<div class="action-flash">' + escapeHtml(latestAction) + '</div>' : '') + '</section>';
}

function latestActionForPlayer(playerIndex) {
  if (!state || !state.visualAction || state.visualAction.player !== playerIndex) return '';
  return state.visualAction.text || '';
}

function actionSummary(action) {
  if (action.type === 'fold') return 'Fold';
  if (action.type === 'check') return 'Check';
  if (action.type === 'call') return 'Call ' + action.amount;
  if (action.type === 'bet') return 'Bet ' + (action.target || action.amount);
  if (action.type === 'raise') return 'Raise ' + (action.target || action.amount);
  return action.type;
}

function cardHtml(card) {
  const red = card.suit === 'h' || card.suit === 'd';
  return '<div class="card ' + (red ? 'red' : '') + '" aria-label="' + cardText(card) + '"><span class="rank">' + RANK_LABELS[card.rank] + '</span><span class="suit">' + SUIT_LABELS[card.suit] + '</span><span class="corner-suit">' + SUIT_LABELS[card.suit] + '</span></div>';
}

function cardBackHtml() {
  return '<div class="card back" aria-label="Hidden card"></div>';
}

function renderActions() {
  const actions = legalActions(state, HERO);
  if (state.handOver) {
    els.actionControls.innerHTML = '<div class="action-grid"><button class="primary-button" type="button" data-command="new-hand">New Hand</button></div>';
    els.actionControls.querySelector('[data-command="new-hand"]').addEventListener('click', function () { startHand(state); render(); maybeBotAct(); });
    return;
  }
  if (state.players[HERO].isBot) {
    els.actionControls.innerHTML = '<p class="note">AI観戦中。速度を変えるか、AI観戦を切ると操作に戻ります。</p>';
    return;
  }
  if (state.current !== HERO) {
    els.actionControls.innerHTML = '<p class="note">AI is acting.</p>';
    return;
  }

  const indexedActions = actions.map(function (action, index) { return { action, index }; });
  const fixedButtons = indexedActions.filter(function (entry) { return ['fold', 'check', 'call'].includes(entry.action.type); });
  const raiseButtons = indexedActions.filter(function (entry) { return ['bet', 'raise'].includes(entry.action.type); });
  const buttons = fixedButtons.concat(raiseButtons.slice(0, 3)).map(function (entry) { return actionButtonHtml(entry.action, entry.index); }).join('');
  els.actionControls.innerHTML = '<div class="action-grid">' + buttons + '</div>' + customRaiseHtml(raiseButtons.map(function (entry) { return entry.action; }));
  els.actionControls.querySelectorAll('[data-action-index]').forEach(function (button) {
    button.addEventListener('click', function () { applyHumanAction(actions[Number(button.getAttribute('data-action-index'))]); });
  });

  const customButton = els.actionControls.querySelector('[data-custom-raise]');
  const customRange = els.actionControls.querySelector('[data-raise-range]');
  const customValue = els.actionControls.querySelector('[data-raise-value]');
  if (customButton && customRange && customValue) {
    customRange.addEventListener('input', function () { customValue.textContent = customRange.value; });
    customButton.addEventListener('click', function () {
      const verb = currentBet(state) > state.players[HERO].bet ? 'raise' : 'bet';
      applyHumanAction({ type: verb, label: verb + ' ' + customRange.value, target: Number(customRange.value) });
    });
  }
}

function applyHumanAction(action) {
  applyAction(state, HERO, action);
  render();
  maybeBotAct();
}

function actionButtonHtml(action, index) {
  const dangerClass = action.type === 'fold' ? ' danger-button' : '';
  const primaryClass = action.type === 'call' || action.type === 'check' ? ' primary-button' : '';
  return '<button class="action-button' + dangerClass + primaryClass + '" type="button" data-action-index="' + index + '">' + escapeHtml(action.label) + '</button>';
}

function customRaiseHtml(raiseActions) {
  if (raiseActions.length === 0) return '';
  const min = minRaiseTarget(state, HERO);
  const max = maxTargetFor(state, HERO);
  if (max <= min) return '';
  const value = raiseActions[Math.min(1, raiseActions.length - 1)].target;
  const verb = currentBet(state) > state.players[HERO].bet ? 'Raise to' : 'Bet';
  return '<div class="slider-row"><input data-raise-range type="range" min="' + min + '" max="' + max + '" value="' + value + '" step="1" /><button class="action-button" type="button" data-custom-raise>' + verb + ' <span data-raise-value>' + value + '</span></button></div>';
}

function renderAdvisor() {
  if (!state.settings.showAdvisor) {
    els.advisorPanel.innerHTML = '<div class="block-heading"><h2>AI推奨</h2><button class="ghost-button compact-button" type="button" data-show-advisor>Show</button></div><p class="note">Hidden</p>';
    const showButton = els.advisorPanel.querySelector('[data-show-advisor]');
    if (showButton) showButton.addEventListener('click', function () { setAdvisorVisible(true); });
    return;
  }
  let analysis = null;
  let title = 'AI推奨';
  if (!state.handOver && state.current === HERO) analysis = cachedAdvisorAnalysis();
  else if (state.lastAiAnalysis) { analysis = state.lastAiAnalysis; title = 'AI Last Thought'; }
  if (!analysis || !analysis.best) {
    els.advisorPanel.innerHTML = '<div class="block-heading"><h2>' + title + '</h2><button class="ghost-button compact-button" type="button" data-hide-advisor>Hide</button></div><p class="note">No decision point.</p>';
    const hideButton = els.advisorPanel.querySelector('[data-hide-advisor]');
    if (hideButton) hideButton.addEventListener('click', function () { setAdvisorVisible(false); });
    return;
  }

  const rows = analysis.rows.slice(0, 5).map(function (row, index) {
    const rolloutText = row.rolloutSamples > 0 ? ' r' + row.rolloutSamples : '';
    return '<div class="ev-row ' + (index === 0 ? 'best' : '') + '"><strong>' + escapeHtml(row.action.label) + '</strong><span>EV ' + formatChip(row.ev) + rolloutText + '</span><span>' + Math.round(row.frequency * 100) + '%</span></div>';
  }).join('');
  els.advisorPanel.innerHTML = '<div class="block-heading"><h2>' + title + '</h2><button class="ghost-button compact-button" type="button" data-hide-advisor>Hide</button></div>' +
    '<div class="advisor-card"><div class="recommendation"><span>Recommended</span><strong>' + escapeHtml(analysis.best.action.label) + '</strong></div>' +
    '<div class="analysis-grid"><div class="analysis-metric"><span>Equity</span><strong>' + percent(analysis.equity) + '</strong></div><div class="analysis-metric"><span>MDF</span><strong>' + percent(analysis.mdf) + '</strong></div><div class="analysis-metric"><span>Target</span><strong>' + percent(analysis.targetAggression) + '</strong></div><div class="analysis-metric"><span>Samples</span><strong>' + analysis.samples + '</strong></div></div>' +
    '<div class="ev-table">' + rows + '</div><p class="note">' + escapeHtml(analysis.best.note) + '</p></div>';
  const hideButton = els.advisorPanel.querySelector('[data-hide-advisor]');
  if (hideButton) hideButton.addEventListener('click', function () { setAdvisorVisible(false); });
}

function setAdvisorVisible(visible) {
  state.settings.showAdvisor = visible;
  els.advisorToggle.checked = visible;
  state.advisorCache = null;
  render();
}

function cachedAdvisorAnalysis() {
  const key = advisorKey();
  if (state.advisorCache && state.advisorCache.key === key) return state.advisorCache.analysis;
  const analysis = FrequencyPolicy.decide(state, HERO, sampleCount(state));
  state.advisorCache = { key, analysis };
  return analysis;
}

function advisorKey() {
  return JSON.stringify({ street: state.street, board: state.board.map(cardKey), hero: state.players[HERO].hole.map(cardKey), stacks: state.players.map(function (p) { return p.stack; }), bets: state.players.map(function (p) { return p.bet; }), folded: state.players.map(function (p) { return p.folded; }), pot: state.pot, current: state.current, depth: state.settings.depth, actions: state.handActions.length });
}

function renderLog() {
  els.handLog.innerHTML = state.log.map(function (entry) { return '<li>' + escapeHtml(entry) + '</li>'; }).join('');
}

function cardText(card) {
  return RANK_LABELS[card.rank] + SUIT_LABELS[card.suit];
}

function blindVerb(game, playerIndex) {
  const name = game.players[playerIndex].name;
  return name === 'You' ? 'You post' : name + ' posts';
}

function cardKey(card) {
  return String(card.rank) + card.suit;
}

function formatChip(value) {
  if (Math.abs(value) < 0.05) return '0.0';
  return (value > 0 ? '+' : '') + value.toFixed(1);
}

function percent(value) {
  return Math.round(value * 100) + '%';
}

function sigmoid(value) {
  return 1 / (1 + Math.exp(-value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll(String.fromCharCode(34), '&quot;').replaceAll(String.fromCharCode(39), '&#039;');
}

if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', init);
