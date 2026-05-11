#!/usr/bin/env bun
import { parseArgs } from "node:util";
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
  --proxy-url <url>      fetch のプロキシ（未指定時は $HTTPS_PROXY、なければ $HTTP_PROXY）

start 追加:
  -f, --log-file <path>  ログ相対パス（HTA の「ログファイル」）
  --delete-log           起動前に該当ログファイルを削除

ant run 追加:
  --proxy-url <url>      http_proxy / https_proxy の上書き（未指定時は $HTTPS_PROXY、なければ $HTTP_PROXY）
`);
}

/** util.parseArgs の options（コマンド横断で宣言し、strict で安全にパースする） */
const CLI_OPTIONS = {
  cwd: { type: "string" as const },
  help: { type: "boolean" as const, short: "h" as const },
  user: { type: "string" as const, short: "u" as const },
  password: { type: "string" as const, short: "p" as const },
  "log-file": { type: "string" as const, short: "f" as const },
  "proxy-url": { type: "string" as const },
  "delete-log": { type: "boolean" as const },
};

/** Node の parseArgs が返す values を string に絞る */
function optString(v: string | boolean | (string | boolean)[] | undefined): string | undefined {
  return typeof v === "string" ? v : undefined;
}

function extraArgsError(rest: readonly string[]): boolean {
  if (rest.length > 0) {
    console.error(`余分な引数: ${rest.join(" ")}`);
    return true;
  }
  return false;
}

async function main(): Promise<number> {
  let parsed;
  try {
    parsed = parseArgs({
      args: process.argv.slice(2),
      options: CLI_OPTIONS,
      allowPositionals: true,
      strict: true,
    });
  } catch (e) {
    console.error("引数の解析に失敗しました:", e);
    printHelp();
    return 1;
  }

  const { values, positionals } = parsed;

  if (values.help === true || positionals.length === 0) {
    printHelp();
    return values.help === true ? 0 : 1;
  }

  const root = resolveProjectRoot(optString(values.cwd));
  const cmd = positionals[0];
  const tail = positionals.slice(1);

  const cred = resolveCredentials({
    user: optString(values.user),
    password: optString(values.password),
  });

  switch (cmd) {
    case "doctor":
      if (extraArgsError(tail)) {
        return 1;
      }
      return await runDoctor(root);

    case "install":
      if (extraArgsError(tail)) {
        return 1;
      }
      return await runInstall(root, optString(values["proxy-url"]));

    case "start":
      if (extraArgsError(tail)) {
        return 1;
      }
      const logFile = optString(values["log-file"]);
      if (!logFile) {
        console.error("start には -f / --log-file が必要です");
        return 1;
      }
      return await runStart(root, cred, {
        logFile,
        deleteLog: values["delete-log"] === true,
      });

    case "build":
      if (tail[0] !== "full") {
        console.error('サブコマンドは "build full" のみ対応です');
        return 1;
      }
      if (extraArgsError(tail.slice(1))) {
        return 1;
      }
      return await runBuildFull(root, cred);

    case "ant": {
      const sub = tail[0];
      if (sub === "list") {
        if (extraArgsError(tail.slice(1))) {
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
        if (extraArgsError(tail.slice(2))) {
          return 1;
        }
        return await runAntRun(root, cred, target, optString(values["proxy-url"]));
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
