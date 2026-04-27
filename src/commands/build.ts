import type { Credentials } from "../lib/credentials";
import { antLauncherJarPath, devBuildXmlPath } from "../lib/paths";
import { javaBinaryExists, resolveJavaExecutable } from "../lib/java";

/** HTA の executeBuildApp() — dev_build.xml の fullbuild */
export async function runBuildFull(root: string, cred: Credentials): Promise<number> {
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
    console.error(`ant-launcher.jar が見つかりません: ${launcher}（cargo-launcher install を実行）`);
    return 1;
  }

  const buildFile = devBuildXmlPath(root);
  if (!(await Bun.file(buildFile).exists())) {
    console.error(`build ファイルが見つかりません: ${buildFile}`);
    return 1;
  }

  console.log("ビルドします (fullbuild)");

  const args = [
    java.javaPath,
    "-jar",
    launcher,
    "-f",
    buildFile,
    "fullbuild",
    `-Dsvn.user=${cred.user}`,
    `-Dsvn.password=${cred.password}`,
  ];

  const proc = Bun.spawn(args, {
    cwd: root,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env },
  });

  const code = await proc.exited;
  return typeof code === "number" ? code : 1;
}
