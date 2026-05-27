# Table Holdem Lab

GitHub Pagesでそのまま配信できる、テキサスホールデムの静的Webゲームです。UIは2-9人、内部エンジンはデッキ制約上の最大人数まで配列ベースで扱う設計にしています。

## 現在の方針

完全な任意人数GTOをブラウザ上でその場計算するのは目標にしていません。ここでは、手に入る教師データと軽量な近似でどこまで遊べる強さに寄せられるかを重視しています。

- ゲーム進行は任意人数対応のステートマシンに分離。
- 役判定は全5枚組み合わせを評価して正確に比較。
- AIは `FrequencyPolicy` で、MDF、pot odds、value/bluff比、ポジション、残り人数、ドロー、ブロッカー、簡易レンジ圧、局面別の目標bet/raise頻度を混ぜる。
- ベット額は連続探索せず、preflopはbb倍率、postflopはpot比率のバケットに量子化して評価する。
- Equityはブラウザで回る範囲のMonte Carloサンプリング。人数が増えるほどサンプル数を落として応答時間を保つ。
- `AI推奨` オプションで、現在局面の推奨手、近似EV、混合頻度、MDF、equityを表示。
- `Teacher` ベンチはJSONで与えたGTO系ラベルに対してtop-1一致率とKLを出す。現状の同梱ラベルは動作確認用の小さなサンプルで、実戦的な教師ではない。
- `Selfplay` ベンチは同じ頻度戦略のスタイル差分同士を短く回し、進行バグと速度を見るための簡易ベンチ。
- Cash/Tournament、blinds、stack BB、ante、blind level intervalをUIから変更できる。

## 自己対局ベンチ

CLIでも再現可能な自己対局を回せます。seedを固定して、人数・ルール・サンプル数を変えた改善比較に使います。

```sh
./bench.js --hands 200 --samples 18 --players 2,6,9 --seed 42
./bench.js --hands 200 --samples 18 --players 6 --mode tournament --ante 0.125 --level-hands 10 --seed 42
./bench.js --hands 200 --samples 18 --players 6 --json > bench-result.json
```

出力はseat別のbb/100、VPIP、PFR、action count、flop c-bet/donk頻度、ms/decision、教師ラベルへのtop-1/KLです。短いhand数のbb/100は分散が大きいので、改善比較では同じseedと十分なhand数で比較します。

## 教師JSON形式

`Bench` の textarea に次のような配列を入れて `Teacher` を押します。

```json
[
  {
    "id": "6max BTN AKs open",
    "players": 6,
    "street": "preflop",
    "position": "BTN",
    "hole": "AsKs",
    "board": "",
    "pot": 3,
    "heroBet": 0,
    "toCall": 2,
    "teacher": { "raise": 0.98, "call": 0.02, "fold": 0 }
  }
]
```

`teacher` は `fold`, `check`, `call`, `bet`, `raise` の確率分布を想定しています。postflopのinitiativeを測る場合は preflopAggressor に席番号、必要なら history に { street: "flop", player: 1, type: "check" } のような事前アクションを入れます。ヘッズアップ化したいスポットは active: [0, 1] で残存プレイヤーを固定できます。手に入るpreflop表、solverから切り出したpostflopスポット、公開データセットをこの形式に寄せれば同じ評価器で比較できます。

## 参照した方向性

- DeepStack: https://arxiv.org/abs/1701.01724
- Libratus: https://www.ijcai.org/Proceedings/2017/772
- Monte Carlo CFR: https://proceedings.neurips.cc/paper/2009/hash/00411460f7c92d2124a67ea0f4cb5f85-Abstract.html
- Deep CFR: https://proceedings.mlr.press/v97/brown19b.html
- DecisionHoldem: https://arxiv.org/abs/2201.11580
- b-inary/postflop-solver: https://github.com/b-inary/postflop-solver
- GTO Wizard Benchmark: https://arxiv.org/abs/2603.23660

## 実行

静的ファイルだけなので、GitHub Pagesではリポジトリrootを公開対象にすれば `index.html` が表示されます。ローカルでサーバを使う場合は任意の静的サーバで開けます。

```sh
python3 -m http.server 8000
```
