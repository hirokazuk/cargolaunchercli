#!/usr/bin/env bun
import { resolveCredentials } from "./lib/credentials";
import { resolveProjectRoot } from "./lib/paths";
import { runDoctor } from "./commands/doctor";
import { runInstall } from "./commands/install";
import { runStart } from "./commands/start";
import { runBuildFull } from "./commands/build";
import { runAntList, runAntRun } from "./commands/ant";

function printHelp(): void {
  console.log(`cargo-launcher — Tomcat11 ランチャー CLI

Usage:
  cargo-launcher [--cwd <dir>] <command> ...

Global:
  --cwd <dir>   作業ディレクトリ（既定はカレントディレクトリ）
  -h, --help    このヘルプ

Commands:
  doctor              cargo_launcher JAR と Java の確認
  install             Ant ランタイムを Maven Central から取得（tool/ant, tool/antlib）
  start               cargo_launcher JAR でプロセス起動（フォアグラウンド）
  build full          etc/dev_build.xml の fullbuild
  ant list            Ant の target 名を列挙（dev_build.xml + build.xml）
  ant run <target>    任意 target を実行（プロキシ環境変数を設定）

共通オプション（認証）:
  -u, --user             ユーザー名（既定: $CARGO_LAUNCHER_USER / $USER / $USERNAME）
  -p, --password         パスワード（既定: $CARGO_LAUNCHER_PASSWORD）

install 追加:
  --proxy-url <url>      fetch のプロキシ（既定: $HTTPS_PROXY / $HTTP_PROXY、なければ HTA 相当のホスト + 認証）

start 追加:
  -f, --log-file <path>  ログ相対パス（HTA の「ログファイル」）
  --delete-log           起動前に該当ログファイルを削除

ant run 追加:
  --proxy-url <url>      http_proxy / https_proxy の上書き（未指定時は install と同じ解決）
`);
}

type ParsedGlobal = { cwd?: string; help: boolean; argv: string[] };

function parseGlobal(argv: string[]): ParsedGlobal {
  const out: string[] = [];
  let cwd: string | undefined;
  let help = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--cwd" && argv[i + 1]) {
      cwd = argv[++i];
      continue;
    }
    if (a === "-h" || a === "--help") {
      help = true;
      continue;
    }
    out.push(a);
  }
  return { cwd, help, argv: out };
}

type CredFlags = { user?: string; password?: string };

/** -u / -p を剥がし、残りを返す */
function parseCredFlags(args: string[]): { credFlags: CredFlags; rest: string[] } {
  const rest: string[] = [];
  const credFlags: CredFlags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === "-u" || a === "--user") && args[i + 1]) {
      credFlags.user = args[++i];
      continue;
    }
    if ((a === "-p" || a === "--password") && args[i + 1]) {
      credFlags.password = args[++i];
      continue;
    }
    rest.push(a);
  }
  return { credFlags, rest };
}

function parseProxyUrl(args: string[]): { proxyUrl?: string; rest: string[] } {
  const rest: string[] = [];
  let proxyUrl: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--proxy-url" && args[i + 1]) {
      proxyUrl = args[++i];
      continue;
    }
    rest.push(a);
  }
  return { proxyUrl, rest };
}

function parseStartArgs(args: string[]): {
  logFile?: string;
  deleteLog: boolean;
  credFlags: CredFlags;
  rest: string[];
} {
  let logFile: string | undefined;
  let deleteLog = false;
  const rest: string[] = [];
  const credFlags: CredFlags = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if ((a === "-f" || a === "--log-file") && args[i + 1]) {
      logFile = args[++i];
      continue;
    }
    if (a === "--delete-log") {
      deleteLog = true;
      continue;
    }
    if ((a === "-u" || a === "--user") && args[i + 1]) {
      credFlags.user = args[++i];
      continue;
    }
    if ((a === "-p" || a === "--password") && args[i + 1]) {
      credFlags.password = args[++i];
      continue;
    }
    rest.push(a);
  }
  return { logFile, deleteLog, credFlags, rest };
}

async function main(): Promise<number> {
  const raw = process.argv.slice(2);
  const g = parseGlobal(raw);
  if (g.help || g.argv.length === 0) {
    printHelp();
    return g.help ? 0 : 1;
  }

  const root = resolveProjectRoot(g.cwd);
  const [cmd, ...tail] = g.argv;

  switch (cmd) {
    case "doctor": {
      if (tail.length > 0 && (tail[0] === "-h" || tail[0] === "--help")) {
        printHelp();
        return 0;
      }
      return await runDoctor(root);
    }

    case "install": {
      const { proxyUrl, rest } = parseProxyUrl(tail);
      const { credFlags, rest: r2 } = parseCredFlags(rest);
      if (r2.length > 0) {
        console.error(`余分な引数: ${r2.join(" ")}`);
        return 1;
      }
      const cred = resolveCredentials(credFlags);
      return await runInstall(root, cred, proxyUrl);
    }

    case "start": {
      const { logFile, deleteLog, credFlags, rest } = parseStartArgs(tail);
      if (rest.length > 0) {
        console.error(`余分な引数: ${rest.join(" ")}`);
        return 1;
      }
      if (!logFile) {
        console.error("start には -f / --log-file が必要です");
        return 1;
      }
      const cred = resolveCredentials(credFlags);
      return await runStart(root, cred, { logFile, deleteLog });
    }

    case "build": {
      if (tail[0] !== "full") {
        console.error('サブコマンドは "build full" のみ対応です');
        return 1;
      }
      const { credFlags, rest } = parseCredFlags(tail.slice(1));
      if (rest.length > 0) {
        console.error(`余分な引数: ${rest.join(" ")}`);
        return 1;
      }
      const cred = resolveCredentials(credFlags);
      return await runBuildFull(root, cred);
    }

    case "ant": {
      const sub = tail[0];
      if (sub === "list") {
        const extra = tail.slice(1);
        if (extra.length > 0) {
          console.error(`余分な引数: ${extra.join(" ")}`);
          return 1;
        }
        return await runAntList(root);
      }
      if (sub === "run") {
        const target = tail[1];
        if (!target) {
          console.error("ant run <target> で target を指定してください");
          return 1;
        }
        const afterTarget = tail.slice(2);
        const { proxyUrl, rest } = parseProxyUrl(afterTarget);
        const { credFlags, rest: r2 } = parseCredFlags(rest);
        if (r2.length > 0) {
          console.error(`余分な引数: ${r2.join(" ")}`);
          return 1;
        }
        const cred = resolveCredentials(credFlags);
        return await runAntRun(root, cred, target, proxyUrl);
      }
      console.error('ant のサブコマンドは "list" または "run <target>" です');
      return 1;
    }

    default:
      console.error(`不明なコマンド: ${cmd}`);
      printHelp();
      return 1;
  }
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
