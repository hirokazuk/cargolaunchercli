/** `install-artifacts.toml` のスキーマ + default import の型 */

export type ArtifactDirToml = "ant" | "antlib";

export type InstallArtifactsToml = {
  readonly mvn_central: string;
  readonly artifacts: ReadonlyArray<{
    readonly artifact_path: string;
    readonly dir: ArtifactDirToml;
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
