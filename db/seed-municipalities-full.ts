/**
 * 全市区町村データを Supabase に投入するスクリプト
 * データソース: https://github.com/digitaldemocracy2030/polimoney/blob/main/city_code.csv
 *
 * 使い方:
 *   deno run --allow-net --allow-env --allow-read db/seed-municipalities-full.ts
 */

import "std/dotenv/load.ts";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SECRET_KEY = Deno.env.get("SUPABASE_SECRET_KEY");

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  console.error("❌ SUPABASE_URL or SUPABASE_SECRET_KEY is not set");
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const CSV_URL =
  "https://raw.githubusercontent.com/digitaldemocracy2030/polimoney/main/city_code.csv";

async function main() {
  console.log("📥 CSV をダウンロード中...");
  const response = await fetch(CSV_URL);
  const csvText = await response.text();

  const lines = csvText.trim().split("\n");
  const header = lines[0];
  console.log(`📄 ヘッダー: ${header}`);

  const dataLines = lines.slice(1);
  console.log(`📊 データ件数: ${dataLines.length}`);

  // データ変換
  const municipalities: {
    code: string;
    prefecture_name: string;
    city_name: string | null;
    prefecture_name_kana: string;
    city_name_kana: string | null;
  }[] = [];

  for (const line of dataLines) {
    const parts = parseCSVLine(line);
    if (parts.length < 5) continue;

    const [code, prefName, cityName, prefKana, cityKana] = parts;

    // 特殊コード（999998, 999999）はスキップ
    if (code === "999998" || code === "999999") continue;

    municipalities.push({
      code,
      prefecture_name: prefName,
      city_name: cityName || null,
      prefecture_name_kana: prefKana,
      city_name_kana: cityKana || null,
    });
  }

  console.log(`📊 INSERT 対象: ${municipalities.length} 件`);

  // バッチで upsert（500件ずつ）
  const BATCH_SIZE = 500;
  let inserted = 0;

  for (let i = 0; i < municipalities.length; i += BATCH_SIZE) {
    const batch = municipalities.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from("municipalities")
      .upsert(batch, { onConflict: "code", ignoreDuplicates: true });

    if (error) {
      console.error(`❌ エラー (バッチ ${i}-${i + batch.length}):`, error);
      Deno.exit(1);
    }

    inserted += batch.length;
    console.log(`   ✅ ${inserted} / ${municipalities.length} 件完了`);
  }

  // 確認
  const { count } = await supabase
    .from("municipalities")
    .select("*", { count: "exact", head: true });

  console.log(`\n✅ 完了！ 合計: ${count} 件`);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

main();
