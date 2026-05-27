# @tombell/pi-exit

A tiny Pi extension that adds a clean way to quit:

- `/exit` command
- plain `exit` input in interactive mode

## Features

- Registers an `/exit` command that calls `ctx.shutdown()`.
- Hooks the `input` event so typing `exit` exits immediately.

## Commands

- `/exit` — exit Pi.

## Install

- From npm: `pi install npm:@tombell/pi-exit`
- Local/quick test: `pi -e path/to/pi-exit`
