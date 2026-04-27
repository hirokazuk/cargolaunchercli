import { join } from "node:path";

export type JavaResolution =
  | { ok: true; javaPath: string; source: "JAVA21_HOME" | "JAVA_HOME" | "PATH" }
  | { ok: false };

const javaExe = process.platform === "win32" ? "java.exe" : "java";

/**
 * HTA の setTargetJavaHomeAndJavaBin に相当: JAVA21_HOME → JAVA_HOME → PATH の java
 */
export function resolveJavaExecutable(): JavaResolution {
  const j21 = process.env.JAVA21_HOME;
  if (j21) {
    const p = join(j21, "bin", javaExe);
    return { ok: true, javaPath: p, source: "JAVA21_HOME" };
  }
  const jh = process.env.JAVA_HOME;
  if (jh) {
    const p = join(jh, "bin", javaExe);
    return { ok: true, javaPath: p, source: "JAVA_HOME" };
  }
  const which = Bun.which("java");
  if (which) {
    return { ok: true, javaPath: which, source: "PATH" };
  }
  return { ok: false };
}

export async function javaBinaryExists(javaPath: string): Promise<boolean> {
  return Bun.file(javaPath).exists();
}
