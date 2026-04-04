# Orbit 管制室 開発ワークフロー (v0.5.9)

本ドキュメントは、統合管制室「Orbit」を開発・メンテナンスするための標準設計ルールと運用手順を定義します。

## 🏗️ コア・アーキテクチャ
Orbit は、厳格に分離されたレイヤー構造を採用しています：
1.  **View (React/Next.js)**: `src/app/` - 純粋な UI コンポーネントと状態のレンダリング。
2.  **ViewModel (TS)**: `src/viewmodels/` - ユーザーアクションの処理と UI 状態の管理。
3.  **Repository (JS/TS)**: `src/lib/repositories/` - データ永続化と外部 API の調整。
4.  **Native Backend (Rust)**: `src-tauri/src/` - Tauri Command を通じた OS レベルの操作（ファイルシステム、プロセス）。
5.  **MCP Server**: `src/app/api/mcp/` - AI による遠隔指揮のためのブリッジ。

## 📜 戦術ルール（憲法）
- **DATA_FLOW 同期**: 実装の正解は常に `DATA_FLOW.md` にあること。
- **テレメトリの義務**: 重大な `catch` ブロックでは必ず `LogRepository.add` を呼び出し、AI による自己修復デバッグを可能にすること。
- **クリーン・バインディング**: 直接的な DOM 操作は避け、ViewModel のハンドラと React 状態を用いること。

## 🛠️ ビルドとデプロイ
- **開発時**: `npm run dev` (ポート 3000 で Next.js を起動)。
- **プロダクション・ビルド**: `npm run tauri build` (MSI は `target/release/bundle/msi/` に生成)。
- **権限管理**: 新しいシェル操作やファイル操作を追加する際は、`src-tauri/capabilities/default.json` を更新すること。

## 📡 自己修復と診断
エラー発生時は、以下のループで対応します：
1.  **抽出**: MCP ツール `get_mission_telemetry` を使用。
2.  **解析**: `LogRepository` を通じて `decision_logs` テーブルのログを相関分析。
3.  **遂行**: AI が根本原因を特定 -> 修正を適用 -> `tauri build` を実行。

---
## 🔄 アップデート・サイクル
機能修正や UI 調整などのアップデートが完了した際は、必ず以下の手順を実行して品質を保証すること：
1.  **プロダクション・ビルドの作成**: `npm run tauri build` を実行し、最新のインストーラ（MSI）を生成する。
2.  **アップデートの実施**: 生成された MSI を使用して、実際に環境をアップデートする。
3.  **挙動の確認**: アップデート後の Orbit を起動し、修正した機能や UI が意図通りに動作・表示されているか（特に視認性やコントラストの問題など）を最終確認する。

---
*AntiGravity エージェントが管理。本設計パターンからの逸脱は避けてください。*
