import { mkdir, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { resolveFetchProxyUrl } from "../lib/proxy";
import { toolAntDir, toolAntlibDir } from "../lib/paths";
import installArtifactsToml from "./install-artifacts.toml";
import type { ArtifactDirToml, InstallArtifactsToml } from "./install-artifacts.shared";

/** Bun の `*.toml` が `any` に落ちる場合でも、共有スキーマで 1 箇所に型を固定 */
const installConfig: InstallArtifactsToml = installArtifactsToml;

const mvnBase = installConfig.mvn_central.replace(/\/+$/, "");

const ARTIFACTS: readonly { url: string; dir: ArtifactDirToml; fileName: string }[] =
  installConfig.artifacts.map((a) => {
    if (a.dir !== "ant" && a.dir !== "antlib") {
      throw new Error(`install-artifacts.toml: invalid dir "${String(a.dir)}"`);
    }
    const rel = a.artifact_path.replace(/^\/+/, "");
    return {
      url: `${mvnBase}/${rel}`,
      dir: a.dir,
      fileName: a.file_name,
    };
  });

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
export async function runInstall(root: string, proxyUrl?: string): Promise<number> {
  await clearAntDir(root);
  await ensureDir(toolAntDir(root));
  await ensureDir(toolAntlibDir(root));

  const proxy = resolveFetchProxyUrl(proxyUrl);

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
