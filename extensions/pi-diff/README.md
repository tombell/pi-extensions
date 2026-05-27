# @tombell/pi-diff

Shows git diff output for files touched by Pi during the current session and lists those files.

## Features

- Tracks file paths from successful `edit` and `write` tool calls.
- `/diff` command
  - defaults to session-tracked changed files
  - `--all` or `all`: show all dirty files in the repo
  - `--stat` or `stat`: show unified diff summary
- `/changed-files` command
  - lists all session-tracked edited/written files
- Custom renderer with colored diff output.

## Commands

- `/diff [all|stat|all stat]`
- `/changed-files`

## Install

- From npm: `pi install npm:@tombell/pi-diff`
- Local/quick test: `pi -e path/to/pi-diff`
