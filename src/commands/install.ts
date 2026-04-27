import { mkdir, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { resolveFetchProxyUrl } from "../lib/proxy";
import type { Credentials } from "../lib/credentials";
import { toolAntDir, toolAntlibDir } from "../lib/paths";

const MVN_CENTRAL = "https://repo1.maven.org/maven2";

const ARTIFACTS: readonly { url: string; dir: "ant" | "antlib"; fileName: string }[] = [
  {
    url: `${MVN_CENTRAL}/org/apache/ant/ant/1.10.15/ant-1.10.15.jar`,
    dir: "ant",
    fileName: "ant.jar",
  },
  {
    url: `${MVN_CENTRAL}/org/apache/ant/ant-launcher/1.10.15/ant-launcher-1.10.15.jar`,
    dir: "ant",
    fileName: "ant-launcher.jar",
  },
  {
    url: `${MVN_CENTRAL}/org/apache/maven/resolver/maven-resolver-ant-tasks/1.5.2/maven-resolver-ant-tasks-1.5.2-uber.jar`,
    dir: "antlib",
    fileName: "maven-resolver-ant-tasks-1.5.2-uber.jar",
  },
];

async function clearAntDir(root: string): Promise<void> {
  const dir = toolAntDir(root);
  try {
    const names = await readdir(dir);
    await Promise.all(names.map((name) => unlink(join(dir, name))));
  } catch {
    /* 無い場合は無視 */
  }
}

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

/**
 * HTA の download(): プロキシ経由 GET、先が失敗したら以降スキップ
 */
export async function runInstall(
  root: string,
  cred: Credentials,
  proxyUrl?: string,
): Promise<number> {
  if (!cred.password) {
    console.error("パスワードが設定されていません (-p または CARGO_LAUNCHER_PASSWORD)");
    return 1;
  }

  await clearAntDir(root);
  await ensureDir(toolAntDir(root));
  await ensureDir(toolAntlibDir(root));

  const proxy = resolveFetchProxyUrl(cred.user, cred.password, proxyUrl);

  let fail = false;
  for (const a of ARTIFACTS) {
    if (fail) {
      console.log(`${a.fileName} は前ファイルの DL 失敗のためキャンセルされました。`);
      continue;
    }
    const base = a.dir === "ant" ? toolAntDir(root) : toolAntlibDir(root);
    const dest = join(base, a.fileName);
    try {
      const res = await fetch(a.url, {
        ...(proxy ? { proxy } : {}),
        redirect: "follow",
      });
      if (!res.ok) {
        console.log(`${a.fileName} 失敗 (status: ${res.status})`);
        fail = true;
        continue;
      }
      await Bun.write(dest, res);
      console.log(`${a.fileName} が保存完了`);
    } catch (e) {
      console.error(`${a.fileName} 失敗:`, e);
      fail = true;
    }
  }

  return fail ? 1 : 0;
}
