import { basename } from "node:path";

import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

import { getDiffInfo, formatDiff, normalizeChangedPath, type DiffInfo } from "./diff.ts";
import { contextColor, fmtCount, trunc, usesSubscription } from "./format.ts";
import { getUsage } from "./usage.ts";
import { getVcsInfo, type VcsInfo } from "./vcs.ts";

export default function piStatus(pi: ExtensionAPI): void {
  function formatVcs(theme: ExtensionContext["ui"]["theme"]): string | undefined {
    if (!vcs.label) return undefined;
    if (vcs.kind === "jj") {
      return `${theme.fg("warning", vcs.shortest)}${theme.fg("dim", vcs.rest)}`;
    }

    return theme.fg("success", vcs.label);
  }

  function formatDiffStats(theme: ExtensionContext["ui"]["theme"]): string {
    if (diff.files === 0 && diff.insertions === 0 && diff.deletions === 0) {
      return theme.fg("dim", formatDiff(diff));
    }

    return [
      theme.fg("warning", `±${diff.files}`),
      theme.fg("success", `+${diff.insertions}`),
      theme.fg("error", `-${diff.deletions}`),
    ].join(" ");
  }

  function formatModel(theme: ExtensionContext["ui"]["theme"], model: string, thinking: string): string {
    const text = trunc(`${model}${thinking}`, 42);
    return thinkingLevel ? theme.getThinkingBorderColor(thinkingLevel)(text) : theme.fg("dim", text);
  }

  let thinkingLevel: ReturnType<ExtensionAPI["getThinkingLevel"]> | undefined;
  let vcs: VcsInfo = { kind: "none", label: "" };
  let diff: DiffInfo = { files: 0, insertions: 0, deletions: 0 };
  const changedPaths = new Set<string>();

  async function refresh(piCtx: ExtensionContext, requestRender?: () => void): Promise<void> {
    vcs = await getVcsInfo(pi, piCtx);
    diff = await getDiffInfo(pi, piCtx, vcs, [...changedPaths].toSorted());

    requestRender?.();
  }

  pi.on("thinking_level_select", async (event) => {
    thinkingLevel = event.level;
  });

  pi.on("tool_call", async (event, ctx) => {
    if (event.toolName !== "edit" && event.toolName !== "write") return;

    const changedPath = normalizeChangedPath(ctx.cwd, event.input as { path?: unknown });
    if (changedPath) changedPaths.add(changedPath);
  });

  pi.on("session_start", async (_event, ctx) => {
    changedPaths.clear();
    thinkingLevel = pi.getThinkingLevel();
    if (!ctx.hasUI) return;

    let disposed = false;
    ctx.ui.setFooter((tui, theme, footerData) => {
      void refresh(ctx, () => tui.requestRender());

      const unsub = footerData.onBranchChange(() => void refresh(ctx, () => tui.requestRender()));
      const interval = setInterval(() => void refresh(ctx, () => tui.requestRender()), 5_000);

      return {
        dispose() {
          disposed = true;
          clearInterval(interval);
          unsub();
        },

        invalidate() {},

        render(width: number): string[] {
          if (disposed) return [""];

          const cwd = basename(ctx.cwd) || ctx.cwd;
          const sessionName = pi.getSessionName();
          const model = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : "no-model";
          const thinking = thinkingLevel ? `/${thinkingLevel}` : "";
          const usage = getUsage(ctx);
          const costText = usesSubscription(ctx.model?.provider)
            ? ""
            : ` $${usage.cost.toFixed(3)}`;
          const usageText = [
            `${theme.fg("accent", "↑")}${theme.fg("dim", fmtCount(usage.input))}`,
            `${theme.fg("success", "↓")}${theme.fg("dim", fmtCount(usage.output))}`,
            costText ? theme.fg("dim", costText.trimStart()) : undefined,
          ]
            .filter((part): part is string => Boolean(part))
            .join(" ");
          const contextWindow = ctx.model?.contextWindow;
          const contextText = usage.context
            ? `${fmtCount(usage.context)}${contextWindow ? `/${fmtCount(contextWindow)}` : ""}`
            : undefined;
          const contextTextColor = usage.context
            ? contextColor(usage.context, contextWindow)
            : "dim";

          const parts = [
            theme.fg("accent", cwd),
            sessionName ? theme.fg("muted", trunc(sessionName, 24)) : undefined,
            formatVcs(theme),
            formatModel(theme, model, thinking),
            usageText,
            contextText ? theme.fg(contextTextColor, contextText) : undefined,
            formatDiffStats(theme),
          ].filter((part): part is string => Boolean(part));

          let line = parts.join(theme.fg("dim", " │ "));
          if (visibleWidth(line) > width) line = truncateToWidth(line, width, "…");

          return [line];
        },
      };
    });
  });

  pi.on("tool_execution_end", async (_event, ctx) => {
    await refresh(ctx);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    changedPaths.clear();
    ctx.ui.setFooter(undefined);
  });
}
