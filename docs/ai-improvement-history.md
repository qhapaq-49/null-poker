# AI Improvement History

This file is the human-readable companion to `ai-improvement-history.json`. The JSON is intended for plotting later. Treat all bb/100 numbers as noisy development measurements, not as absolute poker strength.

| Date | Commit | Change | Adopted? | Main measured effect | What seemed to matter |
| --- | --- | --- | --- | --- | --- |
| 2026-05-29 | 911f7b7 | Combo-quality continuation pressure | yes | +100.3 / +28.3 / +4.3 bb/100 vs combo-off at 2p/6p/9p short selfplay | Weak pair vs street reraise stopped over-continuing; J8s turn 3bet spot moved from ~0.3% fold to ~63% fold. |
| 2026-05-29 | 8c28ce2 | Hand-quality pot-control tuning | yes | About +2.6 bb/100 in 6max short selfplay, neutral HU, no jammer regression | Medium made hands got a pot-control brake; broad range-read variants were rejected because selfplay was unstable. |
| 2026-05-29 | b0399ba | Heads-up draw-quality semi-bluff tuning | yes | +38.8 / +20.4 / +4.2 bb/100 vs previous current at 2p/6p/9p short selfplay | Strong NFD/combo draws became natural HU semi-bluffs; global draw aggression was rejected because it over-bluffed multiway. |
| 2026-05-29 | 849c91a | Global multiway c-bet discipline | yes | 6max candidate was +5.6 bb/100 vs previous current; global 9max sanity check was +6.2 bb/100 vs sixMax-only current | Weak multiway c-bets now use a field-count brake globally; RFI/HU table-size candidates stayed rejected because their 2p/6p/9p pattern was incoherent. |

## Notes

- Record future runs with `./bench.js --json` and append the aggregate metrics to `ai-improvement-history.json`.
- Prefer comparing one hypothesis at a time: candidate policy vs `current`, mirrored lineup, multiple seeds, then spot diagnostics for the target leak.
- Good graph axes later: date/commit, players, deltaBb100, top1 teacher accuracy, avgKL, VPIP, PFR, c-bet, donk, stab, and explicit spot frequencies.
