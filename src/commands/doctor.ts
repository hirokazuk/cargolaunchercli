import { BINARY_NAME } from "../const";
import { cargoLauncherJarFileName, cargoLauncherJarPath } from "../lib/paths";
import { javaBinaryExists, resolveJavaExecutable } from "../lib/java";
import { listExpectedInstallArtifacts } from "./install";

export async function runDoctor(projectRoot: string): Promise<number> {
  let installArtifactsOk = true;

  const jarPath = cargoLauncherJarPath(projectRoot);
  const jarName = cargoLauncherJarFileName();
  const jarOk = await Bun.file(jarPath).exists();
  console.log(jarOk ? `${jarName} はインストール済み (${jarPath})` : `${jarName} は未配置 (${jarPath})`);

  console.log("install-artifacts.toml に基づく成果物:");
  for (const { name, absPath } of listExpectedInstallArtifacts(projectRoot)) {
    const ok = await Bun.file(absPath).exists();
    console.log(ok ? `  ${name}: OK (${absPath})` : `  ${name}: 未配置 (${absPath})`);
    if (!ok) {
      installArtifactsOk = false;
    }
  }

  const j = resolveJavaExecutable();
  if (!j.ok) {
    console.log("Java: 解決できません (JAVA21_HOME / JAVA_HOME / PATH の java を確認してください)");
    return 1;
  }
  const exists = await javaBinaryExists(j.javaPath);
  if (!exists) {
    console.log(`Java: ${j.source} → ${j.javaPath} は存在しません`);
    return 1;
  }
  console.log(`Java: ${j.source} → ${j.javaPath}`);

  if (!installArtifactsOk) {
    console.log(`不足がある場合は ${BINARY_NAME} install を実行してください。`);
    return 1;
  }
  return 0;
}
