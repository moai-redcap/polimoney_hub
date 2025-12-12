# Polimoney Hub アーキテクチャ設計

## 概要

Polimoney Hub は、Polimoney エコシステムのデータハブとして、以下の役割を担います：

1. **共通識別子の管理** - 政治家・政治団体・選挙の ID を一元管理
2. **データ連携の仲介** - Ledger と Polimoney 間のデータフローを制御
3. **匿名化処理** - プライバシー設定に基づくデータ変換
4. **キャッシュ** - 高頻度アクセスの最適化

---

## システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Polimoney Hub                                    │
│                         (Deno + Hono)                                    │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐            │
│  │ Politicians    │  │ Organizations  │  │ Elections      │            │
│  │ API            │  │ API            │  │ API            │            │
│  └───────┬────────┘  └───────┬────────┘  └───────┬────────┘            │
│          └───────────────────┼───────────────────┘                      │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     API Key 認証ミドルウェア                      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                     DB クライアント (postgres)                    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │
                               ▼
                   ┌───────────────────────┐
                   │ Azure PostgreSQL      │
                   │ (共通識別子マスタ)    │
                   │ - politicians         │
                   │ - organizations       │
                   │ - elections           │
                   └───────────────────────┘
```

---

## Polimoney エコシステム全体図

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              DD2030 SaaS                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                        Polimoney Hub                              │  │
│  │  - 共通識別子管理 (政治家/政治団体/選挙)                          │  │
│  │  - データ連携・匿名化                                             │  │
│  │  - キャッシュ層                                                   │  │
│  └───────────────────────────┬──────────────────────────────────────┘  │
│                              │                                          │
│          ┌───────────────────┼───────────────────┐                     │
│          │                   │                   │                     │
│          ▼                   ▼                   ▼                     │
│  ┌───────────────┐   ┌───────────────┐   ┌───────────────┐            │
│  │ Polimoney     │   │ Azure DB      │   │ Polimoney     │            │
│  │ Ledger        │   │ (PostgreSQL)  │   │ (可視化)      │            │
│  │               │   │               │   │               │            │
│  │ ┌───────────┐ │   │ ┌───────────┐ │   │ ┌───────────┐ │            │
│  │ │ Supabase  │ │   │ │politicians│ │   │ │ Frontend  │ │            │
│  │ │ - Auth    │ │   │ │orgs       │ │   │ │ - 収支表示│ │            │
│  │ │ - DB      │ │   │ │elections  │ │   │ │ - 比較    │ │            │
│  │ │ - Storage │ │   │ └───────────┘ │   │ │ - 分析    │ │            │
│  │ └───────────┘ │   └───────────────┘   │ └───────────┘ │            │
│  └───────────────┘                       └───────────────┘            │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      将来の消費者                                 │  │
│  │  - 市民向けアプリ                                                 │  │
│  │  - 研究者向け API                                                 │  │
│  │  - メディア向けダッシュボード                                     │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## データフロー

### 1. 新規登録フロー（政治家 ID 発行）

```
ユーザー → Ledger → Hub → Azure DB
                          │
                          └→ 政治家 ID (UUID) を発行・保存
                          │
           ←──────────────┘
           政治家 ID を Ledger に返却
```

### 2. 仕訳データ連携（Realtime）

```
Ledger DB (Supabase)
     │
     │ Supabase Realtime (postgres_changes)
     ▼
Polimoney Hub
     │
     │ 匿名化処理 (is_name_private 等)
     │ キャッシュ更新
     ▼
Polimoney (可視化) / 他の消費者
```

### 3. データ取得フロー

```
Polimoney (可視化)
     │
     │ GET /api/v1/journals (予定)
     ▼
Polimoney Hub
     │
     ├─→ Azure DB: 政治家名・選挙情報を取得
     │
     └─→ Ledger DB (Supabase): 仕訳データを取得
            ※ 直接参照 or API 経由
```

---

## 技術スタック

| レイヤー | 技術 | 理由 |
|----------|------|------|
| ランタイム | Deno | TypeScript ネイティブ、セキュア |
| フレームワーク | Hono | 軽量、Edge 最適化 |
| DB クライアント | deno-postgres | Deno ネイティブ |
| ホスティング | Deno Deploy | グローバルエッジ、コールドスタート高速 |
| DB | Azure PostgreSQL | Polimoney との共有、地理的配置 |
| キャッシュ | Redis (Azure Cache) | 将来追加予定 |

---

## 認証・認可

### サービス間認証

| 通信 | 認証方式 |
|------|----------|
| Ledger → Hub | API Key + IP 制限 |
| Hub → Azure DB | 接続文字列 (SSL 必須) |
| Hub → Ledger DB | API Key または Supabase Service Role Key |
| Polimoney → Hub | API Key + IP 制限 |

### API Key 管理

```
環境変数:
- API_KEY: メイン API キー
- LEDGER_API_KEY: Ledger 専用キー（将来）
- POLIMONEY_API_KEY: Polimoney 専用キー（将来）
```

---

## ディレクトリ構成

```
polimoney_hub/
├── src/
│   ├── index.ts              # エントリポイント
│   ├── routes/
│   │   ├── politicians.ts    # 政治家 API
│   │   ├── organizations.ts  # 政治団体 API
│   │   ├── elections.ts      # 選挙 API
│   │   └── sync.ts           # Realtime 同期（予定）
│   ├── db/
│   │   └── client.ts         # DB 接続
│   ├── middleware/
│   │   └── auth.ts           # 認証
│   └── utils/
│       └── anonymize.ts      # 匿名化ロジック（予定）
├── db/
│   └── schema.sql            # Azure DB スキーマ
├── docs/
│   ├── API.md                # API 仕様
│   └── ARCHITECTURE.md       # 本ドキュメント
├── deno.json
└── README.md
```

---

## 公開データの永続化

### 設計方針

Polimoney がデータを取得する際、毎回 Ledger DB (Supabase) にクエリするのは非効率です。
そのため、Hub (Azure DB) に**公開用データを永続保存**し、Ledger DB への負荷をゼロにします。

### データフロー

```
┌─────────────────┐
│ Ledger DB       │ ← 政治家のみアクセス（プライベート）
│ (Supabase)      │
└────────┬────────┘
         │ Realtime (変更時のみ)
         ▼
┌─────────────────┐
│ Hub             │
│ - 匿名化        │
│ - ハッシュ生成  │
│ - 変更検知      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Azure DB        │ ← 公開データの永続保存
│ - public_ledgers│    Ledger DB への負荷ゼロ
│ - public_journals│
│ - change_logs   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Polimoney       │ ← Hub (Azure DB) からのみ取得
└─────────────────┘
```

---

## 変更履歴と透明性

### 課題

政治家が過去の台帳をこっそり変更しても誰も気づけない → 不健全

### 解決策: ハッシュ + 台帳レベルの変更ログ

1. 仕訳登録時に**ハッシュ**を生成・保存（改ざん検知用）
2. **台帳レベル**で変更ログを保存（仕訳ごとだと多すぎる）
3. Polimoney で「最終更新日時」と「変更履歴」を表示

### スキーマ

```sql
-- 公開用台帳（1年分の収支報告）
CREATE TABLE public_ledgers (
    id UUID PRIMARY KEY,
    politician_id UUID NOT NULL REFERENCES politicians(id),
    election_id VARCHAR(50) REFERENCES elections(id),
    fiscal_year INTEGER NOT NULL,
    total_income INTEGER DEFAULT 0,
    total_expense INTEGER DEFAULT 0,
    journal_count INTEGER DEFAULT 0,
    last_updated_at TIMESTAMPTZ NOT NULL,
    first_synced_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 公開用仕訳
CREATE TABLE public_journals (
    id UUID PRIMARY KEY,
    ledger_id UUID NOT NULL REFERENCES public_ledgers(id),
    date DATE NOT NULL,
    description TEXT,
    amount INTEGER NOT NULL,
    contact_name TEXT,
    contact_type VARCHAR(20),
    content_hash VARCHAR(64) NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL
);

-- 台帳レベルの変更ログ
CREATE TABLE ledger_change_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_id UUID REFERENCES public_ledgers(id),
    changed_at TIMESTAMPTZ NOT NULL,
    change_summary TEXT  -- "仕訳3件を追加", "仕訳を修正" 等
);
```

### Polimoney での表示

```
┌─────────────────────────────────────────────────────────────┐
│ 山田太郎 - 2024年度 収支報告書                              │
│                                                              │
│ 最終更新: 2024/03/01 10:30  📋 変更履歴                     │
├─────────────────────────────────────────────────────────────┤
│  [収入ビュー] [支出ビュー] [科目別] [月別推移]              │
│  ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 今後の拡張

### Phase 1: 基盤構築 ✅
- [x] 政治家 / 政治団体 / 選挙 API
- [x] API Key 認証
- [x] Azure DB 接続

### Phase 2: 公開データ永続化
- [ ] public_ledgers / public_journals テーブル作成
- [ ] ledger_change_logs テーブル作成
- [ ] ハッシュ生成ロジック実装

### Phase 3: Ledger 連携
- [ ] Supabase Realtime 受信エンドポイント
- [ ] 匿名化処理ロジック
- [ ] Ledger ↔ Hub API 連携

### Phase 4: Polimoney 連携
- [ ] 公開台帳 API (`/api/v1/public-ledgers`)
- [ ] 変更履歴 API (`/api/v1/ledgers/:id/changes`)
- [ ] 監査ログ

### Phase 5: 拡張
- [ ] 市民向けアプリ対応
- [ ] 研究者向け API
- [ ] OpenAPI / Swagger ドキュメント

