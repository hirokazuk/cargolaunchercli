import { BINARY_NAME } from "../const";
import type { Credentials } from "../lib/credentials";
import { antLauncherJarPath, buildXmlPath, devBuildXmlPath } from "../lib/paths";
import { listAntTargetNamesFromXml } from "../lib/xml-targets";
import { javaBinaryExists, resolveJavaExecutable } from "../lib/java";

async function collectAntTargetNames(projectRoot: string): Promise<string[]> {
  const names = new Set<string>();
  for (const path of [devBuildXmlPath(projectRoot), buildXmlPath(projectRoot)]) {
    const f = Bun.file(path);
    if (await f.exists()) {
      const text = await f.text();
      for (const n of listAntTargetNamesFromXml(text)) {
        names.add(n);
      }
    }
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}

export async function getAntTargetNames(projectRoot: string): Promise<string[]> {
  return collectAntTargetNames(projectRoot);
}

export async function runAntList(projectRoot: string): Promise<number> {
  const sorted = await collectAntTargetNames(projectRoot);
  for (const n of sorted) {
    console.log(n);
  }
  return 0;
}

/** HTA の antrun() — dev_build.xml + プロキシ環境変数 + svn プロパティ */
export async function runAntRun(
  projectRoot: string,
  target: string,
  proxyUrl: string,
  cred: Credentials,
): Promise<number> {
  const java = resolveJavaExecutable();
  if (!java.ok || !(await javaBinaryExists(java.javaPath))) {
    console.error(`Java が利用できません。${BINARY_NAME} doctor を実行してください。`);
    return 1;
  }

  const launcher = antLauncherJarPath(projectRoot);
  if (!(await Bun.file(launcher).exists())) {
    console.error(`ant-launcher.jar が見つかりません: ${launcher}`);
    return 1;
  }

  const buildFile = devBuildXmlPath(projectRoot);
  if (!(await Bun.file(buildFile).exists())) {
    console.error(`build ファイルが見つかりません: ${buildFile}`);
    return 1;
  }

  console.log(`${target} を実行します`);

  const env: Record<string, string | undefined> = { ...process.env };
  if (proxyUrl) {
    env.http_proxy = proxyUrl;
    env.https_proxy = proxyUrl;
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
      cwd: projectRoot,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
      env: env as Record<string, string>,
    },
  );

  const code = await proc.exited;
  return typeof code === "number" ? code : 1;
}
