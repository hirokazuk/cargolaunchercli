# cargoLauncher.hta 仕様書

## 概要

Windows HTA（HTML Applications）で動作する **Tomcat11 ランチャー** の UI。ActiveX（`WScript.Shell`、`FileSystemObject`、`Msxml2.ServerXMLHTTP`、`Adodb.Stream`、`Microsoft.XMLDOM`）を用いて、プロキシ経由のダウンロード、Ant ビルド、および `cargo_launcher` JAR の起動を行う。

- **ウィンドウタイトル**: `Tomcat11ランチャー`
- **HTA**: `APPLICATIONNAME="downloader"`, `ID="cargoLauncher"`, アイコン `htasamp.ico`
- **エンコーディング**: `Shift_JIS`（メタタグ）

## 起動時の環境

| 項目 | 内容 |
|------|------|
| カレントディレクトリ | HTA ファイルがあるディレクトリ（`location.pathname` 基準） |
| ウィンドウ | 480×480 ピクセル、画面座標 (100, 100) |

## Java の解決順

1. ユーザ環境変数 `JAVA21_HOME` があれば、その下の `bin` を `java.exe` の参照先にする。
2. なければ `JAVA_HOME` の `bin` を使う。
3. どちらも無い場合は `javaBin` が空になり、起動コマンドが不正になる可能性がある。

## バージョン・成果物名

| 変数 | 値（現行コード） |
|------|------------------|
| `cargo_launcher_version` | `2.5.0` |
| `cargo_launcher_jar` | `cargo_launcher-2.5.0.jar` |

`document.title` には `JDK` と `javaVersion` を連結するが、**`javaVersion` はどこでも代入されておらず常に空文字**。

## ネットワーク（プロキシ）

- HTTP クライアント（`ServerXMLHTTP`）: プロキシ `proxy.pal.local:8080`、認証は UI のユーザ名／パスワードを使用。
- Ant 実行時（`antrun`）: プロセス環境に `http_proxy` / `https_proxy` を  
  `http://<user>:<password>@proxy.pal.local:8080` 形式で設定。

## UI 構成

### 1. インストール

- **ユーザ名**（テキスト）: 初期値は起動時に `%USERNAME%` で設定。
- **パスワード**（パスワード）: 空のままだと「ダウンロード＆インストール」はアラートで中断。
- **ダウンロード＆インストール** ボタン → `download()` を実行。

### 2. Tomcat 起動

- **ログファイル**: テキスト入力（相対パス `./` 配下のファイル名想定）。
- **削除してから実行**: チェック時、`./<ログファイル名>` が存在すれば削除してから起動を続行。削除失敗時はメッセージを出して `execute()` を打ち切り。
- **フルビルド** → `executeBuildApp()`。
- **ビルド結果表示モード**: オンならビルドを `cmd /k` で端末を閉じずに実行。
- **Tomcat起動** → `execute()`。

### 3. Ant の実行

- `<select id="targetList">`: `etc/dev_build.xml` と `etc/build.xml` から `<target name="...">` を列挙し、名前でソートして option 化（`installed()` → `antread()`）。
- **実行** → 選択中ターゲットで `antrun()`。

### 4. ログ一覧

- `<ul id="list">`: `output()` で処理状況を HTML リストとして追記。

## 処理フロー

### `installed()`（`onload`）

- `./tool/<cargo_launcher_jar>` の有無をメッセージ表示。
- ユーザ名を環境から設定、パスワード欄にフォーカス、`antread()` でターゲット一覧構築。

### `download()`

前提: パスワード非空。

1. `./tool/ant/*` を削除（既存 Ant 関連 JAR を掃除）。
2. Maven Central（`https://repo1.maven.org/maven2`）から以下をバイナリ GET して保存:

   | 保存先ディレクトリ | ファイル名 |
   |-------------------|-------------|
   | `./tool/ant/` | `ant-1.10.15` 系 → `ant.jar`, `ant-launcher.jar` |
   | `./tool/antlib/` | `maven-resolver-ant-tasks-1.5.2-uber.jar` |

3. いずれかが失敗（HTTP 200 以外等）すると以降のダウンロードはスキップされ、キャンセル扱いのメッセージを出す。

**注意**: この処理は **`cargo_launcher_jar` 自体はダウンロードしない**。`installed()` が参照する `./tool/<cargo_launcher_jar>` は、別途配置が前提になる。

### `execute()`

1. オプションでログ削除（上記）。
2. `wshShell.Run` で `launch()` が返すコマンドラインを実行。
3. リストに「tomcat起動シェルを実行」と出力。

### `launch(user, password, logfile)`

生成されるコマンドの概形:

```text
cmd /q /k title <長い空白> & <javaBin>\java.exe -jar ./tool/<cargo_launcher_jar> -u <user> -p <password> -f <logfile>
```

- `title` 用にスペースを 200 文字分連結（見た目用のワイドタイトル）。

### `executeBuildApp()`（フルビルド）

```text
[<cmd /k > オプション] <javaBin>\java.exe -jar tool/ant/ant-launcher.jar -f etc/dev_build.xml fullbuild -Dsvn.user=... -Dsvn.password=...
```

- 「ビルド結果表示モード」がオンのとき先頭に `cmd /k ` が付く。

### `build(target)`

```text
<javaBin>\java.exe -jar tool/ant/ant-launcher.jar -f etc/dev_build.xml <target>
```

### `antrun()`

- 選択ターゲット名で `build(targetName)`。
- プロセス環境の `http_proxy` / `https_proxy` を設定したうえで、  
  `cmd /k` + Ant コマンド + `-Dsvn.user` / `-Dsvn.password` を実行。

## 依存ファイル・ディレクトリ（想定）

| パス | 役割 |
|------|------|
| `./tool/<cargo_launcher_jar>` | Tomcat 起動用 JAR（起動・存在チェックの対象） |
| `./tool/ant/ant-launcher.jar` 等 | `download()` で取得される Ant ランタイム |
| `etc/dev_build.xml` | フルビルドおよび Ant ターゲット列挙のベース |
| `etc/build.xml` | Ant ターゲット列挙の追加元 |

## 既知の実装上の注意

- **`javaVersion` 未設定**により、タイトルバーの JDK 表示は実質意味を持たない。
- **`download()` は `cargo_launcher` JAR を取得しない**のに、`installed()` はその JAR の有無を表示する。運用では手動コピーや別手順が必要。
- `./tool/ant/*` 削除で、ワイルドカードが空のときの挙動は Windows / FSO の仕様に依存。

## 文字コード

ソース上の表示文字列・コメントは主に日本語。ファイルは Shift_JIS 宣言の HTML として解釈される前提。
