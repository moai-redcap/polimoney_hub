-- Polimoney Hub - Azure PostgreSQL Schema
-- 共通識別子マスタ DB

-- UUID 拡張
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 政治家マスタ
CREATE TABLE IF NOT EXISTS politicians (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    name_kana VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 政治団体マスタ
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'political_party', 'support_group', 'other'
    politician_id UUID REFERENCES politicians(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 選挙マスタ
-- ID は手動生成: {type}-{area_code}-{date}
-- 例: HR-13-01-20241027 (衆院選-東京-1区-2024年10月27日)
CREATE TABLE IF NOT EXISTS elections (
    id VARCHAR(50) PRIMARY KEY, -- 形式: {type}-{area_code}-{YYYYMMDD}
    name VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL, -- HR:衆院選, HC:参院選, PG:知事選, CM:市長選, GM:議会選
    area_code VARCHAR(10) NOT NULL, -- 都道府県(2桁) + 選挙区(2桁)
    election_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_organizations_politician_id ON organizations(politician_id);
CREATE INDEX IF NOT EXISTS idx_elections_type ON elections(type);
CREATE INDEX IF NOT EXISTS idx_elections_date ON elections(election_date);

-- 選挙タイプの参考
COMMENT ON COLUMN elections.type IS '
HR: 衆議院議員選挙 (House of Representatives)
HC: 参議院議員選挙 (House of Councillors)
PG: 都道府県知事選挙 (Prefectural Governor)
CM: 市区町村長選挙 (City/Town/Village Mayor)
GM: 議会議員選挙 (General/Municipal Assembly)
';

-- 選挙区コードの参考
COMMENT ON COLUMN elections.area_code IS '
都道府県コード(2桁) + 選挙区番号(2桁)
例: 
- 13-01: 東京1区
- 13-25: 東京25区
- 31-32: 鳥取・島根合同選挙区(参院)
- 36-39: 徳島・高知合同選挙区(参院)
- 00-00: 比例代表(全国)
';

-- ============================================
-- 公開データ（Ledger から同期）
-- ============================================

-- 公開用台帳（1年分の収支報告）
CREATE TABLE IF NOT EXISTS public_ledgers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    politician_id UUID NOT NULL REFERENCES politicians(id),
    organization_id UUID REFERENCES organizations(id),
    election_id VARCHAR(50) REFERENCES elections(id),
    fiscal_year INTEGER NOT NULL,
    -- 集計データ
    total_income INTEGER DEFAULT 0,
    total_expense INTEGER DEFAULT 0,
    journal_count INTEGER DEFAULT 0,
    -- 同期メタデータ
    ledger_source_id UUID NOT NULL,          -- Ledger 側の ledger.id
    last_updated_at TIMESTAMPTZ NOT NULL,    -- 最終更新日時（Polimoney 表示用）
    first_synced_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- ユニーク制約
    UNIQUE (ledger_source_id)
);

-- 公開用仕訳
CREATE TABLE IF NOT EXISTS public_journals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_id UUID NOT NULL REFERENCES public_ledgers(id),
    journal_source_id UUID NOT NULL,         -- Ledger 側の journal.id
    date DATE NOT NULL,
    description TEXT,
    amount INTEGER NOT NULL,
    -- 匿名化済みデータ
    contact_name TEXT,                        -- "非公開" or 実名
    contact_type VARCHAR(20),                 -- 'person' or 'corporation'
    account_code VARCHAR(50),
    -- 改ざん検知用
    content_hash VARCHAR(64) NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- ユニーク制約
    UNIQUE (journal_source_id)
);

-- 台帳レベルの変更ログ（軽量）
CREATE TABLE IF NOT EXISTS ledger_change_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_id UUID NOT NULL REFERENCES public_ledgers(id),
    changed_at TIMESTAMPTZ NOT NULL,
    change_summary TEXT NOT NULL,             -- "仕訳3件を追加", "仕訳を修正" 等
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス（公開データ用）
CREATE INDEX IF NOT EXISTS idx_public_ledgers_politician ON public_ledgers(politician_id);
CREATE INDEX IF NOT EXISTS idx_public_ledgers_fiscal_year ON public_ledgers(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_public_journals_ledger ON public_journals(ledger_id);
CREATE INDEX IF NOT EXISTS idx_public_journals_date ON public_journals(date);
CREATE INDEX IF NOT EXISTS idx_change_logs_ledger ON ledger_change_logs(ledger_id);
CREATE INDEX IF NOT EXISTS idx_change_logs_changed_at ON ledger_change_logs(changed_at DESC);

