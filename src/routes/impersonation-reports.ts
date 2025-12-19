/**
 * なりすまし通報API（公開）
 *
 * 「私ではありません」機能 - 政治家・政治団体ページからの通報を受け付け
 */

import { Hono } from "hono";
import { getServiceClient } from "../lib/supabase.ts";

export const impersonationReportsRouter = new Hono();

// 証拠種別の定義
const validEvidenceTypes = [
  "id_card", // 身分証明書（運転免許証など）
  "passport", // パスポート
  "member_badge", // 議員バッジ
  "member_id", // 議員証
  "other", // その他
] as const;

type EvidenceType = (typeof validEvidenceTypes)[number];

// 証拠種別の日本語名
const evidenceTypeNames: Record<EvidenceType, string> = {
  id_card: "身分証明書（運転免許証など）",
  passport: "パスポート",
  member_badge: "議員バッジ",
  member_id: "議員証",
  other: "その他",
};

interface CreateReportRequest {
  // 対象の情報
  target_type: "politician" | "organization";
  target_politician_id?: string;
  target_organization_id?: string;
  // 通報者の情報
  reporter_name: string;
  reporter_email: string;
  reporter_phone: string;
  reporter_address?: string;
  // 証拠
  evidence_type: EvidenceType;
  evidence_file_url: string;
  evidence_file_name?: string;
  // 補足説明
  additional_notes?: string;
}

// 証拠種別一覧を取得（フォーム用）
impersonationReportsRouter.get("/evidence-types", (c) => {
  const types = validEvidenceTypes.map((code) => ({
    code,
    name: evidenceTypeNames[code],
  }));

  return c.json({
    data: types,
    note: "名刺は偽造が容易なため、証拠として受け付けていません",
  });
});

// なりすまし通報を作成
impersonationReportsRouter.post("/", async (c) => {
  const body = await c.req.json<CreateReportRequest>();

  // バリデーション
  const errors: string[] = [];

  // 必須フィールド
  if (!body.target_type) {
    errors.push("target_type is required");
  } else if (!["politician", "organization"].includes(body.target_type)) {
    errors.push("target_type must be 'politician' or 'organization'");
  }

  if (body.target_type === "politician" && !body.target_politician_id) {
    errors.push("target_politician_id is required for politician reports");
  }

  if (body.target_type === "organization" && !body.target_organization_id) {
    errors.push("target_organization_id is required for organization reports");
  }

  if (!body.reporter_name?.trim()) {
    errors.push("reporter_name is required");
  }

  if (!body.reporter_email?.trim()) {
    errors.push("reporter_email is required");
  } else if (!isValidEmail(body.reporter_email)) {
    errors.push("reporter_email is invalid");
  }

  if (!body.reporter_phone?.trim()) {
    errors.push("reporter_phone is required");
  }

  if (!body.evidence_type) {
    errors.push("evidence_type is required");
  } else if (
    !validEvidenceTypes.includes(body.evidence_type as EvidenceType)
  ) {
    errors.push(
      `evidence_type must be one of: ${validEvidenceTypes.join(", ")}`
    );
  }

  if (!body.evidence_file_url?.trim()) {
    errors.push("evidence_file_url is required");
  }

  if (errors.length > 0) {
    return c.json({ error: "Validation failed", details: errors }, 400);
  }

  const supabase = getServiceClient();

  // 対象の存在確認
  if (body.target_type === "politician") {
    const { data: politician, error } = await supabase
      .from("politicians")
      .select("id, name, is_verified")
      .eq("id", body.target_politician_id!)
      .single();

    if (error || !politician) {
      return c.json({ error: "Target politician not found" }, 404);
    }

    // 認証済みでない政治家への通報は受け付けない
    if (!politician.is_verified) {
      return c.json(
        { error: "Cannot report non-verified politicians" },
        400
      );
    }
  } else {
    const { data: organization, error } = await supabase
      .from("organizations")
      .select("id, name, is_active")
      .eq("id", body.target_organization_id!)
      .single();

    if (error || !organization) {
      return c.json({ error: "Target organization not found" }, 404);
    }

    if (!organization.is_active) {
      return c.json(
        { error: "Cannot report inactive organizations" },
        400
      );
    }
  }

  // 通報を作成
  const { data, error } = await supabase
    .from("impersonation_reports")
    .insert({
      target_type: body.target_type,
      target_politician_id:
        body.target_type === "politician"
          ? body.target_politician_id
          : null,
      target_organization_id:
        body.target_type === "organization"
          ? body.target_organization_id
          : null,
      reporter_name: body.reporter_name.trim(),
      reporter_email: body.reporter_email.trim().toLowerCase(),
      reporter_phone: body.reporter_phone.trim(),
      reporter_address: body.reporter_address?.trim() || null,
      evidence_type: body.evidence_type,
      evidence_file_url: body.evidence_file_url.trim(),
      evidence_file_name: body.evidence_file_name?.trim() || null,
      additional_notes: body.additional_notes?.trim() || null,
      status: "pending",
    })
    .select("id, created_at")
    .single();

  if (error) {
    console.error("Failed to create impersonation report:", error);
    return c.json({ error: "Failed to create report" }, 500);
  }

  console.log(`[ImpersonationReport] New report created: ${data.id}`);

  return c.json(
    {
      data: {
        id: data.id,
        created_at: data.created_at,
      },
      message:
        "通報を受け付けました。運営で確認後、ご連絡いたします。",
    },
    201
  );
});

// 通報ステータス確認（通報者用）
// 通報IDとメールアドレスで照合
impersonationReportsRouter.get("/:id/status", async (c) => {
  const id = c.req.param("id");
  const email = c.req.query("email");

  if (!email) {
    return c.json({ error: "email query parameter is required" }, 400);
  }

  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from("impersonation_reports")
    .select(
      `
      id,
      target_type,
      status,
      resolution_notes,
      created_at,
      reviewed_at
    `
    )
    .eq("id", id)
    .eq("reporter_email", email.toLowerCase())
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return c.json({ error: "Report not found" }, 404);
    }
    console.error("Failed to fetch report status:", error);
    return c.json({ error: "Failed to fetch report status" }, 500);
  }

  // ステータスの日本語名
  const statusNames: Record<string, string> = {
    pending: "審査待ち",
    investigating: "調査中",
    confirmed: "なりすまし確認済み",
    rejected: "却下",
    resolved: "対応完了",
  };

  return c.json({
    data: {
      ...data,
      status_name: statusNames[data.status] || data.status,
    },
  });
});

// メールアドレスのバリデーション
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
