/** `install-artifacts.toml` のスキーマ + default import の型 */

export type InstallArtifactsToml = {
  readonly mvn_central: string;
  readonly artifacts: ReadonlyArray<{
    readonly artifact_path: string;
    /** アーティファクトの識別名（ログ表示などに使用） */
    readonly name: string;
    /** `projectRoot` から見た配置先（例: tool/ant, tool/antlib） */
    readonly dir: string;
    readonly file_name: string;
  }>;
};

/**
 * Bun の `declare module "*.toml"` とぶつからないよう、ファイル名パターンで上書きする。
 * `./install-artifacts.toml` だけだとワイルドカード側に飲まれる。
 */
declare module "*/install-artifacts.toml" {
  const installArtifactsToml: InstallArtifactsToml;
  export = installArtifactsToml;
}
