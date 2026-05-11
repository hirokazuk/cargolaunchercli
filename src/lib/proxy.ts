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
