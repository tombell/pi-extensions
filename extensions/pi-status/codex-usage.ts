import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

const CODEX_PROVIDER_ID = "openai-codex";
const CODEX_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const DEFAULT_TIMEOUT_MS = 15_000;
export const CODEX_USAGE_CACHE_TTL_MS = 5 * 60 * 1000;

type PiModel = NonNullable<ExtensionContext["model"]>;

type CodexUsageReport = {
  capturedAt: number;
  snapshots: NormalizedRateLimitSnapshot[];
};

type NormalizedRateLimitSnapshot = {
  limitId: string;
  limitName?: string;
  primary?: NormalizedRateLimitWindow;
  secondary?: NormalizedRateLimitWindow;
};

type NormalizedRateLimitWindow = {
  usedPercent: number;
};

type RateLimitStatusPayload = {
  rate_limit?: unknown;
  additional_rate_limits?: unknown;
};

type BackendRateLimitDetails = {
  primary_window?: unknown;
  secondary_window?: unknown;
};

type BackendWindowSnapshot = {
  used_percent?: unknown;
};

type BackendAdditionalRateLimit = {
  limit_name?: unknown;
  metered_feature?: unknown;
  rate_limit?: unknown;
};

export type CodexUsageState = {
  text?: string;
  loading: boolean;
  fetchedAt?: number;
};

export function isOpenAICodexProvider(provider: string | undefined): boolean {
  return provider === CODEX_PROVIDER_ID;
}

export async function fetchCodexUsageText(ctx: ExtensionContext): Promise<string | undefined> {
  const report = await queryCodexUsage(ctx);
  return formatCodexUsageSegment(report, ctx.model);
}

async function queryCodexUsage(ctx: ExtensionContext): Promise<CodexUsageReport> {
  const auth = await resolvePiCodexAuth(ctx);
  if (!auth) throw new Error("No Pi OpenAI Codex subscription auth available.");

  const response = await fetchWithTimeout(
    CODEX_USAGE_URL,
    { headers: auth.headers },
    DEFAULT_TIMEOUT_MS,
  );
  const text = await response.text();
  if (!response.ok)
    throw new Error(`Codex usage endpoint returned ${response.status} ${response.statusText}.`);

  const payload = parseJsonObject(text, "Codex usage endpoint response");
  return normalizeBackendPayload(payload as RateLimitStatusPayload, Date.now());
}

async function resolvePiCodexAuth(
  ctx: ExtensionContext,
): Promise<{ headers: Record<string, string> } | undefined> {
  for (const model of codexAuthCandidateModels(ctx)) {
    // Auth lookup can prompt/provider-resolve; keep ordered so the active model is tried first.
    // oxlint-disable-next-line no-await-in-loop
    const auth = await ctx.modelRegistry.getApiKeyAndHeaders(model);
    if (!auth.ok) continue;

    const headers = { ...auth.headers };
    if (!hasHeader(headers, "Authorization") && auth.apiKey)
      headers.Authorization = `Bearer ${auth.apiKey}`;
    if (!hasHeader(headers, "User-Agent")) headers["User-Agent"] = "pi-status";
    if (hasHeader(headers, "Authorization")) return { headers };
  }

  return undefined;
}

function codexAuthCandidateModels(ctx: ExtensionContext): PiModel[] {
  const candidates: PiModel[] = [];
  const seen = new Set<string>();
  const add = (model: PiModel | undefined) => {
    if (!model || model.provider !== CODEX_PROVIDER_ID) return;
    const key = `${model.provider}/${model.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(model);
  };

  add(ctx.model);
  for (const model of ctx.modelRegistry.getAvailable()) add(model);
  for (const model of ctx.modelRegistry.getAll()) add(model);
  return candidates;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeBackendPayload(
  payload: RateLimitStatusPayload,
  capturedAt: number,
): CodexUsageReport {
  const snapshots: NormalizedRateLimitSnapshot[] = [];
  const primary = normalizeBackendSnapshot("codex", undefined, payload.rate_limit);
  if (primary) snapshots.push(primary);

  const additional = Array.isArray(payload.additional_rate_limits)
    ? payload.additional_rate_limits
    : [];
  for (const item of additional) {
    const additionalLimit = assertObject(
      item,
      "additional rate limit",
    ) as BackendAdditionalRateLimit;
    const limitId =
      asString(additionalLimit.metered_feature) ?? asString(additionalLimit.limit_name);
    if (!limitId) continue;
    const snapshot = normalizeBackendSnapshot(
      limitId,
      asString(additionalLimit.limit_name),
      additionalLimit.rate_limit,
    );
    if (snapshot) snapshots.push(snapshot);
  }

  return { capturedAt, snapshots };
}

function normalizeBackendSnapshot(
  limitId: string,
  limitName: string | undefined,
  rateLimit: unknown,
): NormalizedRateLimitSnapshot | undefined {
  if (rateLimit === null || rateLimit === undefined) return undefined;
  const details = assertObject(rateLimit, "rate limit") as BackendRateLimitDetails;
  const primary = normalizeBackendWindow(details.primary_window);
  const secondary = normalizeBackendWindow(details.secondary_window);
  if (!primary && !secondary) return undefined;
  return { limitId, limitName, primary, secondary };
}

function normalizeBackendWindow(value: unknown): NormalizedRateLimitWindow | undefined {
  if (value === null || value === undefined) return undefined;
  const window = assertObject(value, "rate-limit window") as BackendWindowSnapshot;
  const usedPercent = asNumber(window.used_percent);
  return usedPercent === undefined ? undefined : { usedPercent };
}

function formatCodexUsageSegment(
  report: CodexUsageReport,
  model: PiModel | undefined,
): string | undefined {
  const snapshot = selectSnapshotForModel(report, model);
  if (!snapshot) return undefined;

  const parts = [formatStatuslinePrefix(snapshot)];
  if (snapshot.primary) parts.push(`${formatRemainingPercent(snapshot.primary)} 5h`);
  if (snapshot.secondary) parts.push(`${formatRemainingPercent(snapshot.secondary)} wk`);
  return parts.length > 1 ? parts.join(" ") : undefined;
}

function selectSnapshotForModel(
  report: CodexUsageReport,
  model: PiModel | undefined,
): NormalizedRateLimitSnapshot | undefined {
  const codexSnapshot = report.snapshots.find(isPrimaryCodexSnapshot);
  if (!model || !isOpenAICodexProvider(model.provider)) return codexSnapshot ?? report.snapshots[0];

  const modelKeys = normalizedModelUsageKeys(model);
  const exactMatch = report.snapshots.find((snapshot) =>
    normalizedSnapshotUsageKeys(snapshot).some((key) => modelKeys.has(key)),
  );
  if (exactMatch) return exactMatch;

  for (const variant of codexModelVariantKeys(modelKeys)) {
    const matches = report.snapshots.filter(
      (snapshot) =>
        !isPrimaryCodexSnapshot(snapshot) &&
        normalizedSnapshotUsageKeys(snapshot).some((key) => normalizedKeyHasToken(key, variant)),
    );
    if (matches.length === 1) return matches[0];
  }

  return codexSnapshot ?? report.snapshots[0];
}

function normalizedModelUsageKeys(model: PiModel): Set<string> {
  const keys = new Set<string>();
  addNormalizedUsageKey(keys, model.id);
  addNormalizedUsageKey(keys, model.name);
  for (const key of keys) {
    const codexIndex = key.indexOf("codex");
    if (codexIndex >= 0) keys.add(key.slice(codexIndex));
  }
  return keys;
}

function normalizedSnapshotUsageKeys(snapshot: NormalizedRateLimitSnapshot): string[] {
  return [normalizedUsageKey(snapshot.limitId), normalizedUsageKey(snapshot.limitName)].filter(
    (key): key is string => key !== undefined,
  );
}

function codexModelVariantKeys(modelKeys: Set<string>): string[] {
  const variants = new Set<string>();
  for (const key of modelKeys) {
    const match = key.match(/(?:^|-)codex-(.+)$/);
    if (match?.[1]) variants.add(match[1]);
  }
  return [...variants];
}

function normalizedKeyHasToken(key: string, token: string): boolean {
  return (
    key === token ||
    key.startsWith(`${token}-`) ||
    key.endsWith(`-${token}`) ||
    key.includes(`-${token}-`)
  );
}

function addNormalizedUsageKey(keys: Set<string>, value: string | undefined): void {
  const key = normalizedUsageKey(value);
  if (key) keys.add(key);
}

function normalizedUsageKey(value: string | undefined): string | undefined {
  const key = value
    ?.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return key || undefined;
}

function formatStatuslinePrefix(snapshot: NormalizedRateLimitSnapshot): string {
  if (isPrimaryCodexSnapshot(snapshot)) return "codex";
  const label = snapshot.limitName ?? snapshot.limitId;
  const normalized = label.replace(/[_-]+/g, " ").trim();
  const codexVariant = normalized.match(/\bcodex\s+(.+)$/i)?.[1]?.trim();
  return `codex ${(codexVariant || normalized).toLowerCase().replace(/\s+/g, " ")}`;
}

function formatRemainingPercent(window: NormalizedRateLimitWindow): string {
  return `${(100 - clampPercent(window.usedPercent)).toFixed(0)}%`;
}

function isPrimaryCodexSnapshot(snapshot: NormalizedRateLimitSnapshot): boolean {
  return (
    normalizedUsageKey(snapshot.limitId) === "codex" ||
    normalizedUsageKey(snapshot.limitName) === "codex"
  );
}

function parseJsonObject(text: string, description: string): Record<string, unknown> {
  try {
    return assertObject(JSON.parse(text) as unknown, description);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`${description} was not valid JSON.`, { cause: error });
    }
    throw error;
  }
}

function assertObject(value: unknown, description: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${description} was not an object.`);
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase());
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}
