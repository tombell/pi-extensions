# @tombell/pi-exit

Tiny Pi extension that provides a clean way to quit.

## Features

- Adds an `/exit` command that calls `ctx.shutdown()`.
- Hooks the `input` event so typing `exit` exits immediately in interactive mode.

## Commands

- `/exit` — exit Pi

## Install

- From npm: `pi install npm:@tombell/pi-exit`
- Local/quick test: `pi -e path/to/pi-exit`
