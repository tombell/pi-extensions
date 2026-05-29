import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

export type UsageInfo = {
  input: number;
  output: number;
  cost: number;
  context?: number;
};

type AssistantUsageMessage = {
  usage?: {
    input?: number;
    output?: number;
    cost?: { total?: number };
  };
};

export function getUsage(ctx: ExtensionContext): UsageInfo {
  let input = 0;
  let output = 0;
  let cost = 0;

  for (const entry of ctx.sessionManager.getBranch()) {
    if (entry.type !== "message" || entry.message.role !== "assistant") continue;

    const message = entry.message as AssistantUsageMessage;
    input += message.usage?.input ?? 0;
    output += message.usage?.output ?? 0;
    cost += message.usage?.cost?.total ?? 0;
  }

  return { input, output, cost, context: ctx.getContextUsage()?.tokens ?? undefined };
}
