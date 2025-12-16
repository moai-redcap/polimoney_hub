/**
 * 選挙区マスタ シードスクリプト
 * 2025年現在の日本の選挙区データを投入
 *
 * 選挙区タイプ:
 * - HR: 衆議院小選挙区 (289区)
 * - HC: 参議院選挙区 (45選挙区、合区含む)
 * - PG: 都道府県知事選挙 (47都道府県)
 * - PA: 都道府県議会選挙区 (各都道府県で異なる)
 * - GM: 市区町村長選挙 (全域が選挙区)
 * - CM: 市区町村議会選挙 (全域が選挙区)
 */

import "https://deno.land/std@0.208.0/dotenv/load.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SECRET_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Error: SUPABASE_URL and SUPABASE_SECRET_KEY are required");
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// 都道府県コード
const PREFECTURES: Record<string, { name: string; code: string }> = {
  "01": { name: "北海道", code: "01" },
  "02": { name: "青森県", code: "02" },
  "03": { name: "岩手県", code: "03" },
  "04": { name: "宮城県", code: "04" },
  "05": { name: "秋田県", code: "05" },
  "06": { name: "山形県", code: "06" },
  "07": { name: "福島県", code: "07" },
  "08": { name: "茨城県", code: "08" },
  "09": { name: "栃木県", code: "09" },
  "10": { name: "群馬県", code: "10" },
  "11": { name: "埼玉県", code: "11" },
  "12": { name: "千葉県", code: "12" },
  "13": { name: "東京都", code: "13" },
  "14": { name: "神奈川県", code: "14" },
  "15": { name: "新潟県", code: "15" },
  "16": { name: "富山県", code: "16" },
  "17": { name: "石川県", code: "17" },
  "18": { name: "福井県", code: "18" },
  "19": { name: "山梨県", code: "19" },
  "20": { name: "長野県", code: "20" },
  "21": { name: "岐阜県", code: "21" },
  "22": { name: "静岡県", code: "22" },
  "23": { name: "愛知県", code: "23" },
  "24": { name: "三重県", code: "24" },
  "25": { name: "滋賀県", code: "25" },
  "26": { name: "京都府", code: "26" },
  "27": { name: "大阪府", code: "27" },
  "28": { name: "兵庫県", code: "28" },
  "29": { name: "奈良県", code: "29" },
  "30": { name: "和歌山県", code: "30" },
  "31": { name: "鳥取県", code: "31" },
  "32": { name: "島根県", code: "32" },
  "33": { name: "岡山県", code: "33" },
  "34": { name: "広島県", code: "34" },
  "35": { name: "山口県", code: "35" },
  "36": { name: "徳島県", code: "36" },
  "37": { name: "香川県", code: "37" },
  "38": { name: "愛媛県", code: "38" },
  "39": { name: "高知県", code: "39" },
  "40": { name: "福岡県", code: "40" },
  "41": { name: "佐賀県", code: "41" },
  "42": { name: "長崎県", code: "42" },
  "43": { name: "熊本県", code: "43" },
  "44": { name: "大分県", code: "44" },
  "45": { name: "宮崎県", code: "45" },
  "46": { name: "鹿児島県", code: "46" },
  "47": { name: "沖縄県", code: "47" },
};

// 衆議院小選挙区数（2022年区割り変更後、2025年現在：289区）
const HR_DISTRICT_COUNTS: Record<string, number> = {
  "01": 12, // 北海道
  "02": 3,  // 青森
  "03": 3,  // 岩手
  "04": 5,  // 宮城
  "05": 3,  // 秋田
  "06": 3,  // 山形
  "07": 4,  // 福島
  "08": 7,  // 茨城
  "09": 5,  // 栃木 (4→5)
  "10": 5,  // 群馬 (4→5)
  "11": 16, // 埼玉
  "12": 14, // 千葉
  "13": 30, // 東京
  "14": 20, // 神奈川
  "15": 5,  // 新潟
  "16": 3,  // 富山
  "17": 3,  // 石川
  "18": 2,  // 福井
  "19": 2,  // 山梨
  "20": 5,  // 長野 (4→5)
  "21": 5,  // 岐阜
  "22": 6,  // 静岡
  "23": 16, // 愛知
  "24": 5,  // 三重 (4→5)
  "25": 3,  // 滋賀
  "26": 6,  // 京都 (5→6)
  "27": 19, // 大阪
  "28": 12, // 兵庫
  "29": 3,  // 奈良 (2→3)
  "30": 2,  // 和歌山
  "31": 2,  // 鳥取
  "32": 2,  // 島根
  "33": 4,  // 岡山
  "34": 7,  // 広島
  "35": 3,  // 山口
  "36": 2,  // 徳島
  "37": 3,  // 香川 (2→3)
  "38": 3,  // 愛媛
  "39": 2,  // 高知
  "40": 11, // 福岡
  "41": 2,  // 佐賀
  "42": 3,  // 長崎
  "43": 4,  // 熊本
  "44": 3,  // 大分
  "45": 3,  // 宮崎 (2→3)
  "46": 4,  // 鹿児島
  "47": 4,  // 沖縄
};

// 参議院選挙区定数（2025年現在、合区含む）
// 定数は改選議席数（3年ごとの選挙で選出される議席数）
const HC_DISTRICTS: { prefCodes: string[]; name: string; seats: number }[] = [
  { prefCodes: ["01"], name: "北海道選挙区", seats: 3 },
  { prefCodes: ["02"], name: "青森県選挙区", seats: 1 },
  { prefCodes: ["03"], name: "岩手県選挙区", seats: 1 },
  { prefCodes: ["04"], name: "宮城県選挙区", seats: 1 },
  { prefCodes: ["05"], name: "秋田県選挙区", seats: 1 },
  { prefCodes: ["06"], name: "山形県選挙区", seats: 1 },
  { prefCodes: ["07"], name: "福島県選挙区", seats: 1 },
  { prefCodes: ["08"], name: "茨城県選挙区", seats: 2 },
  { prefCodes: ["09"], name: "栃木県選挙区", seats: 1 },
  { prefCodes: ["10"], name: "群馬県選挙区", seats: 1 },
  { prefCodes: ["11"], name: "埼玉県選挙区", seats: 4 },
  { prefCodes: ["12"], name: "千葉県選挙区", seats: 3 },
  { prefCodes: ["13"], name: "東京都選挙区", seats: 6 },
  { prefCodes: ["14"], name: "神奈川県選挙区", seats: 5 },
  { prefCodes: ["15"], name: "新潟県選挙区", seats: 1 },
  { prefCodes: ["16"], name: "富山県選挙区", seats: 1 },
  { prefCodes: ["17"], name: "石川県選挙区", seats: 1 },
  { prefCodes: ["18"], name: "福井県選挙区", seats: 1 },
  { prefCodes: ["19"], name: "山梨県選挙区", seats: 1 },
  { prefCodes: ["20"], name: "長野県選挙区", seats: 1 },
  { prefCodes: ["21"], name: "岐阜県選挙区", seats: 1 },
  { prefCodes: ["22"], name: "静岡県選挙区", seats: 2 },
  { prefCodes: ["23"], name: "愛知県選挙区", seats: 4 },
  { prefCodes: ["24"], name: "三重県選挙区", seats: 1 },
  { prefCodes: ["25"], name: "滋賀県選挙区", seats: 1 },
  { prefCodes: ["26"], name: "京都府選挙区", seats: 2 },
  { prefCodes: ["27"], name: "大阪府選挙区", seats: 4 },
  { prefCodes: ["28"], name: "兵庫県選挙区", seats: 3 },
  { prefCodes: ["29"], name: "奈良県選挙区", seats: 1 },
  { prefCodes: ["30"], name: "和歌山県選挙区", seats: 1 },
  { prefCodes: ["31", "32"], name: "鳥取県・島根県選挙区", seats: 1 }, // 合区
  { prefCodes: ["33"], name: "岡山県選挙区", seats: 1 },
  { prefCodes: ["34"], name: "広島県選挙区", seats: 2 },
  { prefCodes: ["35"], name: "山口県選挙区", seats: 1 },
  { prefCodes: ["36", "39"], name: "徳島県・高知県選挙区", seats: 1 }, // 合区
  { prefCodes: ["37"], name: "香川県選挙区", seats: 1 },
  { prefCodes: ["38"], name: "愛媛県選挙区", seats: 1 },
  { prefCodes: ["40"], name: "福岡県選挙区", seats: 3 },
  { prefCodes: ["41"], name: "佐賀県選挙区", seats: 1 },
  { prefCodes: ["42"], name: "長崎県選挙区", seats: 1 },
  { prefCodes: ["43"], name: "熊本県選挙区", seats: 1 },
  { prefCodes: ["44"], name: "大分県選挙区", seats: 1 },
  { prefCodes: ["45"], name: "宮崎県選挙区", seats: 1 },
  { prefCodes: ["46"], name: "鹿児島県選挙区", seats: 1 },
  { prefCodes: ["47"], name: "沖縄県選挙区", seats: 1 },
];

interface District {
  name: string;
  type: string;
  prefecture_codes: string | null;
  municipality_code: string | null;
  description: string | null;
  is_active: boolean;
}

function generateHRDistricts(): District[] {
  const districts: District[] = [];

  for (const [prefCode, count] of Object.entries(HR_DISTRICT_COUNTS)) {
    const pref = PREFECTURES[prefCode];
    for (let i = 1; i <= count; i++) {
      districts.push({
        name: `${pref.name}第${i}区`,
        type: "HR",
        prefecture_codes: prefCode,
        municipality_code: null,
        description: `衆議院小選挙区 ${pref.name}第${i}区`,
        is_active: true,
      });
    }
  }

  return districts;
}

function generateHCDistricts(): District[] {
  return HC_DISTRICTS.map((d) => ({
    name: d.name,
    type: "HC",
    prefecture_codes: d.prefCodes.join(","),
    municipality_code: null,
    description: `参議院選挙区 改選定数${d.seats}`,
    is_active: true,
  }));
}

function generatePGDistricts(): District[] {
  return Object.entries(PREFECTURES).map(([code, pref]) => ({
    name: `${pref.name}知事選挙区`,
    type: "PG",
    prefecture_codes: code,
    municipality_code: null,
    description: `${pref.name}知事選挙（全県区）`,
    is_active: true,
  }));
}

function generatePADistricts(): District[] {
  // 都道府県議会選挙区は各都道府県で異なる
  // ここでは都道府県単位の代表的な選挙区のみ登録
  // 実際の運用時に市区町村レベルの選挙区を追加
  return Object.entries(PREFECTURES).map(([code, pref]) => ({
    name: `${pref.name}議会選挙区（全県）`,
    type: "PA",
    prefecture_codes: code,
    municipality_code: null,
    description: `${pref.name}議会選挙区（詳細は市区町村単位で登録）`,
    is_active: true,
  }));
}

interface Municipality {
  code: string;
  prefecture_name: string;
  city_name: string | null;
}

async function fetchAllMunicipalities(): Promise<Municipality[]> {
  // municipalities テーブルから全市区町村を取得（ページネーション対応）
  const allMunicipalities: Municipality[] = [];
  const PAGE_SIZE = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from("municipalities")
      .select("code, prefecture_name, city_name")
      .eq("is_active", true)
      .order("code")
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      console.error("municipalities 取得エラー:", error.message);
      break;
    }

    if (data && data.length > 0) {
      allMunicipalities.push(...(data as Municipality[]));
      offset += PAGE_SIZE;
      hasMore = data.length === PAGE_SIZE;
    } else {
      hasMore = false;
    }
  }

  return allMunicipalities;
}

async function generateGMDistricts(): Promise<District[]> {
  const municipalities = await fetchAllMunicipalities();

  if (municipalities.length === 0) {
    return [];
  }

  return (municipalities as Municipality[]).map((m) => {
    const name = m.city_name
      ? `${m.prefecture_name}${m.city_name}長選挙区`
      : `${m.prefecture_name}知事選挙区`; // 都道府県のみの場合（通常はない）
    return {
      name,
      type: "GM",
      prefecture_codes: m.code.substring(0, 2),
      municipality_code: m.code,
      description: `市区町村長選挙 ${m.prefecture_name}${m.city_name || ""}`,
      is_active: true,
    };
  });
}

async function generateCMDistricts(): Promise<District[]> {
  const municipalities = await fetchAllMunicipalities();

  if (municipalities.length === 0) {
    return [];
  }

  return (municipalities as Municipality[]).map((m) => {
    const name = m.city_name
      ? `${m.prefecture_name}${m.city_name}議会選挙区`
      : `${m.prefecture_name}議会選挙区`; // 都道府県のみの場合（通常はない）
    return {
      name,
      type: "CM",
      prefecture_codes: m.code.substring(0, 2),
      municipality_code: m.code,
      description: `市区町村議会選挙 ${m.prefecture_name}${m.city_name || ""}`,
      is_active: true,
    };
  });
}

async function seedDistricts() {
  console.log("=== 選挙区マスタ シード開始 ===\n");

  // 既存データを削除（クリーンアップ）
  console.log("既存データを削除中...");
  const { error: deleteError } = await supabase
    .from("districts")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // 全件削除

  if (deleteError) {
    console.error("削除エラー:", deleteError.message);
  }

  // 衆議院小選挙区
  const hrDistricts = generateHRDistricts();
  console.log(`\n衆議院小選挙区: ${hrDistricts.length}区`);

  const { error: hrError } = await supabase.from("districts").insert(hrDistricts);
  if (hrError) {
    console.error("衆院選挙区 挿入エラー:", hrError.message);
  } else {
    console.log("✅ 衆議院小選挙区 登録完了");
  }

  // 参議院選挙区
  const hcDistricts = generateHCDistricts();
  console.log(`\n参議院選挙区: ${hcDistricts.length}区`);

  const { error: hcError } = await supabase.from("districts").insert(hcDistricts);
  if (hcError) {
    console.error("参院選挙区 挿入エラー:", hcError.message);
  } else {
    console.log("✅ 参議院選挙区 登録完了");
  }

  // 都道府県知事選挙区
  const pgDistricts = generatePGDistricts();
  console.log(`\n都道府県知事選挙区: ${pgDistricts.length}区`);

  const { error: pgError } = await supabase.from("districts").insert(pgDistricts);
  if (pgError) {
    console.error("知事選挙区 挿入エラー:", pgError.message);
  } else {
    console.log("✅ 都道府県知事選挙区 登録完了");
  }

  // 都道府県議会選挙区（代表）
  const paDistricts = generatePADistricts();
  console.log(`\n都道府県議会選挙区（代表）: ${paDistricts.length}区`);

  const { error: paError } = await supabase.from("districts").insert(paDistricts);
  if (paError) {
    console.error("県議選挙区 挿入エラー:", paError.message);
  } else {
    console.log("✅ 都道府県議会選挙区 登録完了");
  }

  // 市区町村長選挙区
  const gmDistricts = await generateGMDistricts();
  console.log(`\n市区町村長選挙区: ${gmDistricts.length}区`);

  // バッチ挿入（Supabaseの制限対応）
  const GM_BATCH_SIZE = 500;
  for (let i = 0; i < gmDistricts.length; i += GM_BATCH_SIZE) {
    const batch = gmDistricts.slice(i, i + GM_BATCH_SIZE);
    const { error: gmError } = await supabase.from("districts").insert(batch);
    if (gmError) {
      console.error(`市区町村長選挙区 挿入エラー (batch ${i / GM_BATCH_SIZE + 1}):`, gmError.message);
    }
  }
  console.log("✅ 市区町村長選挙区 登録完了");

  // 市区町村議会選挙区
  const cmDistricts = await generateCMDistricts();
  console.log(`\n市区町村議会選挙区: ${cmDistricts.length}区`);

  for (let i = 0; i < cmDistricts.length; i += GM_BATCH_SIZE) {
    const batch = cmDistricts.slice(i, i + GM_BATCH_SIZE);
    const { error: cmError } = await supabase.from("districts").insert(batch);
    if (cmError) {
      console.error(`市区町村議会選挙区 挿入エラー (batch ${i / GM_BATCH_SIZE + 1}):`, cmError.message);
    }
  }
  console.log("✅ 市区町村議会選挙区 登録完了");

  // master_metadata 更新
  const { error: metaError } = await supabase
    .from("master_metadata")
    .upsert({ table_name: "districts", last_updated_at: new Date().toISOString() });

  if (metaError) {
    console.error("metadata更新エラー:", metaError.message);
  }

  // 集計
  const { count } = await supabase
    .from("districts")
    .select("*", { count: "exact", head: true });

  console.log("\n=== シード完了 ===");
  console.log(`総選挙区数: ${count}`);
  console.log(`  - 衆議院小選挙区 (HR): ${hrDistricts.length}`);
  console.log(`  - 参議院選挙区 (HC): ${hcDistricts.length}`);
  console.log(`  - 都道府県知事選挙区 (PG): ${pgDistricts.length}`);
  console.log(`  - 都道府県議会選挙区 (PA): ${paDistricts.length}`);
  console.log(`  - 市区町村長選挙区 (GM): ${gmDistricts.length}`);
  console.log(`  - 市区町村議会選挙区 (CM): ${cmDistricts.length}`);
}

// 実行
seedDistricts().catch(console.error);
