# @tombell/pi-sessions

Interactive session manager for Pi projects and directories.

## Features

- Adds a `/sessions` command that opens an interactive picker UI.
- Loads sessions with `SessionManager.list(ctx.cwd)`.
- Lets you mark and unmark sessions for deletion.
- Lets you rename sessions from the picker.
- Updates the TUI status with total/marked session counts.
- Clears state cleanly when a session is shut down.

## Commands

- `/sessions` — open the session manager

## Usage

In interactive mode (TUI required):

- Use arrow keys to navigate.
- `space`/`enter` to mark or unmark a session.
- `r` to rename the selected session.
- `enter` on `Done` to close.
- `escape` to close.

## Install

- From npm: `pi install npm:@tombell/pi-sessions`
- Local/quick test: `pi -e path/to/pi-sessions`
