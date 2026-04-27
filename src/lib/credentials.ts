export type Credentials = { user: string; password: string };

export function defaultUsername(): string {
  return (
    process.env.CARGO_LAUNCHER_USER ??
    process.env.USER ??
    process.env.USERNAME ??
    ""
  );
}

export function resolveCredentials(flags: {
  user?: string;
  password?: string;
}): Credentials {
  return {
    user: flags.user ?? defaultUsername(),
    password: flags.password ?? process.env.CARGO_LAUNCHER_PASSWORD ?? "",
  };
}
