/** `install-artifacts.toml` のスキーマ + default import の型 */

export type InstallArtifactsToml = {
  readonly mvn_central: string;
  readonly artifacts: ReadonlyArray<{
    readonly artifact_path: string;
    /** `tool/` 直下の相対ディレクトリ名（例: ant, antlib） */
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
