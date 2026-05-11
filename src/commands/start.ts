import { unlink } from "node:fs/promises";
import { join } from "node:path";
import { cargoLauncherJarPath } from "../lib/paths";
import { resolveProxyCredentialsForApp } from "../lib/proxy";
import { javaBinaryExists, resolveJavaExecutable } from "../lib/java";

export async function runStart(
  root: string,
  options: { logFile: string; deleteLog: boolean; proxyExplicit?: string },
): Promise<number> {
  const resolved = resolveProxyCredentialsForApp(options.proxyExplicit);
  if (!resolved.ok) {
    console.error(resolved.message);
    return 1;
  }
  const { cred } = resolved;

  const java = resolveJavaExecutable();
  if (!java.ok || !(await javaBinaryExists(java.javaPath))) {
    console.error("Java が利用できません。cargo-launcher doctor を実行してください。");
    return 1;
  }

  const jar = cargoLauncherJarPath(root);
  if (!(await Bun.file(jar).exists())) {
    console.error(`cargo_launcher JAR が見つかりません: ${jar}`);
    return 1;
  }

  const logPath = join(root, options.logFile);
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
      cwd: root,
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
