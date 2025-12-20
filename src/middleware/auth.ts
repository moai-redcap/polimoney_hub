import { Context, Next } from "hono";

/**
 * API Key 認証ミドルウェア
 * ヘッダー: X-API-Key
 *
 * 有効なキー:
 * - API_KEY_PROD: 本番環境用（polimoney リリース版）
 * - API_KEY_DEV: 開発環境用（polimoney 開発版）
 */
export async function apiKeyAuth(c: Context, next: Next) {
  const apiKey = c.req.header("X-API-Key");

  const validKeys = [
    Deno.env.get("API_KEY_PROD"),
    Deno.env.get("API_KEY_DEV"),
  ].filter(Boolean);

  if (validKeys.length === 0) {
    console.warn(
      "Warning: API_KEY_PROD/API_KEY_DEV environment variables are not set"
    );
    // 開発環境では警告のみで通過
    if (Deno.env.get("DENO_ENV") === "development") {
      await next();
      return;
    }
  }

  if (!apiKey) {
    return c.json({ error: "API Key is required" }, 401);
  }

  if (!validKeys.includes(apiKey)) {
    return c.json({ error: "Invalid API Key" }, 401);
  }

  // 環境を識別してログ用に記録
  const isDevKey = apiKey === Deno.env.get("API_KEY_DEV");
  const env = isDevKey ? "dev" : "prod";
  c.set("apiEnv", env);

  // テストモードフラグ（DEV キー = テストデータ）
  c.set("isTestMode", isDevKey);

  // サービス名をログ用に記録
  const serviceName = c.req.header("X-Service-Name") || "unknown";
  c.set("serviceName", serviceName);

  console.log(`[Auth] API call from ${serviceName}, env: ${env}, isTestMode: ${isDevKey}`);

  await next();
}
