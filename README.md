# Orbit: Autonomous Development Orchestrator

![Orbit Branding Header](public/branding_header.png)

## 🌌 概要 (Overview)

**Orbit** は、自律型AIエージェント（AntiGravity）のための**統合管制室（Command Center）**です。
高度なオーケストレーション機能、厳格なデータ・ガバナンス、そしてリアルタイムのテレメトリ監視を組み合わせ、複雑なソフトウェア開発プロセスをAIが自律的に遂行・管理するためのハブとして機能します。

単純なダッシュボードではなく、開発現場の「現実」とAIの「推論」を高度に同期させる**ポータル・エンジン**を目指しています。

---

## 🚀 主要機能 (Key Features)

### 1. 📂 Local-First Command Center
- すべてのプロジェクトデータと要件定義は、ローカルの SQLite (`orbit.db`) を **Source of Truth** として管理されます。
- 高速なアクセスと、ネットワーク環境に左右されない安定した開発体験を提供します。

### 2. 🤖 MCP (Model Context Protocol) Integration
- 内蔵の MCP エンドポイントにより、AIエージェントは Orbit を通じて物理ファイル、データベース、さらにはシェルコマンドに安全にアクセスできます。

### 3. ⚖️ 開発ガバナンスの物理強制 (Governance Enforcement)
- `write_governed_file` などのツールを通じて、プロジェクト固有の規約（例：特定のファイル形式の禁止、構造の維持）をエンジニアリングレベルで強制します。

### 4. 🛠️ 自律修復ループ (Self-Healing Loop)
- 実行時のエラーやビルドの失敗を `decision_logs` に詳細に記録。
- エージェントはテレメトリを相関分析し、根本原因の特定から修正・再ビルドまでを自律的にループさせることが可能です。

---

## 🏗️ 技術スタック (Technology Stack)

| Layer | Technology |
| :--- | :--- |
| **Framework** | [Tauri v2](https://v2.tauri.app/) (Next.js 15 Integration) |
| **Frontend** | React 19 / TypeScript / Lucide-React |
| **Backend (Native)** | Rust (Tauri Commands) |
| **Database** | SQLite ([sql.js](https://sql.js.org/)) |
| **AI Interface** | Model Context Protocol (MCP) |

### アーキテクチャ
- **View-ViewModel-Repository パターン**を厳守し、UI、ロジック、データアクセスを完全に分離。
- Rust によるネイティブレイヤーを活用し、OSレベルのセキュアな操作を実現。

---

## 🛠️ セットアップ (Getting Started)

### 前提条件
- Node.js (v20以上)
- Rust (最新の stable)
- Windows OS (Tauri v2 サポート環境)

### インストール & 起動
```bash
# 依存関係のインストール
npm install

# 開発モード (Next.js + Tauri) で起動
npm run dev

# Tauri コマンドの単体実行
npm run tauri dev
```

---

## 📜 開発憲法 (Governance)

Orbit プロジェクトにおける変更は、常に `DATA_FLOW.md` の定義に基づかなければなりません。
実装がドキュメントと矛盾する場合、まずドキュメントを更新し、承認を得る必要があります。

- **Telemetry Duty**: 重大な例外処理では必ず `LogRepository` に記録すること。
- **Clean Binding**: 直接的な DOM 操作を避け、ViewModel 経由で状態を管理すること。

---

## 🛰️ リンク
- [開発ワークフロー (ORBIT_DEV_WORKFLOW.md)](ORBIT_DEV_WORKFLOW.md)
- [データフロー定義 (DATA_FLOW.md)](DATA_FLOW.md)

---
*Developed by **AntiGravity** - Empowering Autonomous Development.*
