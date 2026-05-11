#!/usr/bin/env bun
import { parseArgs } from "node:util";
import type { Credentials } from "./lib/credentials";
import {
  resolveFetchProxyUrl,
  resolveProxyCredentialsForApp,
  type ResolveProxyCredentialsOptions,
} from "./lib/proxy";
import { resolveProjectRoot } from "./lib/paths";
import { runDoctor } from "./commands/doctor";
import { runInstall } from "./commands/install";
import { runStart } from "./commands/start";
import { runAntList, runAntRun } from "./commands/ant";

/** start / ant run / fullbuild 用。失敗時はメッセージを表示して null */
function requireProxyAuthForApp(
  explicit: string | undefined,
  resolveOpts: ResolveProxyCredentialsOptions,
): { proxyUrl: string; cred: Credentials } | null {
  const r = resolveProxyCredentialsForApp(explicit, resolveOpts);
  if (!r.ok) {
    console.error(r.message);
    return null;
  }
  return { proxyUrl: r.proxyUrl, cred: r.cred };
}

function printHelp(): void {
  console.log(`cargo-launcher — Tomcat11 ランチャー CLI

Usage:
  cargo-launcher [--cwd <dir>] [-h] <command> ...

Global:
  --cwd <dir>   作業ディレクトリ（既定はカレントディレクトリ）
  -h, --help    このヘルプ
  --allow-no-proxy           プロキシ URL が無いときでも start / fullbuild / ant run を続行（認証情報も空）
  --allow-no-credentials     プロキシ URL に user:password@ が無いときでも上記コマンドを続行
  --proxy-url <url>  規定値は $HTTPS_PROXY → $HTTP_PROXY の順で解決。
    install              上記で解決した URL を fetch の proxy に使用（認証なしでも可）。
    start / fullbuild / ant run   解決した URL に user:password@ が含まれること（Java / Ant SVN 用に取り出す）。
    fullbuild / ant run           さらに http_proxy / https_proxy に同じ URL を設定。
    例: http://ユーザー名:パスワード@proxy.example.com:8080

Commands（概要）:
  doctor ・・・ cargo_launcher JAR と Java の確認
    Usage: cargo-launcher [--cwd <dir>] doctor

  install ・・・ Ant ランタイムを Maven Central から取得（tool/ant, tool/antlib）
    Usage: cargo-launcher [--cwd <dir>] [--proxy-url <url>] install

  start ・・・ cargo_launcher JAR でプロセス起動（フォアグラウンド）
    Usage: cargo-launcher [--cwd <dir>] [--proxy-url <url>] start [--log-file <path>] [--delete-log]
      -f, --log-file <path>  ログ相対パス（HTA の「ログファイル」、省略可）
      --delete-log           起動前に該当ログファイルを削除（-f 指定時のみ有効）

  fullbuild ・・・ etc/dev_build.xml の fullbuild（ant run fullbuild と同じ）
    Usage: cargo-launcher [--cwd <dir>] [--proxy-url <url>] fullbuild

  ant list ・・・ Ant の target 名を列挙（dev_build.xml + build.xml）
    Usage: cargo-launcher [--cwd <dir>] ant list

  ant run ・・・ 任意のAnt target を実行（プロキシ環境変数を設定）
    Usage: cargo-launcher [--cwd <dir>] [--proxy-url <url>] ant run <target>

`);
}

/** util.parseArgs の options（コマンド横断で宣言し、strict で安全にパースする） */
const CLI_OPTIONS = {
  cwd: { type: "string" as const },
  help: { type: "boolean" as const, short: "h" as const },
  "log-file": { type: "string" as const, short: "f" as const },
  "proxy-url": { type: "string" as const },
  "delete-log": { type: "boolean" as const },
  "allow-no-proxy": { type: "boolean" as const },
  "allow-no-credentials": { type: "boolean" as const },
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

  const projectRoot = resolveProjectRoot(optString(values.cwd));
  const cmd = positionals[0];
  const tail = positionals.slice(1);
  const proxyExplicit = optString(values["proxy-url"]);
  const resolveProxyOpts: ResolveProxyCredentialsOptions = {
    allowNoProxy: values["allow-no-proxy"] === true,
    allowNoCredentials: values["allow-no-credentials"] === true,
  };

  switch (cmd) {
    case "doctor":
      if (extraArgsError(tail)) {
        return 1;
      }
      return await runDoctor(projectRoot);

    case "install":
      if (extraArgsError(tail)) {
        return 1;
      }
      return await runInstall(projectRoot, resolveFetchProxyUrl(proxyExplicit));

    case "start":
      if (extraArgsError(tail)) {
        return 1;
      }
      {
        const auth = requireProxyAuthForApp(proxyExplicit, resolveProxyOpts);
        if (!auth) {
          return 1;
        }
        return await runStart(projectRoot, {
          logFile: optString(values["log-file"]),
          deleteLog: values["delete-log"] === true,
          cred: auth.cred,
        });
      }

    case "fullbuild":
      if (extraArgsError(tail)) {
        return 1;
      }
      {
        const auth = requireProxyAuthForApp(proxyExplicit, resolveProxyOpts);
        if (!auth) {
          return 1;
        }
        return await runAntRun(projectRoot, "fullbuild", auth.proxyUrl, auth.cred);
      }

    case "ant": {
      const sub = tail[0];
      if (sub === "list") {
        if (extraArgsError(tail.slice(1))) {
          return 1;
        }
        return await runAntList(projectRoot);
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
        const auth = requireProxyAuthForApp(proxyExplicit, resolveProxyOpts);
        if (!auth) {
          return 1;
        }
        return await runAntRun(projectRoot, target, auth.proxyUrl, auth.cred);
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
