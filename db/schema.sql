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

