# @tombell/pi-status

Slim minimal status bar for Pi.

## Features

- Replaces Pi's footer with a slim minimal status bar.
- Shows the current working directory.
- Shows the jj change ID when inside a jj repo, otherwise the git branch when inside a git repo.
- Shows the truncated session name when set.
- Shows the provider, model, and thinking level.
- Shows token usage and cost from the current session (cost hidden for subscription providers).
- Shows OpenAI Codex subscription usage when the provider is `openai-codex` (`5h` and weekly as `wk`).
- Shows a diff summary.

## Install

- From npm: `pi install npm:@tombell/pi-status`
- Local/quick test: `pi -e path/to/pi-status`
