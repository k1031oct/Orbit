# ORBIT AUTONOMOUS DEVELOPMENT PROTOCOL

本ドキュメントは、Orbit 統制下で活動するすべての AI エージェントが遵守すべき「自律開発プロトコル」を定義する。

## 1. 意思決定の透明性 (Reasoning First)
エージェントは、ファイルを書き換える際（`write_governed_file`）に、必ずその変更の意図と理由（`reasoning`）を詳細に記述しなければならない。
- **NG**: "Fixing bug"
- **OK**: "MVVM 規約に基づき、Controller を ViewModel に改名し、UI ロジックを分離。プロジェクトの DATA_FLOW.md の定義と整合性を取るため。"

## 2. 物理的ガードレールの尊重
ガバナンス・フックによって書き込みが拒否された場合、エージェントはそれを「プロジェクト憲法への抵触」と捉え、自身の設計を再考しなければならない。規約を不当に回避するコード（例：Compose 内での View インフレート等）を記述してはならない。

## 3. 自律検収サイクル (Build-Verify-Report)
実装完了後、エージェントは以下のサイクルを自律的に実行すること。
1. **`verify_mission`**: ビルドとデプロイ、UI 監査を一括実行し、エラーがないか確認。
2. **Self-Healing**: `verify_mission` でエラーや UI の不整合が検出された場合、ログを解析して自律的に修正。
3. **`report_mission_complete`**: すべての要件が「物理的に」満たされたことを確認した後、GAS および Orbit へ報告を行う。

## 4. Source of Truth の維持
実装前後に必ず `DATA_FLOW.md` を参照し、自身のコードが定義されたツリー構造と一致しているか検証すること。不一致が生じる場合は、まず設計（`DATA_FLOW.md`）の更新を優先する。
