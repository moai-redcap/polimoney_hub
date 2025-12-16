-- ============================================
-- 勘定科目マスタ（政治資金規正法準拠）
-- Supabase SQL Editor で実行してください
-- ============================================

-- 勘定科目マスタ
CREATE TABLE IF NOT EXISTS account_codes (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    name_kana VARCHAR(100),
    type VARCHAR(20) NOT NULL,
    report_category VARCHAR(50) NOT NULL,
    ledger_type VARCHAR(20) NOT NULL DEFAULT 'both',
    is_public_subsidy_eligible BOOLEAN DEFAULT FALSE,
    display_order INT NOT NULL,
    polimoney_category VARCHAR(50),
    parent_code VARCHAR(50) REFERENCES account_codes(code),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_codes_type ON account_codes(type);
CREATE INDEX IF NOT EXISTS idx_account_codes_ledger ON account_codes(ledger_type);
CREATE INDEX IF NOT EXISTS idx_account_codes_order ON account_codes(display_order);
CREATE INDEX IF NOT EXISTS idx_account_codes_active ON account_codes(is_active);

-- 選挙タイプマスタ
CREATE TABLE IF NOT EXISTS election_types (
    code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    display_order INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 選挙公営費目マスタ
CREATE TABLE IF NOT EXISTS public_subsidy_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_type_code VARCHAR(10) NOT NULL REFERENCES election_types(code),
    account_code VARCHAR(50) NOT NULL REFERENCES account_codes(code),
    item_name VARCHAR(100) NOT NULL,
    unit VARCHAR(20),
    unit_price_limit INT,
    quantity_formula TEXT,
    max_quantity INT,
    total_limit INT,
    notes TEXT,
    effective_from DATE,
    effective_until DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subsidy_items_election ON public_subsidy_items(election_type_code);
CREATE INDEX IF NOT EXISTS idx_subsidy_items_account ON public_subsidy_items(account_code);
CREATE INDEX IF NOT EXISTS idx_subsidy_items_active ON public_subsidy_items(is_active);

-- RLS 有効化
ALTER TABLE account_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_subsidy_items ENABLE ROW LEVEL SECURITY;

-- 読み取りポリシー（全員許可）
DROP POLICY IF EXISTS "Allow public read" ON account_codes;
CREATE POLICY "Allow public read" ON account_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read" ON election_types;
CREATE POLICY "Allow public read" ON election_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read" ON public_subsidy_items;
CREATE POLICY "Allow public read" ON public_subsidy_items FOR SELECT USING (true);

-- 書き込みポリシー（service_role のみ）
DROP POLICY IF EXISTS "Allow service write" ON account_codes;
CREATE POLICY "Allow service write" ON account_codes FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow service write" ON election_types;
CREATE POLICY "Allow service write" ON election_types FOR ALL USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Allow service write" ON public_subsidy_items;
CREATE POLICY "Allow service write" ON public_subsidy_items FOR ALL USING (auth.role() = 'service_role');

-- マスタメタデータ更新
INSERT INTO master_metadata (table_name, last_updated_at)
VALUES 
    ('account_codes', NOW()),
    ('election_types', NOW()),
    ('public_subsidy_items', NOW())
ON CONFLICT (table_name) DO UPDATE SET last_updated_at = NOW();
