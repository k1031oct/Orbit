# DATA_FLOW for Orbit

## システム構造とデータ流転の源泉 (Source of Truth)
Orbit のシステムにおいては、本番環境のローカル SQLite データベースが「データの正解（Source of Truth）」として機能します。

└─ **Orbit Command Center (Local Hub)**
    ├─ `C:\Users\{User}\AppData\Roaming\com.k1031oct.orbit\orbit.db`  **(Source of Truth)**
    │   ├─ `projects` (管理下の開発ノード一覧)
    │   └─ `local_requirements` (タスク/要件定義のローカル管理キャッシュ)
    │
    ├─ **Remote Sync Node** (Optional)
    │   └─ Google Apps Script (GAS) Endpoint
    │      └─ `sync_requirements` により要件を `orbit.db` へプル
    │
    └─ **Orchestrator Backend (Tauri / Rust)**
        └─ **MCP Endpoint (`/api/mcp/route.ts`)**
            └─ 各エージェントはこのエンドポイントを経由して Orbit 上の世界（DBや各種ツール）とやり取りする。

## ノード（エージェント）の行動境界と権限
- エージェントは **MCP ツール (e.g., `write_governed_file`, `build_node`, `deploy_node`) を通じてのみ** ノードへの物理的な操作を行うこと。
- `write_governed_file` は、XMLの禁止等の「規約（Governance）」を物理的に強制する。
- 実行エラーのテレメトリは `orbit.db` の `decision_logs` に記録され、エージェントは `get_mission_telemetry` で自律的な修復判断に利用する。
