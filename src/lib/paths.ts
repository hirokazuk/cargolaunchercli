import { resolve } from "node:path";

/** HTA と同じ cargo_launcher JAR バージョン（一元管理） */
export const CARGO_LAUNCHER_VERSION = "2.5.0" as const;

export function cargoLauncherJarFileName(): string {
  return `cargo_launcher-${CARGO_LAUNCHER_VERSION}.jar`;
}

export function resolveProjectRoot(cwdFlag: string | undefined): string {
  return cwdFlag ? resolve(cwdFlag) : process.cwd();
}

export function toolDir(root: string): string {
  return resolve(root, "tool");
}

export function toolAntDir(root: string): string {
  return resolve(root, "tool", "ant");
}

export function toolAntlibDir(root: string): string {
  return resolve(root, "tool", "antlib");
}

export function cargoLauncherJarPath(root: string): string {
  return resolve(toolDir(root), cargoLauncherJarFileName());
}

export function antLauncherJarPath(root: string): string {
  return resolve(toolAntDir(root), "ant-launcher.jar");
}

export function devBuildXmlPath(root: string): string {
  return resolve(root, "etc", "dev_build.xml");
}

export function buildXmlPath(root: string): string {
  return resolve(root, "etc", "build.xml");
}
