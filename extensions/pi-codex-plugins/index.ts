import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const CODEX_HOME = process.env.CODEX_HOME || join(homedir(), ".codex");
const OUT = join(homedir(), ".pi", "agent", "generated", "codex-plugins");

type EnabledPlugin = { name: string; marketplace: string };

function enabledPlugins(): EnabledPlugin[] {
  const configPath = join(CODEX_HOME, "config.toml");
  if (!existsSync(configPath)) return [];

  const toml = readFileSync(configPath, "utf8");
  const plugins: EnabledPlugin[] = [];
  const re = /^\[plugins\."([^"@]+)@([^"]+)"\]\s*\n(?:[^[]*?\n)?enabled\s*=\s*true\s*$/gm;

  let match: RegExpExecArray | null;
  while ((match = re.exec(toml))) plugins.push({ name: match[1], marketplace: match[2] });

  return plugins;
}

function latestVersionDir(plugin: EnabledPlugin): string | undefined {
  const base = join(CODEX_HOME, "plugins", "cache", plugin.marketplace, plugin.name);
  if (!existsSync(base)) return undefined;

  const dirs = readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("."))
    .map((d) => join(base, d.name));

  return dirs.at(-1);
}

function copyCommands(pluginName: string, pluginDir: string, promptsOut: string) {
  const commands = join(pluginDir, "commands");
  if (!existsSync(commands)) return;

  for (const entry of readdirSync(commands, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

    const src = join(commands, entry.name);
    const name = `${pluginName}-${entry.name}`;

    writeFileSync(join(promptsOut, name), readFileSync(src, "utf8"));
  }
}

function generateResources() {
  rmSync(OUT, { recursive: true, force: true });

  const skillsOut = join(OUT, "skills");
  const promptsOut = join(OUT, "prompts");

  mkdirSync(skillsOut, { recursive: true });
  mkdirSync(promptsOut, { recursive: true });

  let count = 0;

  for (const plugin of enabledPlugins()) {
    const dir = latestVersionDir(plugin);
    if (!dir) continue;

    count++;

    const metaPath = join(dir, ".codex-plugin", "plugin.json");
    let description = `${plugin.name} Codex plugin.`;

    try {
      const meta = JSON.parse(readFileSync(metaPath, "utf8"));
      description = meta.description || meta.interface?.longDescription || description;
    } catch {}

    const wrapper = join(skillsOut, `codex-${plugin.name}`);
    mkdirSync(wrapper, { recursive: true });

    const readme = existsSync(join(dir, "README.md"))
      ? readFileSync(join(dir, "README.md"), "utf8")
      : "";

    writeFileSync(
      join(wrapper, "SKILL.md"),
      `---\nname: ${JSON.stringify(`codex-${plugin.name}`)}\ndescription: ${JSON.stringify(description)}\n---\n\n# Codex plugin: ${plugin.name}\n\nUse this skill when the user asks for functionality covered by the installed Codex plugin \`${plugin.name}\`.\n\n${description}\n\nPlugin files are installed at: ${dir}\n\n${readme}`,
    );

    const pluginSkills = join(dir, "skills");

    if (existsSync(pluginSkills)) {
      for (const s of readdirSync(pluginSkills, { withFileTypes: true })) {
        if (!s.isDirectory()) continue;

        const skillMd = join(pluginSkills, s.name, "SKILL.md");
        if (!existsSync(skillMd)) continue;

        const outDir = join(skillsOut, `${plugin.name}-${s.name}`);
        mkdirSync(outDir, { recursive: true });
        writeFileSync(join(outDir, "SKILL.md"), readFileSync(skillMd, "utf8"));
      }
    }

    copyCommands(plugin.name, dir, promptsOut);
  }
  return { skillsOut, promptsOut, count };
}

export default function (pi: ExtensionAPI) {
  pi.on("resources_discover", async (_event, ctx) => {
    const { skillsOut, promptsOut, count } = generateResources();

    if (ctx.hasUI) ctx.ui.setStatus("codex-plugins", `Codex plugins: ${count}`);

    return { skillPaths: [skillsOut], promptPaths: [promptsOut] };
  });

  pi.registerCommand("codex-plugins", {
    description: "Regenerate and list enabled Codex plugin resources loaded into Pi",
    handler: async (_args, ctx) => {
      const plugins = enabledPlugins();
      generateResources();

      ctx.ui.notify(
        plugins.length
          ? `Enabled Codex plugins: ${plugins.map((p) => `${p.name}@${p.marketplace}`).join(", ")}`
          : "No enabled Codex plugins found.",
        "info",
      );
    },
  });
}
