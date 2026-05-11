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

export type ResolveProxyCredentialsOptions = {
  /** プロキシ URL が解決できないときでも成功させ、proxyUrl / cred を空にする */
  allowNoProxy?: boolean;
  /** URL に user / password が無い（または片方だけ）ときでも成功させ、取り出せた分だけ cred に入れる */
  allowNoCredentials?: boolean;
};

/**
 * start / fullbuild / ant run 用: 解決したプロキシ URL から userinfo を取り出す。
 * 既定では URL 未設定または認証欠如のときは失敗。
 */
export function resolveProxyCredentialsForApp(
  explicit?: string,
  opts?: ResolveProxyCredentialsOptions,
): ProxyCredentialsResult {
  const proxyUrl = resolveFetchProxyUrl(explicit);
  if (!proxyUrl) {
    if (opts?.allowNoProxy) {
      return { ok: true, proxyUrl: "", cred: { user: "", password: "" } };
    }
    return {
      ok: false,
      message:
        "プロキシが未設定です。--proxy-url を指定するか、HTTPS_PROXY（または HTTP_PROXY）を設定するか、--allow-no-proxy を付けてください。",
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
    if (opts?.allowNoCredentials) {
      return { ok: true, proxyUrl, cred: { user, password } };
    }
    return {
      ok: false,
      message:
        "プロキシ URL に認証が含まれていません。例: http://ユーザー名:パスワード@proxy.example.com:8080（許容する場合は --allow-no-credentials）",
    };
  }
  return { ok: true, proxyUrl, cred: { user, password } };
}
