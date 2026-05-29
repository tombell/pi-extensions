import { truncateToWidth } from "@earendil-works/pi-tui";

export function fmtCount(value: number): string {
  if (value < 1000) return `${value}`;
  if (value < 1_000_000) return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}k`;

  return `${(value / 1_000_000).toFixed(1)}m`;
}

export function trunc(text: string, max: number): string {
  return truncateToWidth(text.trim().replaceAll(/\s+/g, " "), max, "…");
}

export function usesSubscription(provider: string | undefined): boolean {
  return provider === "openai-codex" || provider === "github-copilot";
}

export function contextColor(
  used: number,
  total: number | undefined,
): "success" | "warning" | "error" {
  if (!total || total <= 0) return "success";

  const percent = used / total;
  if (percent >= 0.7) return "error";
  if (percent >= 0.5) return "warning";

  return "success";
}
