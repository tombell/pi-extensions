import { stat } from "node:fs/promises";
import { resolve } from "node:path";

import type {
  ExtensionAPI,
  ExtensionContext,
  SessionInfo,
  ThemeColor,
} from "@earendil-works/pi-coding-agent";

import { SessionManager } from "@earendil-works/pi-coding-agent";
import {
  type Focusable,
  matchesKey,
  truncateToWidth,
  visibleWidth,
} from "@earendil-works/pi-tui";

type SessionListItem = {
  index: number;
  path: string;
  id: string;
  cwd: string;
  name?: string;
  created: Date;
  modified: Date;
  messageCount: number;
  firstMessage: string;
  fileSize: number | undefined;
};

function cwdKey(cwd: string): string {
  return resolve(cwd);
}

function shortId(sessionId: string): string {
  return sessionId.slice(0, 8);
}

function truncate(text: string, max: number): string {
  const normalized = (text ?? "").trim().replaceAll("\n", " ");
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined || !Number.isFinite(bytes)) {
    return "unknown";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  const precision = value >= 100 || unitIndex === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

function formatDate(value: Date | string): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "unknown";
  return d.toLocaleString();
}

async function toListItem(index: number, info: SessionInfo): Promise<SessionListItem> {
  const fileSize = await stat(info.path)
    .then((value) => value.size)
    .catch(() => undefined);

  return {
    index,
    path: info.path,
    id: info.id,
    cwd: info.cwd,
    name: info.name,
    created: info.created,
    modified: info.modified,
    messageCount: info.messageCount,
    firstMessage: info.firstMessage,
    fileSize,
  };
}

function formatPickerLine(
  item: SessionListItem,
  isMarked: boolean,
  isSelected: boolean,
  theme: { fg: (color: ThemeColor, content: string) => string },
): string {
  const idx = (item.index + 1).toString().padStart(3, "0");
  const displayName = item.name ? item.name : `-${item.id.slice(0, 8)}-`;
  const checkbox = isMarked ? "[x]" : "[ ]";
  const checkboxColor = isMarked ? "success" : "warning";
  const nameColor = "accent";
  const messageCountColor = isMarked ? "warning" : "muted";
  const fileSize = isMarked ? theme.fg("warning", formatFileSize(item.fileSize)) : theme.fg("muted", formatFileSize(item.fileSize));

  const body = `${idx}. ${theme.fg(nameColor, displayName)} • ${theme.fg("dim", shortId(item.id))} • ${theme.fg(messageCountColor, `${item.messageCount} msgs`)} • ${theme.fg("text", fileSize)} • ${theme.fg("text", truncate(item.firstMessage, 48))} ${theme.fg("dim", `(${formatDate(item.modified)})`)}`;

  const line = `${theme.fg(checkboxColor, checkbox)} ${body}`;
  const prefix = isSelected ? "> " : "  ";

  return isSelected ? theme.fg("accent", `${prefix}${line}`) : `${prefix}${line}`;
}

class SessionPicker implements Focusable {
  focused = false;

  private selected = 0;
  private readonly doneIndex: number;

  constructor(
    private readonly ctx: ExtensionContext,
    private readonly sessions: SessionListItem[],
    private readonly marked: Set<string>,
    private readonly onClose: () => void,
  ) {
    this.doneIndex = this.sessions.length;
  }

  handleInput(data: string): void {
    if (matchesKey(data, "escape")) {
      this.onClose();
      return;
    }

    if (matchesKey(data, "up")) {
      this.selected = Math.max(0, this.selected - 1);
      this.invalidate();
      return;
    }

    if (matchesKey(data, "down")) {
      this.selected = Math.min(this.doneIndex, this.selected + 1);
      this.invalidate();
      return;
    }

    if (this.selected === this.doneIndex) {
      if (matchesKey(data, "return")) {
        this.onClose();
      }
      return;
    }

    if (matchesKey(data, "space") || matchesKey(data, "return")) {
      const session = this.sessions[this.selected];
      if (!session) {
        return;
      }

      if (this.marked.has(session.path)) {
        this.marked.delete(session.path);
      } else {
        this.marked.add(session.path);
      }
      this.invalidate();
    }
  }

  render(width: number): string[] {
    const lines: string[] = [];

    const truncateLine = (line: string): string => {
      if (visibleWidth(line) <= width) {
        return line;
      }
      return truncateToWidth(line, width, "…");
    };

    const header = this.ctx.ui.theme.fg(
      "dim",
      "Mark/unmark sessions for deletion (↑/↓ select, space/enter toggle, enter done, esc close)",
    );
    lines.push(truncateLine(header));

    for (let index = 0; index < this.sessions.length; index++) {
      const session = this.sessions[index]!;
      const isSelected = index === this.selected;
      const row = formatPickerLine(session, this.marked.has(session.path), isSelected, this.ctx.ui.theme);
      lines.push(truncateLine(row));
    }

    const donePrefix = this.selected === this.doneIndex ? "> " : "  ";
    const doneLine = `${donePrefix}Done`;
    const doneRow = this.selected === this.doneIndex
      ? this.ctx.ui.theme.fg("success", `${doneLine} (${this.marked.size} selected)`) :
        this.ctx.ui.theme.fg("dim", `${doneLine}`);
    lines.push(truncateLine(doneRow));

    return lines;
  }

  invalidate(): void {}
  dispose(): void {}
}

export default function sessionManagerExtension(pi: ExtensionAPI): void {
  const latestByCwd = new Map<string, SessionListItem[]>();
  const markedByCwd = new Map<string, Set<string>>();

  function setMarked(ctx: ExtensionContext, set?: Set<string>): Set<string> {
    const key = cwdKey(ctx.cwd);
    const current = markedByCwd.get(key) ?? new Set<string>();
    const next = set ?? current;
    markedByCwd.set(key, next);
    return next;
  }

  function updateStatus(ctx: ExtensionContext): void {
    const key = cwdKey(ctx.cwd);
    const sessions = latestByCwd.get(key) ?? [];
    const marked = markedByCwd.get(key) ?? new Set();
    const markedCount = marked.size;
    const sessionCount = sessions.length;

    if (sessionCount > 0) {
      ctx.ui.setStatus("sessions-manager", `sessions: ${sessionCount} (${markedCount} marked)`);
    } else {
      ctx.ui.setStatus("sessions-manager", "sessions: 0");
    }
  }

  async function refreshSessions(ctx: ExtensionContext): Promise<SessionListItem[]> {
    const sessions = await SessionManager.list(ctx.cwd);
    const mapped = await Promise.all(sessions.map((session, index) => toListItem(index, session)));
    latestByCwd.set(cwdKey(ctx.cwd), mapped);
    return mapped;
  }

  async function runInteractiveMarking(
    ctx: ExtensionContext,
    sessions: SessionListItem[],
  ): Promise<void> {
    if (sessions.length === 0) {
      ctx.ui.notify("No saved sessions found for current project/cwd.", "info");
      return;
    }

    const state = markedByCwd.get(cwdKey(ctx.cwd)) ?? setMarked(ctx, new Set<string>());

    await ctx.ui.custom<void>((_tui, _theme, _keybindings, done) => {
      const picker = new SessionPicker(ctx, sessions, state, () => {
        done(undefined);
      });
      return picker;
    });

    updateStatus(ctx);
  }

  pi.on("session_start", async (_event, ctx) => {
    const key = cwdKey(ctx.cwd);
    latestByCwd.set(key, []);
    markedByCwd.set(key, markedByCwd.get(key) ?? new Set<string>());
    updateStatus(ctx);
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    const key = cwdKey(ctx.cwd);
    latestByCwd.delete(key);
    markedByCwd.delete(key);
    ctx.ui.setStatus("sessions-manager", undefined);
  });

  pi.registerCommand("sessions", {
    description: "Open session manager for the current project/cwd",
    handler: async (rawArgs, ctx) => {
      if (!ctx.hasUI) {
        ctx.ui.notify(
          "/sessions requires interactive mode. Open Pi with TUI/interactive mode.",
          "warning",
        );
        return;
      }

      if (rawArgs.trim()) {
        ctx.ui.notify(
          "/sessions does not accept arguments. Open /sessions and use the interactive UI.",
          "warning",
        );
        return;
      }

      const sessions = await refreshSessions(ctx);
      if (sessions.length === 0) {
        ctx.ui.notify("No saved sessions found for current project/cwd.", "info");
        return;
      }

      await runInteractiveMarking(ctx, sessions);
    },
  });
}
