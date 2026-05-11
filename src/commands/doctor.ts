import { cargoLauncherJarFileName, cargoLauncherJarPath } from "../lib/paths";
import { javaBinaryExists, resolveJavaExecutable } from "../lib/java";

export async function runDoctor(projectRoot: string): Promise<number> {
  const jarPath = cargoLauncherJarPath(projectRoot);
  const jarName = cargoLauncherJarFileName();
  const jarOk = await Bun.file(jarPath).exists();
  console.log(jarOk ? `${jarName} はインストール済み (${jarPath})` : `${jarName} は未配置 (${jarPath})`);

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
  return 0;
}
