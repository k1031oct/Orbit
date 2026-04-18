# Orbit Command Center: Linear Edition (v2) DESIGN.md

Orbit の UI/UX 設計に関する「唯一の正典 (Source of Truth)」であり、人間および AI エージェント（Antigravity 等）がデザインの一貫性を保つためのガイドラインです。

## 1. Design Philosophy
- **Stealth Mode**: 開発を妨げない「沈み込む」UI。ノイズを排除し、テレメトリ（データ）の視認性を最大化する。
- **Engineering Density**: プロフェッショナル向けツールとして、情報の凝縮度（密度）を高く保つ。
- **Precision**: 1px の境界線、厳密なグリッド、洗練されたタイポグラフィによる精密感の演出。

## 2. Global Tokens

### Palette
| Token | Hex | Role |
| :--- | :--- | :--- |
| `orbit-bg` | `#000000` | メイン背景（漆黒） |
| `orbit-sidebar` | `#080808` | ナビゲーション・サイドバー領域 |
| `orbit-border` | `#1f1f1f` | 全てのコンポーネントの境界線 |
| `orbit-accent` | `#5e6ad2` | Indigo：アクティブ、ボタン、アクセント |
| `orbit-success` | `#4ade80` | Emerald：エージェント稼働中、ビルド成功 |
| `orbit-error` | `#f87171` | Rose：ガバナンス違反、エラーログ |
| `orbit-text` | `#eeeeee` | メインテキスト |
| `orbit-muted` | `#888888` | メタデータ、タイムスタンプ、補助情報 |

### Typography
- **Primary**: `Inter` (system-ui) - ウェイト `510` を標準とする。
- **Monospace**: `JetBrains Mono` - ログ、コード、パスの表示。
- **Heading**: `Inter` 600 - 洗練されたイタリック体をタイトルに適用。

### Spacing & Metrics
- **Base Grid**: 4px / 8px
- **Border Radius**: 6px (Standard), 2px (Toolbar/Icon)
- **Border Width**: 1px (Solid)
- **Shadow**: `none` (レイヤーは境界線と透過度で表現する)

## 3. Component Identity

- **Telemetry Cards**: 背景 `#080808`、境界線 `#1f1f1f`、角丸 6px。
- **Action Buttons**: 背景 `#5e6ad2`、テキスト非イタリック。
- **HUD (Header/Footer)**: ブラッシュド・ガラス（`backdrop-blur-md`）、境界線 `#1f1f1f`。

## 4. Agent Prompt Guide (Instruction for AI)
AI が UI を拡張・修正する際は、以下のルールを厳守すること：
> 「Orbit の UI エンジニアとして振る舞い、Vanilla CSS または Tailwind CSS を用いて高密度かつダークなダッシュボードを実装せよ。背景は `#000000`、サイドバーは `#080808`、境界線は `#1f1f1f`、アクセントは `#5e6ad2` を絶対値として使用すること。シャドウは使用せず、境界線と 1px のズレもない精密なアライメントを維持せよ。」
