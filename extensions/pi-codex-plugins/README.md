# @tombell/pi-codex-plugins

Dynamically discovers enabled Codex plugins and exposes them in Pi as skills and prompts.

## Features

- On `resources_discover`, reads enabled plugins from `~/.codex/config.toml`.
- Generates transient resources under:
  - `~/.pi/agent/generated/codex-plugins/skills`
  - `~/.pi/agent/generated/codex-plugins/prompts`
- Wraps plugin docs as Pi skills (`SKILL.md`) with metadata.
- Copies plugin command Markdown files into Pi prompt resources.
- Adds `/codex-plugins` to regenerate and list detected plugins.

## Commands

- `/codex-plugins` — regenerate and list enabled Codex plugins

## Install

- From npm: `pi install npm:@tombell/pi-codex-plugins`
- Local/quick test: `pi -e path/to/pi-codex-plugins`
