import { mkdir, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { toolDir } from "../lib/paths";
import installArtifactsToml from "./install-artifacts.toml";
import type { InstallArtifactsToml } from "./install-artifacts.shared";

/** Bun の `*.toml` が `any` に落ちる場合でも、共有スキーマで 1 箇所に型を固定 */
const installConfig: InstallArtifactsToml = installArtifactsToml;

const mvnBase = installConfig.mvn_central.replace(/\/+$/, "");

const ARTIFACTS: readonly { url: string; dir: string; fileName: string }[] =
  installConfig.artifacts.map((a) => {
    const rel = a.artifact_path.replace(/^\/+/, "");
    return {
      url: `${mvnBase}/${rel}`,
      dir: a.dir,
      fileName: a.file_name,
    };
  });

const UNIQUE_INSTALL_DIRS = [...new Set(ARTIFACTS.map((a) => a.dir))];

async function clearToolSubdir(projectRoot: string, subdir: string): Promise<void> {
  const dir = join(toolDir(projectRoot), subdir);
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
 * @param projectRoot tool/ / etc/ などの基点ディレクトリ
 * @param fetchProxy CLI で resolveFetchProxyUrl した結果（未設定なら undefined）
 */
export async function runInstall(projectRoot: string, fetchProxy?: string): Promise<number> {
  await Promise.all(UNIQUE_INSTALL_DIRS.map((d) => clearToolSubdir(projectRoot, d)));
  await Promise.all(UNIQUE_INSTALL_DIRS.map((d) => ensureDir(join(toolDir(projectRoot), d))));

  let fail = false;
  for (const a of ARTIFACTS) {
    if (fail) {
      console.log(`${a.fileName} は前ファイルの DL 失敗のためキャンセルされました。`);
      continue;
    }
    const base = join(toolDir(projectRoot), a.dir);
    const dest = join(base, a.fileName);
    try {
      const res = await fetch(a.url, {
        ...(fetchProxy ? { proxy: fetchProxy } : {}),
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
