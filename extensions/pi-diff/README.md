# @tombell/pi-diff

Show git diff for files changed during the current Pi session.

## Features

- Tracks file paths from successful `edit` and `write` tool calls.
- Adds two commands:
  - `/diff`
  - `/changed-files`
- `/diff`
  - defaults to session-tracked files
  - shows a selector when multiple files are available
  - falls back to all dirty files if no session files are tracked
  - `--all` / `all`: include every dirty repo file
  - `--stat` / `stat`: show unified diff summary
- `/changed-files`: lists all edited/written files tracked this session
- Custom renderer with colored diff output

## Install

- From npm: `pi install npm:@tombell/pi-diff`
- Local/quick test: `pi -e path/to/pi-diff`
