/**
 * Polimoney 共通定義ファイル
 * フロントエンド・バックエンドで共有
 *
 * 使用方法:
 * - polimoney_hub: import { CATEGORIES, ELECTION_TYPES } from "./lib/constants.ts"
 * - polimoney: このファイルをコピーまたは npm パッケージ化
 */

// ============================================
// カテゴリ（支出・収入の分類）
// ============================================

export const CATEGORIES = {
  // 支出カテゴリ
  personnel: { name: "人件費", type: "expense" },
  building: { name: "家屋費", type: "expense" },
  communication: { name: "通信費", type: "expense" },
  transportation: { name: "交通費", type: "expense" },
  printing: { name: "印刷費", type: "expense" },
  advertising: { name: "広告費", type: "expense" },
  stationery: { name: "文具費", type: "expense" },
  food: { name: "食糧費", type: "expense" },
  lodging: { name: "休泊費", type: "expense" },
  miscellaneous: { name: "雑費", type: "expense" },
  // 収入カテゴリ
  income: { name: "収入", type: "income" },
  donation: { name: "寄附", type: "income" },
  other_income: { name: "その他の収入", type: "income" },
} as const;

export type CategoryCode = keyof typeof CATEGORIES;

// ============================================
// 選挙タイプ
// ============================================

export const ELECTION_TYPES = {
  HR: { name: "衆議院議員選挙", shortName: "衆院選" },
  HC: { name: "参議院議員選挙", shortName: "参院選" },
  PG: { name: "都道府県知事選挙", shortName: "知事選" },
  PA: { name: "都道府県議会議員選挙", shortName: "県議選" },
  GM: { name: "市区町村長選挙", shortName: "首長選" },
  CM: { name: "市区町村議会議員選挙", shortName: "市議選" },
} as const;

export type ElectionTypeCode = keyof typeof ELECTION_TYPES;

// ============================================
// 収支タイプ（選挙運動費用の分類）
// ============================================

export const EXPENDITURE_TYPES = {
  選挙運動: { description: "選挙運動期間中の支出" },
  立候補準備: { description: "立候補届出前の準備活動" },
  立候補準備のための支出: { description: "立候補届出前の準備活動" },
  寄附: { description: "金銭または物品の寄附" },
  その他の収入: { description: "自己資金等" },
} as const;

export type ExpenditureType = keyof typeof EXPENDITURE_TYPES;

// ============================================
// ヘルパー関数
// ============================================

/**
 * カテゴリコードから日本語名を取得
 */
export function getCategoryName(code: string): string {
  return CATEGORIES[code as CategoryCode]?.name ?? code;
}

/**
 * 選挙タイプコードから日本語名を取得
 */
export function getElectionTypeName(code: string): string {
  return ELECTION_TYPES[code as ElectionTypeCode]?.name ?? code;
}

/**
 * 選挙タイプコードから短縮名を取得
 */
export function getElectionTypeShortName(code: string): string {
  return ELECTION_TYPES[code as ElectionTypeCode]?.shortName ?? code;
}

/**
 * カテゴリが収入かどうか
 */
export function isIncomeCategory(code: string): boolean {
  const category = CATEGORIES[code as CategoryCode];
  return category?.type === "income";
}

// ============================================
// JSON 変換ユーティリティ
// ============================================

/**
 * 仕訳データにカテゴリ名を追加
 */
export function enrichJournalWithNames<T extends { category: string }>(
  journal: T
): T & { category_name: string } {
  return {
    ...journal,
    category_name: getCategoryName(journal.category),
  };
}

/**
 * 選挙データにタイプ名を追加
 */
export function enrichElectionWithNames<T extends { type: string }>(
  election: T
): T & { type_name: string } {
  return {
    ...election,
    type_name: getElectionTypeName(election.type),
  };
}
