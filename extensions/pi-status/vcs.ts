import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

export type VcsInfo =
  | { kind: "jj"; shortest: string; rest: string; label: string }
  | { kind: "git"; label: string }
  | { kind: "none"; label: string };

function findUp(cwd: string, name: string): string | undefined {
  let current = cwd;

  while (true) {
    const candidate = join(current, name);
    if (existsSync(candidate)) return candidate;

    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

export async function getVcsInfo(pi: ExtensionAPI, ctx: ExtensionContext): Promise<VcsInfo> {
  if (findUp(ctx.cwd, ".jj")) {
    const result = await pi.exec(
      "jj",
      [
        "log",
        "--ignore-working-copy",
        "--no-graph",
        "--color",
        "never",
        "-r",
        "@",
        "-T",
        'change_id.shortest() ++ "|" ++ change_id.short(4)',
      ],
      {
        cwd: ctx.cwd,
        timeout: 5_000,
      },
    );
    const [shortest = "", short4 = ""] = result.stdout.trim().split("|");
    const rest = short4.slice(shortest.length);
    const label = `${shortest}${rest}`;

    return { kind: "jj", shortest, rest, label: label || "@" };
  }

  if (findUp(ctx.cwd, ".git")) {
    const result = await pi.exec("git", ["branch", "--show-current"], {
      cwd: ctx.cwd,
      timeout: 5_000,
    });
    const branch = result.stdout.trim();

    return { kind: "git", label: branch || "detached" };
  }

  return { kind: "none", label: "" };
}
