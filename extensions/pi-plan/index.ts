import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";

import { isSafeReadOnlyCommand } from "./utils.ts";

const PLAN_MODE_TOOLS = ["read", "grep", "find", "ls", "bash"];
const PLAN_MODE_PROMPT = `[PLAN MODE ACTIVE]
You are in plan mode. Your job is to investigate and propose a plan only.

Rules:
- Do not modify files or system state.
- Do not call edit or write.
- Bash is read-only and restricted to safe inspection commands.
- Read and inspect as needed, ask clarifying questions if needed, then provide a concise plan.
- Do not execute the plan until the user disables plan mode or explicitly asks after plan mode is off.`;

export default function planMode(pi: ExtensionAPI): void {
  let enabled = false;
  let previousTools: string[] | undefined;

  pi.registerFlag("plan", {
    description: "Start in plan mode (read-only planning; no file modifications)",
    type: "boolean",
    default: false,
  });

  function setStatus(ctx: ExtensionContext): void {
    ctx.ui.setStatus("plan-mode", enabled ? ctx.ui.theme.fg("warning", "⏸ plan") : undefined);
  }

  function activeToolsArePlanMode(): boolean {
    const active = pi.getActiveTools().toSorted();
    const plan = PLAN_MODE_TOOLS.toSorted();
    return active.length === plan.length && active.every((name, index) => name === plan[index]);
  }

  function persistState(): void {
    pi.appendEntry("plan-mode-state", { enabled });
  }

  function enable(ctx: ExtensionContext, silent = false): void {
    if (enabled && activeToolsArePlanMode()) return;
    const activeTools = pi.getActiveTools();
    if (!activeToolsArePlanMode()) previousTools = activeTools;
    enabled = true;
    pi.setActiveTools(PLAN_MODE_TOOLS);
    setStatus(ctx);
    persistState();
    if (!silent) ctx.ui.notify("Plan mode enabled: file-modifying tools are disabled.", "info");
  }

  function disable(ctx: ExtensionContext, silent = false): void {
    enabled = false;
    pi.setActiveTools(
      previousTools?.length ? previousTools : pi.getAllTools().map((tool) => tool.name),
    );
    previousTools = undefined;
    setStatus(ctx);
    persistState();
    if (!silent) ctx.ui.notify("Plan mode disabled: previous tools restored.", "info");
  }

  function toggle(ctx: ExtensionContext): void {
    if (enabled || activeToolsArePlanMode()) disable(ctx);
    else enable(ctx);
  }

  pi.registerCommand("plan", {
    description: "Toggle plan mode (read-only planning; no file modifications)",
    handler: async (_args, ctx) => toggle(ctx),
  });

  pi.registerShortcut("ctrl+alt+p", {
    description: "Toggle plan mode",
    handler: async (ctx) => toggle(ctx),
  });

  pi.on("before_agent_start", async () => {
    if (!enabled) return;
    return {
      message: {
        customType: "plan-mode-context",
        content: PLAN_MODE_PROMPT,
        display: false,
      },
    };
  });

  pi.on("tool_call", async (event) => {
    if (!enabled) return;
    if (event.toolName === "edit" || event.toolName === "write") {
      return {
        block: true,
        reason: "Plan mode blocks file modifications. Disable /plan to make changes.",
      };
    }
    if (event.toolName === "bash") {
      const command = String((event.input as { command?: unknown }).command ?? "");
      if (!isSafeReadOnlyCommand(command)) {
        return {
          block: true,
          reason: `Plan mode blocks non-read-only shell commands. Disable /plan to make changes.\nCommand: ${command}`,
        };
      }
    }
  });

  pi.on("context", async (event) => {
    if (enabled) return;
    return {
      messages: event.messages.filter((message) => {
        const maybeCustom = message as { customType?: string };
        return maybeCustom.customType !== "plan-mode-context";
      }),
    };
  });

  pi.on("session_start", async (_event, ctx) => {
    const state = [...ctx.sessionManager.getEntries()]
      .toReversed()
      .find(
        (entry) =>
          entry.type === "custom" &&
          (entry as { customType?: string }).customType === "plan-mode-state",
      ) as { data?: { enabled?: boolean } } | undefined;

    if (pi.getFlag("plan") === true || state?.data?.enabled === true) enable(ctx, true);
    else setStatus(ctx);
  });
}
