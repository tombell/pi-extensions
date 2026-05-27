# @tombell/pi-codex-plugins

Dynamically discovers enabled Codex plugins and exposes them to Pi as skills/prompts.

## Features

- On `resources_discover`, reads enabled plugins from `~/.codex/config.toml`.
- Generates transient skill and prompt resources under:
  - `~/.pi/agent/generated/codex-plugins/skills`
  - `~/.pi/agent/generated/codex-plugins/prompts`
- Wraps plugin docs as Pi skills (`SKILL.md`) with metadata.
- Copies plugin command Markdown files into Pi prompt path.
- `/codex-plugins` command to regenerate and list detected enabled plugins.

## Commands

- `/codex-plugins` — regenerate and report enabled Codex plugins.

## Install

- From npm: `pi install npm:@tombell/pi-codex-plugins`
- Local/quick test: `pi -e path/to/pi-codex-plugins`
