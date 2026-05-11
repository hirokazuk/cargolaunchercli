import type { Credentials } from "./credentials";

/**
 * fetch の `proxy` 用 URL、または ant の http_proxy/https_proxy に使う URL。
 * - `explicit`（--proxy-url）があれば優先（認証込み URL でも可）
 * - なければ `HTTPS_PROXY`、なければ `HTTP_PROXY`（いずれも認証情報を含む完全 URL を想定）
 */
export function resolveFetchProxyUrl(explicit?: string): string | undefined {
  if (explicit?.trim()) {
    return explicit.trim();
  }
  const https = process.env.HTTPS_PROXY?.trim();
  if (https) {
    return https;
  }
  const http = process.env.HTTP_PROXY?.trim();
  if (http) {
    return http;
  }
  return undefined;
}

export type ProxyCredentialsResult =
  | { ok: true; proxyUrl: string; cred: Credentials }
  | { ok: false; message: string };

/**
 * start / build / ant run 用: 解決したプロキシ URL から userinfo を取り出す。
 * 認証なしプロキシや URL 未設定のときは失敗を返す。
 */
export function resolveProxyCredentialsForApp(explicit?: string): ProxyCredentialsResult {
  const proxyUrl = resolveFetchProxyUrl(explicit);
  if (!proxyUrl) {
    return {
      ok: false,
      message:
        "プロキシが未設定です。--proxy-url を指定するか、HTTPS_PROXY（または HTTP_PROXY）を設定してください。",
    };
  }
  let parsed: URL;
  try {
    parsed = new URL(proxyUrl);
  } catch {
    return { ok: false, message: `プロキシ URL が無効です: ${proxyUrl}` };
  }
  const user = parsed.username;
  const password = parsed.password;
  if (!user || !password) {
    return {
      ok: false,
      message:
        "プロキシ URL に認証が含まれていません。例: http://ユーザー名:パスワード@proxy.example.com:8080",
    };
  }
  return { ok: true, proxyUrl, cred: { user, password } };
}
