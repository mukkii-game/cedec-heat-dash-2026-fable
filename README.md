# めざせCEDEC 〜HEAT DASH 2026〜

2026年7月22日〜24日、酷暑のみなとみらい。ゲームクリエイター「ミナト」が、
みなとみらい駅からパシフィコ横浜のCEDEC会場まで3日間走り抜ける、
レトロドット絵の熱走ランアクション。

**[プレイする（GitHub Pages）](#公開)** ／ ローカル起動は下記参照。

## 遊び方

- **移動**: ↑↓ / W・S（アナログに前後移動。奥は日陰が多く安全、手前は日向で速いが熱い）
- **加速 / 減速**: → / D でダッシュ（速いがヒートが上がる）、← / A でブレーキ（遅いが涼しい）
- **ジャンプ**: Space / Z / X / Enter / マウス左クリック（速度が乗っているほど遠くへ跳べる。ただし踏切りで少し減速）
- **ポーズ**: Esc / P　**ミュート**: M　**リトライ**: R（プレイ中いつでも即リスタート）

スマホは左半分のドラッグで移動＋加減速、右半分タップでジャンプ。
縦持ちでは画面下部に専用のタッチパッド（↑↓ / DASH・SLOW / JUMP）が出ます。

体を焼く**ヒートゲージ**が0〜100の間で上下し、主人公の体も足元から徐々に赤く染まっていきます。
日向やダッシュで上昇し、日陰・ミスト・ドリンク・コンビニ「スズシヤ」で下降。
時間制限はなく、ヒートゲージが100%（熱中症）になることだけが唯一の敗因です。
クリアタイムに応じて★1〜3で評価されるので、3日間・約2〜3分でゴールを目指してください。

## ローカルで起動する

```bash
npm install
npm run dev
```

`http://localhost:5173` を開いてください。

### ビルド

```bash
npm run build
npm run preview
```

### テスト（Playwright）

```bash
npx playwright install chromium
npm test
```

## 公開

GitHub Pages 用のワークフロー（`.github/workflows/deploy.yml`）を同梱しています。
リポジトリの Settings → Pages → Source を「GitHub Actions」に設定し、
`main` ブランチへ push すると自動ビルド・デプロイされます。

## 技術構成

- Vite + TypeScript、依存ゼロの自作Canvas 2Dエンジン
- 全グラフィックはコード内で手続き生成したドット絵（480×270内部解像度）
- BGM・効果音はすべて Web Audio API による自作シンセ／ステップシーケンサ
- 日本語表示は [PixelMplus](https://itouhiro.hatenablog.com/entry/20130602/font) フォントを同梱（詳細は [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md)）

詳しい設計意図は [GAME_DESIGN.md](GAME_DESIGN.md)、アート方針は [ART_DIRECTION.md](ART_DIRECTION.md) を参照してください。

## ライセンス・素材について

`reference/` フォルダの参考画像は構図研究専用であり、リポジトリ・配布物には含まれません
（`.gitignore` で除外）。既存作品のキャラクター・ロゴ・音源・固有演出は使用していません。
