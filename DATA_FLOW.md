# DATA_FLOW for Orbit

## システム構造とデータ流転の源泉 (Source of Truth)
Orbit のシステムにおいては、本番環境のローカル SQLite データベースが「データの正解（Source of Truth）」として機能します。

└─ **Orbit Command Center (Local Hub)**
    ├─ `C:\Users\{User}\AppData\Roaming\com.k1031oct.orbit\orbit.db`  **(Source of Truth)**
    │   ├─ `projects` (管理下の開発ノード一覧)
    │   ├─ `local_requirements` (タスク/要件定義: 別名 Objectives)
    │   ├─ `decision_logs` (エージェント의 判断理由とテレメトリ)
    │   └─ `knowledge_base` (成功例・推論・Embedding を含む経験値テーブル) **[NEW]**
    │
    ├─ **Remote Sync Node** (Optional)
    │   └─ Google Apps Script (GAS) Endpoint
    │      └─ `syncCompletionStatus` により要件を GAS へ報告
    │
    └─ **Orchestrator Backend (Tauri / Next.js)**
        └─ **MCP Endpoint (`/api/mcp/route.ts`)**
            └─ 各エージェントはこのエンドポイントを経由して操作を行う。
               ├─ `write_governed_file`: 規約（命名、XML禁止）を物理的に強制。
               ├─ `build_node`: Gradle ビルドログをパースして構造化エラーを返却。
               ├─ `deploy_node`: UI XML をダンプし、初期画面の物理監査を行う。
               └─ `search_knowledge`: 3段階フィルタリング検索エンジンを呼び出し。 **[NEW]**

## フェーズ別データフロー

### Phase 1: Android 制御 (Physical Control)
- **Goal**: ビルドログの詳細解析と UI 構造のダンプ。
- **Flow**: `AndroidExecutor` -> `adb shell uiautomator dump` -> XML String (Minified) -> Agent.

### Phase 2: ガバナンス・フック (Physical Constraints)
- **Goal**: エージェントが規約を「忘れる」ことを許さない物理的なガードレール。
- **Flow**: `write_governed_file` -> `GovernanceManager.validateContent` -> Block if invalid.

### Phase 3: 自律検収と GAS 同期 (Persistence & Multi-Agent)
- **Goal**: 完成度の自律的な検証と、コスト抑制のための GAS 連携。
- **Flow**: `LogRepository` -> `decision_logs` (Reasoning stored) -> `sync_requirements` (GAS Sync).

### Phase 4: 自己進化型ナレッジ・エンジン (Experience Loop) **[NEW]**
- **Goal**: 成功体験の構造化と、高速キーワード検索による再利用.
- **Flow**: `Task Completion` -> `KnowledgeRepository.add` (Auto-Tagging) -> `knowledge_base`.
- **Search Flow**: `Query` -> `SearchEngine` (SQL -> Keyword Matching -> Ranking) -> Best 3 Examples -> Agent Prompt.

### Phase 5: Breakthrough Mode (Constraint Bypass) **[NEW]**
- **Goal**: 既存の知識で解決不能な場合の制約解除.
- **Flow**: `Consecutive Build Failures` (n > 3) -> `BreakthroughManager` -> Enable Breakthrough Mode -> Bypass Knowledge Constraints -> Pure Reasoning.
