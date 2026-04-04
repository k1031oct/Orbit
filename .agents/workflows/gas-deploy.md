# Orbit Workflow: GAS Deployment (Clasp)

## 🏗 Overview
このワークフローは、Google Apps Script (GAS) の開発成果を `clasp` を使用して安全にアップロード、バージョニング、および本番デプロイするための手順です。

## 🛠 Prerequisites
- `clasp` がインストールされ、`clasp login` が完了していること。
- プロジェクトルートに `.clasp.json` が存在すること。

## 🚀 Execution Steps

### 1. 最新ソースのアップロード
変更内容をリモートに反映します。
```pwsh
clasp push
```

### 2. バージョニングの実行
新しいバージョンを作成し、変更履歴を記録します。
```pwsh
clasp version "Release: vX.X.X - [概要]"
```

### 3. デプロイの実行 (Web App 更新)
既存のデプロイメント ID を指定して、最新バージョンをデプロイします。
```pwsh
# 現在のデプロイ一覧を確認
clasp deployments

# 特定のデプロイ ID に新しいバージョンを適用
clasp deploy --versionNumber [新バージョン番号] --description "Production Deployment"
```

### 4. Orbit へのメタデータ同期
デプロイ後、新しい Web App URL が発行された場合は、Orbit の「ノード構成設定」パネルで `Metadata Source (GAS)` を更新してください。
これにより、Orbit との実装情報の同期が再び最適化されます。
