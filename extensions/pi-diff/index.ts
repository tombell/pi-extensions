import { relative, resolve } from "node:path";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

import { Box, Text } from "@earendil-works/pi-tui";

const CUSTOM_TYPE = "pi-diff";
const MAX_DIFF_CHARS = 60_000;

type MaybePathInput = { path?: unknown };

function normalizeChangedPath(cwd: string, path: unknown): string | undefined {
  if (typeof path !== "string" || path.trim() === "") return undefined;

  const withoutAt = path.startsWith("@") ? path.slice(1) : path;
  const absolutePath = resolve(cwd, withoutAt);
  const relativePath = relative(cwd, absolutePath);

  if (relativePath === "" || relativePath.startsWith("..")) return undefined;

  return relativePath;
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

function parseArgs(args: string): { all: boolean; stat: boolean } {
  const tokens = new Set(args.trim().split(/\s+/).filter(Boolean));

  return {
    all: tokens.has("--all") || tokens.has("all"),
    stat: tokens.has("--stat") || tokens.has("stat"),
  };
}

async function isGitRepository(pi: ExtensionAPI, ctx: ExtensionContext): Promise<boolean> {
  const result = await pi.exec("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd: ctx.cwd,
    signal: ctx.signal,
    timeout: 5_000,
  });

  return result.code === 0 && result.stdout.trim() === "true";
}

async function buildDiff(pi: ExtensionAPI, ctx: ExtensionContext, paths: string[], stat: boolean) {
  const args = ["diff", "--no-ext-diff", "--color=never"];
  if (stat) args.push("--stat");
  if (paths.length > 0) args.push("--", ...paths);

  return pi.exec("git", args, { cwd: ctx.cwd, signal: ctx.signal, timeout: 30_000 });
}

function showDiff(pi: ExtensionAPI, ctx: ExtensionContext, title: string, diff: string): void {
  const truncated = diff.length > MAX_DIFF_CHARS;
  const content = truncated
    ? `${diff.slice(0, MAX_DIFF_CHARS)}\n\n… diff truncated at ${MAX_DIFF_CHARS.toLocaleString()} characters.`
    : diff;

  pi.sendMessage({
    customType: CUSTOM_TYPE,
    display: true,
    content: `## ${title}\n\n\`\`\`diff\n${content || "No diff."}\n\`\`\``,
    details: { diff: content || "No diff.", title, truncated },
  });
}

function colorizeDiffLine(line: string, theme: ExtensionContext["ui"]["theme"]): string {
  if (line.startsWith("+++ ") || line.startsWith("--- ")) return theme.fg("accent", line);
  if (line.startsWith("+")) return theme.fg("success", line);
  if (line.startsWith("-")) return theme.fg("error", line);
  if (line.startsWith("@@")) return theme.fg("warning", line);
  if (line.startsWith("diff --git")) return theme.fg("accent", line);
  if (line.startsWith("index ") || line.startsWith("new file") || line.startsWith("deleted file")) {
    return theme.fg("dim", line);
  }
  return line;
}

export default function piDiff(pi: ExtensionAPI): void {
  const changedPaths = new Set<string>();

  pi.registerMessageRenderer(CUSTOM_TYPE, (message, _options, theme) => {
    const details = message.details as { diff?: string; title?: string } | undefined;
    const title = details?.title ?? "Diff";
    const diff = details?.diff ?? (typeof message.content === "string" ? message.content : "");
    const rendered = [
      theme.fg("accent", `▸ ${title}`),
      "",
      ...diff.split("\n").map((line: string) => colorizeDiffLine(line, theme)),
    ].join("\n");

    const box = new Box(1, 1, (text: string) => theme.bg("customMessageBg", text));
    box.addChild(new Text(rendered, 0, 0));
    return box;
  });

  function rememberPath(ctx: ExtensionContext, input: MaybePathInput): void {
    const changedPath = normalizeChangedPath(ctx.cwd, input.path);
    if (changedPath) changedPaths.add(changedPath);
  }

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "edit" && event.toolName !== "write") return;
    rememberPath(ctx, event.input as MaybePathInput);
  });

  pi.on("session_start", async (_event, ctx) => {
    changedPaths.clear();
    ctx.ui.setStatus("pi-diff", "diff: 0 files");
  });

  pi.on("tool_execution_end", async (_event, ctx) => {
    ctx.ui.setStatus("pi-diff", `diff: ${changedPaths.size} files`);
  });

  pi.registerCommand("diff", {
    description:
      "Show git diff for files edited/written by pi in this session (use 'all' for every dirty file, 'stat' for summary)",
    handler: async (args, ctx) => {
      await ctx.waitForIdle();

      const options = parseArgs(args);
      if (!(await isGitRepository(pi, ctx))) {
        ctx.ui.notify("/diff only works inside a git repository.", "error");
        return;
      }

      const trackedPaths = [...changedPaths].toSorted();
      const paths = options.all || trackedPaths.length === 0 ? [] : trackedPaths;
      const usedFallback = !options.all && trackedPaths.length === 0;

      const result = await buildDiff(pi, ctx, paths, options.stat);
      const output = result.stdout || result.stderr;
      if (result.code !== 0) {
        ctx.ui.notify(`git diff failed: ${output.trim() || `exit code ${result.code}`}`, "error");
        return;
      }

      const scope = options.all
        ? "all dirty files"
        : usedFallback
          ? "all dirty files (no session-tracked files yet)"
          : `${paths.length} session file${paths.length === 1 ? "" : "s"}`;
      showDiff(pi, ctx, `Diff for ${scope}`, output);
    },
  });

  pi.registerCommand("changed-files", {
    description: "List files edited/written by pi in this session",
    handler: async (_args, ctx) => {
      const files = [...changedPaths].toSorted();
      ctx.ui.notify(
        files.length
          ? files.map(shellQuote).join(" ")
          : "No files edited or written by pi in this session yet.",
        "info",
      );
    },
  });
}
