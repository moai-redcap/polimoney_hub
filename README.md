# Polimoney Hub

Polimoney エコシステムの中核となるデータハブサービス。政治家・政治団体・選挙の共通識別子を管理し、Polimoney Ledger と Polimoney (可視化サービス) 間のデータ連携を仲介します。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                    Polimoney Hub                             │
│                    (このサービス)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Ledger        │ │ Azure DB      │ │ Polimoney     │
│ (Supabase)    │ │ (PostgreSQL)  │ │ (可視化)      │
└───────────────┘ └───────────────┘ └───────────────┘
```

## 技術スタック

- **ランタイム:** Deno
- **フレームワーク:** Hono
- **データベース:** Azure PostgreSQL
- **ホスティング:** Deno Deploy (予定)

## セットアップ

### 1. 依存関係のインストール

Deno は依存関係を自動的にインストールします。

### 2. 環境変数の設定

```bash
cp env-example.txt .env
```

`.env` を編集して環境変数を設定してください。

### 3. データベースのセットアップ

Azure PostgreSQL に接続し、スキーマを実行:

```bash
psql $DATABASE_URL -f db/schema.sql
```

### 4. 開発サーバーの起動

```bash
deno task dev
```

## API エンドポイント

### ヘルスチェック

| メソッド | パス | 認証 | 説明 |
|----------|------|------|------|
| GET | `/` | 不要 | サービス情報 |
| GET | `/health` | 不要 | ヘルスチェック |

### 政治家 API

| メソッド | パス | 認証 | 説明 |
|----------|------|------|------|
| GET | `/api/v1/politicians` | 必要 | 政治家一覧 |
| GET | `/api/v1/politicians/:id` | 必要 | 政治家詳細 |
| POST | `/api/v1/politicians` | 必要 | 政治家 ID 発行 |
| PUT | `/api/v1/politicians/:id` | 必要 | 政治家更新 |

### 政治団体 API

| メソッド | パス | 認証 | 説明 |
|----------|------|------|------|
| GET | `/api/v1/organizations` | 必要 | 政治団体一覧 |
| GET | `/api/v1/organizations/:id` | 必要 | 政治団体詳細 |
| POST | `/api/v1/organizations` | 必要 | 政治団体 ID 発行 |
| PUT | `/api/v1/organizations/:id` | 必要 | 政治団体更新 |

### 選挙 API

| メソッド | パス | 認証 | 説明 |
|----------|------|------|------|
| GET | `/api/v1/elections` | 必要 | 選挙一覧 |
| GET | `/api/v1/elections/:id` | 必要 | 選挙詳細 |
| POST | `/api/v1/elections` | 必要 | 選挙 ID 発行 |
| PUT | `/api/v1/elections/:id` | 必要 | 選挙更新 |

## 認証

API Key 認証を使用します。

```bash
curl -H "X-API-Key: your-api-key" \
     -H "X-Service-Name: polimoney-ledger" \
     http://localhost:8000/api/v1/politicians
```

## 選挙 ID の形式

```
{type}-{area_code}-{date}
```

| 要素 | 説明 | 例 |
|------|------|-----|
| type | 選挙タイプ | HR, HC, PG, CM, GM |
| area_code | 選挙区コード | 13-01 (東京1区) |
| date | 投票日 | 20241027 |

### 選挙タイプ

| コード | 説明 |
|--------|------|
| HR | 衆議院議員選挙 (House of Representatives) |
| HC | 参議院議員選挙 (House of Councillors) |
| PG | 都道府県知事選挙 (Prefectural Governor) |
| CM | 市区町村長選挙 (City/Town/Village Mayor) |
| GM | 議会議員選挙 (General/Municipal Assembly) |

### 特殊な選挙区

| 選挙区コード | 説明 |
|--------------|------|
| 31-32 | 鳥取・島根合同選挙区 (参院) |
| 36-39 | 徳島・高知合同選挙区 (参院) |
| 00-00 | 比例代表 (全国) |

## ライセンス

AGPL-3.0

