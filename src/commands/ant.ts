import type { Credentials } from "../lib/credentials";
import { antLauncherJarPath, buildXmlPath, devBuildXmlPath } from "../lib/paths";
import { resolveFetchProxyUrl } from "../lib/proxy";
import { listAntTargetNamesFromXml } from "../lib/xml-targets";
import { javaBinaryExists, resolveJavaExecutable } from "../lib/java";

export async function runAntList(root: string): Promise<number> {
  const names = new Set<string>();
  for (const path of [devBuildXmlPath(root), buildXmlPath(root)]) {
    const f = Bun.file(path);
    if (await f.exists()) {
      const text = await f.text();
      for (const n of listAntTargetNamesFromXml(text)) {
        names.add(n);
      }
    }
  }
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  for (const n of sorted) {
    console.log(n);
  }
  return 0;
}

/** HTA の antrun() — dev_build.xml + プロキシ環境変数 + svn プロパティ */
export async function runAntRun(
  root: string,
  cred: Credentials,
  target: string,
  proxyUrl?: string,
): Promise<number> {
  if (!cred.password) {
    console.error("パスワードが設定されていません (-p または CARGO_LAUNCHER_PASSWORD)");
    return 1;
  }

  const java = resolveJavaExecutable();
  if (!java.ok || !(await javaBinaryExists(java.javaPath))) {
    console.error("Java が利用できません。cargo-launcher doctor を実行してください。");
    return 1;
  }

  const launcher = antLauncherJarPath(root);
  if (!(await Bun.file(launcher).exists())) {
    console.error(`ant-launcher.jar が見つかりません: ${launcher}`);
    return 1;
  }

  const buildFile = devBuildXmlPath(root);
  if (!(await Bun.file(buildFile).exists())) {
    console.error(`build ファイルが見つかりません: ${buildFile}`);
    return 1;
  }

  console.log(`${target} を実行します`);

  const proxy = resolveFetchProxyUrl(proxyUrl);
  const env: Record<string, string | undefined> = { ...process.env };
  if (proxy) {
    env.http_proxy = proxy;
    env.https_proxy = proxy;
  }

  const proc = Bun.spawn(
    [
      java.javaPath,
      "-jar",
      launcher,
      "-f",
      buildFile,
      target,
      `-Dsvn.user=${cred.user}`,
      `-Dsvn.password=${cred.password}`,
    ],
    {
      cwd: root,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
      env: env as Record<string, string>,
    },
  );

  const code = await proc.exited;
  return typeof code === "number" ? code : 1;
}
