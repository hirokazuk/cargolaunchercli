/**
 * etc/dev_build.xml 等から <target name="..."> を列挙する純関数。
 * Bun のランタイムに依存せず bun:test でも動かすため正規表現で抽出する。
 */
export function listAntTargetNamesFromXml(xmlContent: string): string[] {
  const names = new Set<string>();
  const re = /<target\b[^>]*\bname\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xmlContent)) !== null) {
    const name = m[1]?.trim();
    if (name) {
      names.add(name);
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
