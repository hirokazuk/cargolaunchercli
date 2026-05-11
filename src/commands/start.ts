import { unlink } from "node:fs/promises";
import { join } from "node:path";
import type { Credentials } from "../lib/credentials";
import { cargoLauncherJarPath } from "../lib/paths";
import { javaBinaryExists, resolveJavaExecutable } from "../lib/java";

export async function runStart(
  projectRoot: string,
  options: { logFile: string; deleteLog: boolean; cred: Credentials },
): Promise<number> {
  const { cred } = options;

  const java = resolveJavaExecutable();
  if (!java.ok || !(await javaBinaryExists(java.javaPath))) {
    console.error("Java が利用できません。cargo-launcher doctor を実行してください。");
    return 1;
  }

  const jar = cargoLauncherJarPath(projectRoot);
  if (!(await Bun.file(jar).exists())) {
    console.error(`cargo_launcher JAR が見つかりません: ${jar}`);
    return 1;
  }

  const logPath = join(projectRoot, options.logFile);
  if (options.deleteLog && (await Bun.file(logPath).exists())) {
    console.log("ログファイルを削除します");
    try {
      await unlink(logPath);
    } catch {
      console.error("ログファイルを削除できませんでした");
      return 1;
    }
  }

  const proc = Bun.spawn(
    [
      java.javaPath,
      "-jar",
      jar,
      "-u",
      cred.user,
      "-p",
      cred.password,
      "-f",
      options.logFile,
    ],
    {
      cwd: projectRoot,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
      env: { ...process.env },
    },
  );

  const code = await proc.exited;
  console.log("tomcat 起動プロセス終了");
  return typeof code === "number" ? code : 1;
}
