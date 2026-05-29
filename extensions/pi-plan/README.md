# @tombell/pi-plan

Read-only planning mode for safe investigation before making changes.

## Features

- Adds a `/plan` command and `Ctrl+Alt+P` shortcut.
- Optional auto-start via `--plan` flag.
- Restricts available tools to a safe, read-only subset:
  - `read`
  - `grep`
  - `find`
  - `ls`
  - `bash` (safe command subset)
- Blocks `edit`, `write`, and unsafe shell commands while enabled.
- Forces planning-only responses through a persistent prompt.
- Persists mode state in session history across restarts.

## Commands

- `/plan` — toggle plan mode on/off

## Notes

- Bash command filtering uses `isSafeReadOnlyCommand` in `utils.ts`.

## Install

- From npm: `pi install npm:@tombell/pi-plan`
- Local/quick test: `pi -e path/to/pi-plan`
