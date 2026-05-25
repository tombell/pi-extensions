import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function exitCommand(pi: ExtensionAPI): void {
  pi.registerCommand("exit", {
    description: "Exit pi",
    handler: async (_args, ctx) => {
      ctx.shutdown();
    },
  });

  pi.on("input", async (event, ctx) => {
    if (event.text.trim() !== "exit") return { action: "continue" };

    ctx.shutdown();

    return { action: "handled" };
  });
}
