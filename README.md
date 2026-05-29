# pi-extensions

Personal extensions for the [Pi coding agent](https://github.com/earendil-works/pi-coding-agent).

This repo is a small pnpm workspace containing local TypeScript extensions that can be loaded by Pi during development.

## Extensions

- `@tombell/pi-exit` — adds an `/exit` command and handles plain `exit` input to shut down Pi.
- `@tombell/pi-plan` — adds a read-only planning mode toggle via `/plan`, `Ctrl+Alt+P`, or `--plan`.
- `@tombell/pi-diff` — adds `/diff` and `/changed-files` commands for files changed during the current Pi session.
- `@tombell/pi-codex-plugins` — discovers enabled Codex plugins and exposes them as Pi skills and prompts.
- `@tombell/pi-input` — replaces Pi's input editor with a boxed input field.
- `@tombell/pi-sessions` — adds an interactive session manager for Pi projects and directories.
- `@tombell/pi-status` — replaces Pi's footer with a slim minimal status bar.

## Development

Install dependencies:

```sh
pnpm install
```

Run checks:

```sh
pnpm lint
pnpm typecheck
pnpm fmt:check
```

Format and fix lint issues:

```sh
pnpm fmt
pnpm lint:fix
```

Publish all extensions to npm:

```sh
pnpm publish:extensions
```

## Loading an extension

Each extension lives under `extensions/<name>` and exports a default Pi extension function from `index.ts`.

When developing locally, point Pi at the extension package or add it to your Pi configuration according to the Pi extension loading docs.

## License

BSD-3-Clause. See [LICENSE](./LICENSE).
