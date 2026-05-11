import { resolve } from "node:path";

/** HTA と同じ cargo_launcher JAR バージョン（一元管理） */
export const CARGO_LAUNCHER_VERSION = "2.5.0" as const;

export function cargoLauncherJarFileName(): string {
  return `cargo_launcher-${CARGO_LAUNCHER_VERSION}.jar`;
}

export function resolveProjectRoot(cwdFlag: string | undefined): string {
  return cwdFlag ? resolve(cwdFlag) : process.cwd();
}

export function toolDir(projectRoot: string): string {
  return resolve(projectRoot, "tool");
}

export function toolAntDir(projectRoot: string): string {
  return resolve(projectRoot, "tool", "ant");
}

export function toolAntlibDir(projectRoot: string): string {
  return resolve(projectRoot, "tool", "antlib");
}

export function cargoLauncherJarPath(projectRoot: string): string {
  return resolve(toolDir(projectRoot), cargoLauncherJarFileName());
}

export function antLauncherJarPath(projectRoot: string): string {
  return resolve(toolAntDir(projectRoot), "ant-launcher.jar");
}

export function devBuildXmlPath(projectRoot: string): string {
  return resolve(projectRoot, "etc", "dev_build.xml");
}

export function buildXmlPath(projectRoot: string): string {
  return resolve(projectRoot, "etc", "build.xml");
}
