#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { performance } = require('perf_hooks');

function parseArgs(argv) {
  const args = {
    players: '2,6,9',
    hands: 120,
    samples: 18,
    seed: 1,
    mode: 'cash',
    blind: '1/2',
    stackBb: 100,
    ante: 0,
    levelHands: 0,
    json: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') {
      args.json = true;
      continue;
    }
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2).replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
    const value = argv[i + 1];
    i += 1;
    if (key in args) args[key] = value;
  }
  args.players = String(args.players).split(',').map(function (v) { return Number(v.trim()); }).filter(Boolean);
  args.hands = Number(args.hands);
  args.samples = Number(args.samples);
  args.seed = Number(args.seed);
  args.stackBb = Number(args.stackBb);
  args.ante = Number(args.ante);
  args.levelHands = Number(args.levelHands);
  return args;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function loadApi(seed) {
  const rng = mulberry32(seed);
  const seededMath = Object.create(Math);
  seededMath.random = rng;
  const context = { console, performance, Math: seededMath };
  vm.createContext(context);
  const source = fs.readFileSync(path.join(__dirname, 'app.js'), 'utf8');
  vm.runInContext(source + `\nthis.__api = {\n  createGame, startHand, FrequencyPolicy, chooseMixedAction, applyAction,\n  evaluateTeacherRows, DEFAULT_TEACHER_ROWS\n};`, context);
  return context.__api;
}

function makeRules(args) {
  return {
    mode: args.mode === 'tournament' ? 'tournament' : 'cash',
    blind: args.blind,
    startingStackBb: args.stackBb,
    anteFraction: args.ante,
    levelHands: args.mode === 'tournament' ? args.levelHands : 0,
  };
}

function runSelfplay(api, players, hands, samples, rules) {
  const totals = Array.from({ length: players }, function () { return 0; });
  const vpip = Array.from({ length: players }, function () { return 0; });
  const pfr = Array.from({ length: players }, function () { return 0; });
  const actionCounts = {};
  let decisions = 0;
  let cappedHands = 0;
  let bigBlind = 2;
  let startingStack = 200;
  const started = performance.now();

  for (let hand = 0; hand < hands; hand += 1) {
    const game = api.createGame(players, { playerCount: players, depth: 'fast', rules }, { logging: false, heroIsBot: true });
    game.dealer = (hand - 1 + players) % players;
    game.handNo = hand;
    api.startHand(game);
    bigBlind = game.rules.bigBlind;
    startingStack = game.rules.startingStack;

    let guard = 0;
    while (!game.handOver && guard < 900) {
      const current = game.current;
      const analysis = api.FrequencyPolicy.decide(game, current, samples);
      const action = api.chooseMixedAction(analysis);
      actionCounts[action.type] = (actionCounts[action.type] || 0) + 1;
      api.applyAction(game, current, action);
      decisions += 1;
      guard += 1;
    }
    if (guard >= 900) cappedHands += 1;

    game.players.forEach(function (player, idx) {
      totals[idx] += player.stack - startingStack;
      if (player.hand.vpip) vpip[idx] += 1;
      if (player.hand.pfr) pfr[idx] += 1;
    });
  }

  const elapsedMs = performance.now() - started;
  return {
    players,
    hands,
    samples,
    rules,
    bigBlind,
    decisions,
    cappedHands,
    elapsedMs,
    msPerDecision: elapsedMs / Math.max(1, decisions),
    actionCounts,
    seats: totals.map(function (chips, idx) {
      return {
        seat: idx,
        chips,
        bb100: chips / Math.max(1, bigBlind) / hands * 100,
        vpip: vpip[idx] / hands,
        pfr: pfr[idx] / hands,
      };
    }),
  };
}

function runTeacher(api, samples) {
  const result = api.evaluateTeacherRows(api.DEFAULT_TEACHER_ROWS, samples);
  return { spots: result.rows.length, top1: result.top1, avgKl: result.avgKl, rows: result.rows };
}

function formatPct(value) {
  return Math.round(value * 1000) / 10 + '%';
}

function printText(results, teacher) {
  results.forEach(function (result) {
    console.log(`players=${result.players} hands=${result.hands} decisions=${result.decisions} ms/decision=${result.msPerDecision.toFixed(2)} capped=${result.cappedHands}`);
    console.log(`actions=${JSON.stringify(result.actionCounts)}`);
    result.seats.forEach(function (seat) {
      console.log(`  seat ${seat.seat}: ${seat.bb100.toFixed(1)} bb/100, vpip=${formatPct(seat.vpip)}, pfr=${formatPct(seat.pfr)}`);
    });
  });
  console.log(`teacher: spots=${teacher.spots} top1=${formatPct(teacher.top1)} avgKL=${teacher.avgKl.toFixed(3)}`);
}

function main() {
  const args = parseArgs(process.argv);
  const api = loadApi(args.seed);
  const rules = makeRules(args);
  const results = args.players.map(function (players) {
    return runSelfplay(api, players, args.hands, args.samples, rules);
  });
  const teacher = runTeacher(api, args.samples);
  const payload = { seed: args.seed, rules, results, teacher };
  if (args.json) console.log(JSON.stringify(payload, null, 2));
  else printText(results, teacher);
}

main();
