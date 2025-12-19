/**
 * 公開ページ用API（認証不要）
 *
 * - 認証済み政治家一覧・詳細
 * - 政治団体一覧・詳細
 * - 収支情報の取得
 */

import { Hono } from "hono";
import { getServiceClient } from "../lib/supabase.ts";

export const publicRouter = new Hono();

// ============================================
// 政治家（認証済みのみ公開）
// ============================================

interface PublicPolitician {
  id: string;
  name: string;
  name_kana: string | null;
  party: string | null;
  photo_url: string | null;
  official_url: string | null;
  verified_at: string | null;
  verified_domain: string | null;
}

// 認証済み政治家一覧
publicRouter.get("/politicians", async (c) => {
  const party = c.req.query("party");
  const search = c.req.query("search");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  const supabase = getServiceClient();

  let query = supabase
    .from("politicians")
    .select(
      `
      id,
      name,
      name_kana,
      party,
      photo_url,
      official_url,
      verified_at,
      verified_domain
    `,
      { count: "exact" }
    )
    .eq("is_verified", true);

  // 政党フィルター
  if (party) {
    query = query.eq("party", party);
  }

  // 名前検索
  if (search) {
    query = query.or(`name.ilike.%${search}%,name_kana.ilike.%${search}%`);
  }

  query = query
    .order("verified_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to fetch verified politicians:", error);
    return c.json({ error: "Failed to fetch politicians" }, 500);
  }

  return c.json({
    data: data || [],
    total: count || 0,
    limit,
    offset,
  });
});

// 政党一覧（organizations テーブルから type='political_party' を抽出）
publicRouter.get("/parties", async (c) => {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("organizations")
    .select(
      `
      id,
      name,
      official_url,
      sns_x,
      sns_instagram,
      sns_facebook,
      sns_tiktok,
      is_verified,
      verified_at
    `
    )
    .eq("type", "political_party")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch parties:", error);
    return c.json({ error: "Failed to fetch parties" }, 500);
  }

  return c.json({ data: data || [] });
});

// 旧API: 後方互換性のため残す（将来的に廃止予定）
publicRouter.get("/politicians/parties", async (c) => {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("type", "political_party")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("Failed to fetch parties:", error);
    return c.json({ error: "Failed to fetch parties" }, 500);
  }

  // 後方互換性のため同じ形式で返す
  const parties = (data || []).map((org) => ({
    name: org.name,
    count: 1, // 政党自体のカウントは1
  }));

  return c.json({ data: parties });
});

// 認証済み政治家詳細
publicRouter.get("/politicians/:id", async (c) => {
  const id = c.req.param("id");

  const supabase = getServiceClient();

  // 政治家基本情報
  const { data: politician, error: politicianError } = await supabase
    .from("politicians")
    .select(
      `
      id,
      name,
      name_kana,
      party,
      photo_url,
      official_url,
      verified_at,
      verified_domain,
      is_verified
    `
    )
    .eq("id", id)
    .single();

  if (politicianError) {
    if (politicianError.code === "PGRST116") {
      return c.json({ error: "Politician not found" }, 404);
    }
    console.error("Failed to fetch politician:", politicianError);
    return c.json({ error: "Failed to fetch politician" }, 500);
  }

  // 認証済みでない場合は404
  if (!politician.is_verified) {
    return c.json({ error: "Politician not found" }, 404);
  }

  // 関連する政治団体
  const { data: organizations } = await supabase
    .from("organizations")
    .select(
      `
      id,
      name,
      type,
      official_url,
      registration_authority
    `
    )
    .eq("politician_id", id)
    .eq("is_active", true);

  // 公開収支情報（概要）
  const { data: ledgers } = await supabase
    .from("public_ledgers")
    .select(
      `
      id,
      fiscal_year,
      total_income,
      total_expense,
      journal_count,
      election_id,
      organization_id,
      last_updated_at,
      elections (
        id,
        name,
        type,
        election_date
      ),
      organizations (
        id,
        name,
        type
      )
    `
    )
    .eq("politician_id", id)
    .eq("is_test", false)
    .order("fiscal_year", { ascending: false });

  // is_verified を除いてレスポンスを返す
  const { is_verified: _, ...publicPolitician } = politician;

  return c.json({
    data: {
      ...publicPolitician,
      organizations: organizations || [],
      ledgers: ledgers || [],
    },
  });
});

// ============================================
// 政治団体
// ============================================

interface PublicOrganization {
  id: string;
  name: string;
  type: string;
  official_url: string | null;
  registration_authority: string | null;
  politician: {
    id: string;
    name: string;
  } | null;
  has_verified_manager: boolean;
}

// 組織タイプの日本語名マッピング
const organizationTypeNames: Record<string, string> = {
  political_party: "政党",
  support_group: "後援会",
  fund_management: "資金管理団体",
  other: "その他の政治団体",
};

// 認証済み政治団体一覧（公開）
publicRouter.get("/organizations", async (c) => {
  const type = c.req.query("type");
  const search = c.req.query("search");
  const politicianId = c.req.query("politician_id");
  const limit = parseInt(c.req.query("limit") || "50");
  const offset = parseInt(c.req.query("offset") || "0");

  const supabase = getServiceClient();

  let query = supabase
    .from("organizations")
    .select(
      `
      id,
      name,
      type,
      official_url,
      registration_authority,
      office_address,
      description,
      sns_x,
      sns_instagram,
      sns_facebook,
      sns_tiktok,
      verified_at,
      politician_id,
      politicians (
        id,
        name
      )
    `,
      { count: "exact" }
    )
    .eq("is_active", true)
    .eq("is_verified", true); // 認証済みのみ

  // タイプフィルター
  if (type) {
    query = query.eq("type", type);
  }

  // 名前検索
  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  // 政治家フィルター
  if (politicianId) {
    query = query.eq("politician_id", politicianId);
  }

  query = query
    .order("verified_at", { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("Failed to fetch organizations:", error);
    return c.json({ error: "Failed to fetch organizations" }, 500);
  }

  // deno-lint-ignore no-explicit-any
  const result = (data || []).map((org: any) => {
    const politicianData = Array.isArray(org.politicians)
      ? org.politicians[0]
      : org.politicians;
    return {
      id: org.id,
      name: org.name,
      type: org.type,
      type_name: organizationTypeNames[org.type] || org.type,
      official_url: org.official_url,
      registration_authority: org.registration_authority,
      office_address: org.office_address,
      description: org.description,
      sns_x: org.sns_x,
      sns_instagram: org.sns_instagram,
      sns_facebook: org.sns_facebook,
      sns_tiktok: org.sns_tiktok,
      verified_at: org.verified_at,
      politician: politicianData as { id: string; name: string } | null,
    };
  });

  return c.json({
    data: result,
    total: count || 0,
    limit,
    offset,
  });
});

// 政治団体タイプ一覧（認証済み団体のみ）
publicRouter.get("/organizations/types", async (c) => {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("organizations")
    .select("type")
    .eq("is_active", true)
    .eq("is_verified", true);

  if (error) {
    console.error("Failed to fetch organization types:", error);
    return c.json({ error: "Failed to fetch organization types" }, 500);
  }

  // ユニークなタイプを抽出してカウント
  const typeCounts: Record<string, number> = {};
  for (const row of data || []) {
    if (row.type) {
      typeCounts[row.type] = (typeCounts[row.type] || 0) + 1;
    }
  }

  const types = Object.entries(typeCounts)
    .map(([code, count]) => ({
      code,
      name: organizationTypeNames[code] || code,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return c.json({ data: types });
});

// 認証済み政治団体詳細
publicRouter.get("/organizations/:id", async (c) => {
  const id = c.req.param("id");

  const supabase = getServiceClient();

  // 団体基本情報（全カラム取得）
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select(
      `
      id,
      name,
      type,
      official_url,
      registration_authority,
      established_date,
      office_address,
      representative_name,
      accountant_name,
      contact_email,
      description,
      sns_x,
      sns_instagram,
      sns_facebook,
      sns_tiktok,
      is_verified,
      verified_at,
      politician_id,
      is_active,
      politicians (
        id,
        name,
        is_verified
      )
    `
    )
    .eq("id", id)
    .single();

  if (orgError) {
    if (orgError.code === "PGRST116") {
      return c.json({ error: "Organization not found" }, 404);
    }
    console.error("Failed to fetch organization:", orgError);
    return c.json({ error: "Failed to fetch organization" }, 500);
  }

  // 非アクティブまたは未認証の場合は404
  if (!organization.is_active || !organization.is_verified) {
    return c.json({ error: "Organization not found" }, 404);
  }

  // 公開収支情報（概要）
  const { data: ledgers } = await supabase
    .from("public_ledgers")
    .select(
      `
      id,
      fiscal_year,
      total_income,
      total_expense,
      journal_count,
      election_id,
      politician_id,
      last_updated_at,
      elections (
        id,
        name,
        type,
        election_date
      ),
      politicians (
        id,
        name
      )
    `
    )
    .eq("organization_id", id)
    .eq("is_test", false)
    .order("fiscal_year", { ascending: false });

  // 内部フラグを除いてレスポンスを返す
  const { is_active: _1, is_verified: _2, ...publicOrg } = organization;

  return c.json({
    data: {
      ...publicOrg,
      type_name: organizationTypeNames[organization.type] || organization.type,
      ledgers: ledgers || [],
    },
  });
});

// ============================================
// 統計情報
// ============================================

// 公開統計情報
publicRouter.get("/stats", async (c) => {
  const supabase = getServiceClient();

  // 認証済み政治家数
  const { count: politicianCount } = await supabase
    .from("politicians")
    .select("id", { count: "exact", head: true })
    .eq("is_verified", true);

  // 認証済み政治団体数
  const { count: verifiedOrgCount } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("is_verified", true);

  // 政党数
  const { count: partyCount } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .eq("type", "political_party");

  // 公開台帳数
  const { count: ledgerCount } = await supabase
    .from("public_ledgers")
    .select("id", { count: "exact", head: true })
    .eq("is_test", false);

  // 公開仕訳数
  const { count: journalCount } = await supabase
    .from("public_journals")
    .select("id", { count: "exact", head: true })
    .eq("is_test", false);

  return c.json({
    data: {
      verified_politicians: politicianCount || 0,
      verified_organizations: verifiedOrgCount || 0,
      political_parties: partyCount || 0,
      public_ledgers: ledgerCount || 0,
      public_journals: journalCount || 0,
    },
  });
});
