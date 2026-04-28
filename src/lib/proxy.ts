const DEFAULT_PROXY_HOST_PORT = "proxy.example.com:8080";

/**
 * HTA と同様: http://user:password@host:port
 * ユーザー名・パスワードに含まれる予約文字は encodeURIComponent でエスケープする
 */
export function buildProxyUrlWithCredentials(user: string, password: string, hostPort = DEFAULT_PROXY_HOST_PORT): string {
  const u = encodeURIComponent(user);
  const p = encodeURIComponent(password);
  return `http://${u}:${p}@${hostPort}`;
}

/**
 * fetch の `proxy` 用 URL。
 * - `explicit` があれば優先（既に認証込みでも可）
 * - なければ `HTTPS_PROXY` / `HTTP_PROXY`（Bun が解釈する形式）
 * - それもなければデフォルトホスト + user/password
 */
export function resolveFetchProxyUrl(
  user: string,
  password: string,
  explicit?: string,
): string | undefined {
  if (explicit?.trim()) {
    return explicit.trim();
  }
  const fromEnv = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY;
  if (fromEnv?.trim()) {
    return fromEnv.trim();
  }
  if (!user || !password) {
    return undefined;
  }
  return buildProxyUrlWithCredentials(user, password);
}
