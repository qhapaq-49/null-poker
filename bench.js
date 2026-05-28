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
    seeds: '',
    mode: 'cash',
    blind: '1/2',
    stackBb: 100,
    ante: 0,
    levelHands: 0,
    villain: 'mirror',
    lineup: 'current',
    league: '',
    rotateLineup: 'true',
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
  args.seedList = parseSeedList(args.seeds, args.seed);
  args.stackBb = Number(args.stackBb);
  args.ante = Number(args.ante);
  args.levelHands = Number(args.levelHands);
  args.rotateLineup = String(args.rotateLineup).toLowerCase() !== 'false';
  return args;
}

function parseSeedList(seeds, fallback) {
  const list = String(seeds || '').split(',').map(function (value) { return Number(value.trim()); }).filter(function (value) { return Number.isFinite(value); });
  return list.length > 0 ? list : [fallback];
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
  vm.runInContext(source + `\nthis.__api = {\n  createGame, startHand, FrequencyPolicy, chooseMixedAction, applyAction, legalActions,\n  evaluateTeacherRows, DEFAULT_TEACHER_ROWS\n};`, context);
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

function runSelfplay(api, players, hands, samples, rules, villain, lineupArg, rotateLineup) {
  const totals = Array.from({ length: players }, function () { return 0; });
  const vpip = Array.from({ length: players }, function () { return 0; });
  const pfr = Array.from({ length: players }, function () { return 0; });
  const actionCounts = {};
  const streetActions = {};
  const freqStats = { cbetOpp: 0, cbet: 0, ipCbetOpp: 0, ipCbet: 0, oopCbetOpp: 0, oopCbet: 0, donkOpp: 0, donk: 0, stabOpp: 0, stab: 0 };
  const lineup = expandLineup(lineupArg, players);
  const policyStats = {};
  let decisions = 0;
  let cappedHands = 0;
  let bigBlind = 2;
  let startingStack = 200;
  const started = performance.now();

  for (let hand = 0; hand < hands; hand += 1) {
    const game = api.createGame(players, { playerCount: players, depth: 'fast', rules }, { logging: false, heroIsBot: true });
    const handLineup = rotateLineup ? rotateLineupForHand(lineup, hand) : lineup;
    assignLineup(game, handLineup, villain);
    game.dealer = (hand - 1 + players) % players;
    game.handNo = hand;
    api.startHand(game);
    bigBlind = game.rules.bigBlind;
    startingStack = game.rules.startingStack;

    let guard = 0;
    while (!game.handOver && guard < 900) {
      const current = game.current;
      const action = chooseBenchAction(api, game, current, samples, villain);
      if (!action) break;
      actionCounts[action.type] = (actionCounts[action.type] || 0) + 1;
      const streetKey = game.street + ':' + action.type;
      streetActions[streetKey] = (streetActions[streetKey] || 0) + 1;
      recordFrequencySpot(game, current, action, freqStats);
      api.applyAction(game, current, action);
      decisions += 1;
      guard += 1;
    }
    if (guard >= 900) cappedHands += 1;

    game.players.forEach(function (player, idx) {
      const delta = player.stack - startingStack;
      const policy = policyLabelForSeat(game, idx, villain);
      totals[idx] += delta;
      if (!policyStats[policy]) policyStats[policy] = { policy, chips: 0, seats: 0, vpip: 0, pfr: 0 };
      policyStats[policy].chips += delta;
      policyStats[policy].seats += 1;
      if (player.hand.vpip) {
        vpip[idx] += 1;
        policyStats[policy].vpip += 1;
      }
      if (player.hand.pfr) {
        pfr[idx] += 1;
        policyStats[policy].pfr += 1;
      }
    });
  }

  const elapsedMs = performance.now() - started;
  const rotatingPolicySeats = rotateLineup && uniqueItems(lineup).length > 1;
  const seatPolicies = lineup.map(function (policy, idx) {
    if (villain === 'jammer' && idx === 1) return 'jammer';
    if (villain === 'all-jammer' && idx !== 0) return 'all-jammer';
    return rotatingPolicySeats ? 'rotating' : policy || 'current';
  });
  return {
    players,
    hands,
    samples,
    rules,
    villain,
    lineup,
    rotateLineup,
    bigBlind,
    decisions,
    cappedHands,
    elapsedMs,
    msPerDecision: elapsedMs / Math.max(1, decisions),
    actionCounts,
    streetActions,
    frequency: makeFrequencySummary(freqStats),
    seats: totals.map(function (chips, idx) {
      return {
        seat: idx,
        policy: seatPolicies[idx],
        chips,
        bb100: chips / Math.max(1, bigBlind) / hands * 100,
        vpip: vpip[idx] / hands,
        pfr: pfr[idx] / hands,
      };
    }),
    policies: Object.keys(policyStats).sort().map(function (policy) {
      const stat = policyStats[policy];
      return {
        policy,
        chips: stat.chips,
        seatHands: stat.seats,
        bb100: stat.chips / Math.max(1, bigBlind) / Math.max(1, stat.seats) * 100,
        vpip: stat.vpip / Math.max(1, stat.seats),
        pfr: stat.pfr / Math.max(1, stat.seats),
      };
    }),
  };
}

function uniqueItems(items) {
  return Array.from(new Set(items));
}

function rotateLineupForHand(lineup, hand) {
  if (lineup.length <= 1) return lineup;
  const offset = hand % lineup.length;
  return lineup.map(function (_, idx) { return lineup[(idx + offset) % lineup.length]; });
}

function expandLineup(lineupArg, players) {
  const names = String(lineupArg || 'current').split(',').map(function (name) { return name.trim(); }).filter(Boolean);
  const base = names.length > 0 ? names : ['current'];
  return Array.from({ length: players }, function (_, idx) { return base[idx % base.length]; });
}

function assignLineup(game, lineup, villain) {
  game.players.forEach(function (player, idx) {
    player.policyName = lineup[idx] || 'current';
    if (villain === 'jammer' && idx === 1) player.policyName = 'jammer';
    if (villain === 'all-jammer' && idx !== 0) player.policyName = 'all-jammer';
  });
}

function policyLabelForSeat(game, idx, villain) {
  if (villain === 'jammer' && idx === 1) return 'jammer';
  if (villain === 'all-jammer' && idx !== 0) return 'all-jammer';
  return game.players[idx].policyName || 'current';
}

function chooseBenchAction(api, game, current, samples, villain) {
  if ((villain === 'jammer' && current === 1) || (villain === 'all-jammer' && current !== 0)) return chooseJammerAction(api, game, current);
  const analysis = api.FrequencyPolicy.decide(game, current, samples);
  return api.chooseMixedAction(analysis);
}

function chooseJammerAction(api, game, current) {
  const actions = api.legalActions(game, current);
  if (actions.length === 0) return null;
  const aggressive = actions.filter(function (action) { return action.type === 'bet' || action.type === 'raise'; });
  if (game.street === 'preflop' && aggressive.length > 0) {
    const player = game.players[current];
    const maxBet = Math.max.apply(null, game.players.map(function (p) { return p.bet; }));
    return { type: maxBet > player.bet ? 'raise' : 'bet', label: 'Jam', target: player.bet + player.stack, sizeKey: 'jam', potFraction: null };
  }
  const call = actions.find(function (action) { return action.type === 'call'; });
  const check = actions.find(function (action) { return action.type === 'check'; });
  const fold = actions.find(function (action) { return action.type === 'fold'; });
  return call || check || fold || actions[0];
}

function recordFrequencySpot(game, current, action, stats) {
  if (game.street !== 'flop' || maxCurrentBet(game) > 0) return;
  const preflopAggressor = lastAggressorOnStreet(game, 'preflop');
  if (preflopAggressor == null || game.players[preflopAggressor].folded) return;
  const aggressive = action.type === 'bet' || action.type === 'raise';
  if (current === preflopAggressor) {
    const inPosition = hasPostflopPosition(game, current);
    stats.cbetOpp += 1;
    if (aggressive) stats.cbet += 1;
    if (inPosition) {
      stats.ipCbetOpp += 1;
      if (aggressive) stats.ipCbet += 1;
    } else {
      stats.oopCbetOpp += 1;
      if (aggressive) stats.oopCbet += 1;
    }
  } else if (!hasPlayerActedOnStreet(game, preflopAggressor, game.street)) {
    stats.donkOpp += 1;
    if (aggressive) stats.donk += 1;
  } else {
    stats.stabOpp += 1;
    if (aggressive) stats.stab += 1;
  }
}

function makeFrequencySummary(stats) {
  return {
    cbet: stats.cbet,
    cbetOpp: stats.cbetOpp,
    cbetRate: stats.cbet / Math.max(1, stats.cbetOpp),
    ipCbet: stats.ipCbet,
    ipCbetOpp: stats.ipCbetOpp,
    ipCbetRate: stats.ipCbet / Math.max(1, stats.ipCbetOpp),
    oopCbet: stats.oopCbet,
    oopCbetOpp: stats.oopCbetOpp,
    oopCbetRate: stats.oopCbet / Math.max(1, stats.oopCbetOpp),
    donk: stats.donk,
    donkOpp: stats.donkOpp,
    donkRate: stats.donk / Math.max(1, stats.donkOpp),
    stab: stats.stab,
    stabOpp: stats.stabOpp,
    stabRate: stats.stab / Math.max(1, stats.stabOpp),
  };
}

function hasPostflopPosition(game, playerIndex) {
  const order = [];
  let start = nextSeat(game, game.dealer);
  if (start == null) return false;
  order.push(start);
  while (order.length < game.players.length) order.push((order[order.length - 1] + 1) % game.players.length);
  const live = order.filter(function (idx) { return !game.players[idx].folded && !game.players[idx].allIn; });
  return live.length > 0 && live[live.length - 1] === playerIndex;
}

function nextSeat(game, from) {
  const n = game.players.length;
  if (n === 0) return null;
  return (from + 1 + n) % n;
}

function maxCurrentBet(game) {
  return Math.max.apply(null, game.players.map(function (player) { return player.bet; }));
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

function runTeacher(api, samples) {
  const result = api.evaluateTeacherRows(api.DEFAULT_TEACHER_ROWS, samples);
  return { spots: result.rows.length, top1: result.top1, avgKl: result.avgKl, rows: result.rows };
}

function formatFrequencyLine(frequency) {
  return 'freq=' +
    'cbet ' + formatPct(frequency.cbetRate) + ' (' + frequency.cbet + '/' + frequency.cbetOpp + ')' +
    ', ip ' + formatPct(frequency.ipCbetRate) + ' (' + frequency.ipCbet + '/' + frequency.ipCbetOpp + ')' +
    ', oop ' + formatPct(frequency.oopCbetRate) + ' (' + frequency.oopCbet + '/' + frequency.oopCbetOpp + ')' +
    ', donk ' + formatPct(frequency.donkRate) + ' (' + frequency.donk + '/' + frequency.donkOpp + ')' +
    ', stab ' + formatPct(frequency.stabRate) + ' (' + frequency.stab + '/' + frequency.stabOpp + ')';
}

function formatPct(value) {
  return Math.round(value * 1000) / 10 + '%';
}

function printText(results, teacher) {
  results.forEach(function (result) {
    console.log(`players=${result.players} villain=${result.villain} lineup=${result.lineup.join(',')} rotate=${result.rotateLineup} hands=${result.hands} decisions=${result.decisions} ms/decision=${result.msPerDecision.toFixed(2)} capped=${result.cappedHands}`);
    console.log(`actions=${JSON.stringify(result.actionCounts)}`);
    console.log(formatFrequencyLine(result.frequency));
    result.seats.forEach(function (seat) {
      console.log(`  seat ${seat.seat} [${seat.policy}]: ${seat.bb100.toFixed(1)} bb/100, vpip=${formatPct(seat.vpip)}, pfr=${formatPct(seat.pfr)}`);
    });
    result.policies.forEach(function (policy) {
      console.log(`  policy ${policy.policy}: ${policy.bb100.toFixed(1)} bb/100, vpip=${formatPct(policy.vpip)}, pfr=${formatPct(policy.pfr)}`);
    });
  });
  console.log(`teacher: spots=${teacher.spots} top1=${formatPct(teacher.top1)} avgKL=${teacher.avgKl.toFixed(3)}`);
}

function runSeed(args, seed) {
  const api = loadApi(seed);
  const rules = makeRules(args);
  const specs = lineupSpecs(args);
  const results = [];
  specs.forEach(function (spec) {
    args.players.forEach(function (players) {
      const result = runSelfplay(api, players, args.hands, args.samples, rules, args.villain, spec.lineup, args.rotateLineup);
      result.seed = seed;
      result.matchup = spec.name;
      results.push(result);
    });
  });
  const teacher = runTeacher(api, args.samples);
  return { seed, rules, results, teacher };
}

function lineupSpecs(args) {
  const leagueNames = String(args.league || '').split(',').map(function (name) { return name.trim(); }).filter(Boolean);
  if (leagueNames.length <= 1) return [{ name: 'lineup', lineup: args.lineup }];
  const specs = [];
  for (let i = 0; i < leagueNames.length; i += 1) {
    for (let j = i + 1; j < leagueNames.length; j += 1) {
      specs.push({ name: leagueNames[i] + '_vs_' + leagueNames[j], lineup: leagueNames[i] + ',' + leagueNames[j] });
    }
  }
  return specs;
}

function aggregateRuns(seedRuns) {
  const groups = new Map();
  seedRuns.forEach(function (run) {
    run.results.forEach(function (result) {
      const key = [result.players, result.villain, result.matchup || 'lineup', result.lineup.join(','), result.rotateLineup].join('|');
      if (!groups.has(key)) groups.set(key, makeAggregateGroup(result));
      addResultToAggregate(groups.get(key), result);
    });
  });
  return Array.from(groups.values()).map(finalizeAggregateGroup);
}

function makeAggregateGroup(result) {
  return {
    players: result.players,
    villain: result.villain,
    matchup: result.matchup || 'lineup',
    lineup: result.lineup,
    rotateLineup: result.rotateLineup,
    runs: 0,
    hands: 0,
    decisions: 0,
    cappedHands: 0,
    elapsedMs: 0,
    bigBlind: result.bigBlind,
    frequency: zeroFrequencyCounts(),
    policies: {},
  };
}

function addResultToAggregate(group, result) {
  group.runs += 1;
  group.hands += result.hands;
  group.decisions += result.decisions;
  group.cappedHands += result.cappedHands;
  group.elapsedMs += result.elapsedMs;
  addFrequencyCounts(group.frequency, result.frequency);
  result.policies.forEach(function (policy) {
    if (!group.policies[policy.policy]) group.policies[policy.policy] = { policy: policy.policy, chips: 0, seatHands: 0, vpip: 0, pfr: 0, bb100s: [] };
    const target = group.policies[policy.policy];
    target.chips += policy.chips;
    target.seatHands += policy.seatHands;
    target.vpip += policy.vpip * policy.seatHands;
    target.pfr += policy.pfr * policy.seatHands;
    target.bb100s.push(policy.bb100);
  });
}

function finalizeAggregateGroup(group) {
  const frequency = makeFrequencySummary(group.frequency);
  return Object.assign({}, group, {
    msPerDecision: group.elapsedMs / Math.max(1, group.decisions),
    frequency,
    policies: Object.keys(group.policies).sort().map(function (policy) {
      const stat = group.policies[policy];
      return {
        policy,
        chips: stat.chips,
        seatHands: stat.seatHands,
        bb100: stat.chips / Math.max(1, group.bigBlind) / Math.max(1, stat.seatHands) * 100,
        meanBb100: mean(stat.bb100s),
        stderrBb100: stderr(stat.bb100s),
        vpip: stat.vpip / Math.max(1, stat.seatHands),
        pfr: stat.pfr / Math.max(1, stat.seatHands),
        runs: stat.bb100s.length,
      };
    }),
  });
}

function zeroFrequencyCounts() {
  return { cbet: 0, cbetOpp: 0, ipCbet: 0, ipCbetOpp: 0, oopCbet: 0, oopCbetOpp: 0, donk: 0, donkOpp: 0, stab: 0, stabOpp: 0 };
}

function addFrequencyCounts(target, source) {
  Object.keys(target).forEach(function (key) { target[key] += source[key] || 0; });
}

function mean(values) {
  if (values.length === 0) return 0;
  return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
}

function stderr(values) {
  if (values.length <= 1) return 0;
  const avg = mean(values);
  const variance = values.reduce(function (sum, value) { return sum + Math.pow(value - avg, 2); }, 0) / (values.length - 1);
  return Math.sqrt(variance / values.length);
}

function aggregateTeachers(seedRuns) {
  const teachers = seedRuns.map(function (run) { return run.teacher; });
  return {
    spots: teachers[0] ? teachers[0].spots : 0,
    runs: teachers.length,
    top1: mean(teachers.map(function (teacher) { return teacher.top1; })),
    avgKl: mean(teachers.map(function (teacher) { return teacher.avgKl; })),
  };
}

function printAggregate(groups, teacher) {
  groups.forEach(function (group) {
    console.log(`aggregate players=${group.players} villain=${group.villain} matchup=${group.matchup} lineup=${group.lineup.join(',')} rotate=${group.rotateLineup} seeds=${group.runs} hands=${group.hands} ms/decision=${group.msPerDecision.toFixed(2)} capped=${group.cappedHands}`);
    console.log(formatFrequencyLine(group.frequency));
    group.policies.forEach(function (policy) {
      console.log(`  policy ${policy.policy}: ${policy.bb100.toFixed(1)} bb/100, seedMean=${policy.meanBb100.toFixed(1)} +/- ${policy.stderrBb100.toFixed(1)}, vpip=${formatPct(policy.vpip)}, pfr=${formatPct(policy.pfr)}`);
    });
  });
  const league = summarizeLeague(groups);
  league.forEach(function (leagueGroup) {
    console.log(`league players=${leagueGroup.players} villain=${leagueGroup.villain}:`);
    leagueGroup.policies.forEach(function (policy) {
      console.log(`  ${policy.policy}: ${policy.bb100.toFixed(1)} bb/100 over ${policy.matchups} matchups`);
    });
  });
  console.log(`teacher: spots=${teacher.spots} seeds=${teacher.runs} top1=${formatPct(teacher.top1)} avgKL=${teacher.avgKl.toFixed(3)}`);
}

function summarizeLeague(groups) {
  const tables = {};
  groups.forEach(function (group) {
    if (group.matchup === 'lineup') return;
    const key = group.players + '|' + group.villain;
    if (!tables[key]) tables[key] = { players: group.players, villain: group.villain, policies: {} };
    group.policies.forEach(function (policy) {
      const policies = tables[key].policies;
      if (!policies[policy.policy]) policies[policy.policy] = { policy: policy.policy, bigBlinds: 0, seatHands: 0, matchups: 0 };
      policies[policy.policy].bigBlinds += policy.chips / Math.max(1, group.bigBlind);
      policies[policy.policy].seatHands += policy.seatHands;
      policies[policy.policy].matchups += 1;
    });
  });
  return Object.keys(tables).sort().map(function (key) {
    const table = tables[key];
    return {
      players: table.players,
      villain: table.villain,
      policies: Object.keys(table.policies).map(function (name) {
        const policy = table.policies[name];
        return {
          policy: name,
          bb100: policy.bigBlinds / Math.max(1, policy.seatHands) * 100,
          matchups: policy.matchups,
        };
      }).sort(function (a, b) { return b.bb100 - a.bb100; }),
    };
  });
}

function main() {
  const args = parseArgs(process.argv);
  const seedRuns = args.seedList.map(function (seed) { return runSeed(args, seed); });
  const rules = makeRules(args);
  const aggregate = aggregateRuns(seedRuns);
  const teacherAggregate = aggregateTeachers(seedRuns);
  const league = summarizeLeague(aggregate);
  const payload = { seeds: args.seedList, rules, villain: args.villain, lineup: args.lineup, league: args.league, rotateLineup: args.rotateLineup, runs: seedRuns, aggregate, leagueTable: league, teacher: teacherAggregate };
  if (args.json) console.log(JSON.stringify(payload, null, 2));
  else if (seedRuns.length === 1 && !args.league) printText(seedRuns[0].results, seedRuns[0].teacher);
  else printAggregate(aggregate, teacherAggregate);
}

main();
