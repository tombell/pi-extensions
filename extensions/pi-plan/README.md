# @tombell/pi-plan

Adds a read-only planning mode for safe investigation before edits.

## Features

- Adds `/plan` command and `Ctrl+Alt+P` shortcut.
- Optionally auto-starts with `--plan` flag.
- Restricts active tools to read-only commands in plan mode:
  - `read`, `grep`, `find`, `ls`, `bash` (safe read-only subset)
- Blocks `edit`/`write` and unsafe shell commands while enabled.
- Inserts a persistent planning prompt so the LLM produces plan-only responses.
- Persists mode state in session history across restarts.

## Commands

- `/plan` — toggle plan mode on/off.

## Notes

- `bash` commands are validated through `isSafeReadOnlyCommand` in `utils.ts`.
- Shortcut: `Ctrl+Alt+P`

## Install

- From npm: `pi install npm:@tombell/pi-plan`
- Local/quick test: `pi -e path/to/pi-plan`
