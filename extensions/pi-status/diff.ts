import { relative, resolve } from "node:path";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

import type { VcsInfo } from "./vcs.ts";

export type DiffInfo = {
  files: number;
  insertions: number;
  deletions: number;
};

type MaybePathInput = { path?: unknown };

function emptyDiff(): DiffInfo {
  return { files: 0, insertions: 0, deletions: 0 };
}

function parseShortStat(output: string): DiffInfo {
  const files = Number(output.match(/(\d+) files? changed/)?.[1] ?? 0);
  const insertions = Number(output.match(/(\d+) insertions?/)?.[1] ?? 0);
  const deletions = Number(output.match(/(\d+) deletions?/)?.[1] ?? 0);

  return { files, insertions, deletions };
}

function parseJjStat(output: string): DiffInfo {
  let files = 0;
  let insertions = 0;
  let deletions = 0;

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^\s*\S+\s+\|\s+(\d+)\s+([+-]*)/);
    if (!match) continue;

    files++;
    for (const char of match[2] ?? "") {
      if (char === "+") insertions++;
      if (char === "-") deletions++;
    }
  }

  return { files, insertions, deletions };
}

export function formatDiff(info: DiffInfo): string {
  if (info.files === 0 && info.insertions === 0 && info.deletions === 0) return "±0";

  return `±${info.files} +${info.insertions} -${info.deletions}`;
}

export function normalizeChangedPath(cwd: string, input: MaybePathInput): string | undefined {
  if (typeof input.path !== "string" || input.path.trim() === "") return undefined;

  const withoutAt = input.path.startsWith("@") ? input.path.slice(1) : input.path;
  const absolutePath = resolve(cwd, withoutAt);
  const relativePath = relative(cwd, absolutePath);

  if (relativePath === "" || relativePath.startsWith("..")) return undefined;

  return relativePath;
}

export async function getDiffInfo(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  vcs: VcsInfo,
  paths: string[],
): Promise<DiffInfo> {
  if (paths.length === 0) return emptyDiff();

  if (vcs.kind === "jj") {
    const result = await pi.exec("jj", ["diff", "--stat", "--", ...paths], {
      cwd: ctx.cwd,
      timeout: 10_000,
    });

    return result.code === 0 ? parseJjStat(result.stdout) : emptyDiff();
  }

  if (vcs.kind === "git") {
    const result = await pi.exec("git", ["diff", "--shortstat", "--", ...paths], {
      cwd: ctx.cwd,
      timeout: 10_000,
    });

    return result.code === 0 ? parseShortStat(result.stdout) : emptyDiff();
  }

  return emptyDiff();
}
