# Polimoney Hub

Polimoney エコシステムの中核となるデータハブサービス。  
政治家・政治団体・選挙の**共通識別子**を管理し、Polimoney Ledger と Polimoney (可視化サービス) 間のデータ連携を仲介します。

## アーキテクチャ

```
                    ┌─────────────────┐
                    │ Polimoney Hub   │ ← このサービス
                    │ (Deno + Hono)   │
                    └────────┬────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Ledger          │ │ Azure DB        │ │ Polimoney       │
│ (Supabase)      │ │ (PostgreSQL)    │ │ (可視化)        │
│ 仕訳データ      │ │ 共通識別子      │ │ データ表示      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

詳細: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## 技術スタック

| 項目           | 技術             |
| -------------- | ---------------- |
| ランタイム     | Deno             |
| フレームワーク | Hono             |
| データベース   | Azure PostgreSQL |
| ホスティング   | Deno Deploy      |

## クイックスタート

```bash
# 1. 環境変数を設定
cp env-example.txt .env
# .env を編集

# 2. DB スキーマを適用
psql $DATABASE_URL -f db/schema.sql

# 3. 開発サーバー起動
deno task dev
```

## API 概要

| エンドポイント          | 説明           |
| ----------------------- | -------------- |
| `GET /health`           | ヘルスチェック |
| `/api/v1/politicians`   | 政治家 CRUD    |
| `/api/v1/organizations` | 政治団体 CRUD  |
| `/api/v1/elections`     | 選挙 CRUD      |

詳細: [docs/API.md](docs/API.md)

## 認証

API Key 認証を使用します。

```bash
curl -H "X-API-Key: your-api-key" \
     -H "X-Service-Name: polimoney-ledger" \
     http://localhost:8000/api/v1/politicians
```

## ドキュメント

| ドキュメント                                 | 内容               |
| -------------------------------------------- | ------------------ |
| [docs/API.md](docs/API.md)                   | API 詳細仕様       |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | アーキテクチャ設計 |

## 関連リポジトリ

| リポジトリ                                                          | 説明                   |
| ------------------------------------------------------------------- | ---------------------- |
| [polimoney_ledger](https://github.com/moai-redcap/polimoney_ledger) | 政治資金収支管理アプリ |
| [polimoney](https://github.com/digitaldemocracy2030/polimoney)      | 政治資金可視化サービス |

## ライセンス

AGPL-3.0
