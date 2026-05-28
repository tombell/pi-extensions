# @tombell/pi-sessions

Interactive session manager for Pi projects/cwd.

## Features

- `/sessions` command to open an interactive picker UI.
- Loads sessions via `SessionManager.list(ctx.cwd)`.
- Lets you mark/unmark sessions for deletion (interactive workflow).
- Updates TUI status with total and marked session counts.
- Clears state cleanly on session shutdown.

## Commands

- `/sessions` — open session manager.

## Usage

Run in interactive mode (TUI required):

- Arrow keys to navigate
- `space`/`enter` to mark/unmark
- `enter` on `Done` to close
- `escape` to close

## Install

- From npm: `pi install npm:@tombell/pi-sessions`
- Local/quick test: `pi -e path/to/pi-sessions`
