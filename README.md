# pi-extensions

Personal extensions for the [pi coding agent](https://github.com/earendil-works/pi-coding-agent).

This repo is a small pnpm workspace containing local TypeScript extensions that can be loaded by pi during development.

## Extensions

- `@tombell/pi-exit` — adds an `exit` command and handles plain `exit` input to shut down pi.
- `@tombell/pi-plan` — adds a read-only planning mode toggle via `/plan`, `ctrl+alt+p`, or `--plan`.
- `@tombell/pi-diff` — adds `/diff` and `/changed-files` commands for files edited/written in the current pi session.
- `@tombell/pi-codex-plugins` — discovers enabled Codex plugins and exposes their skills/prompts to pi.
- `@tombell/pi-input` — replaces the default pi input editor with a fully enclosed box-style input field.
- `@tombell/pi-sessions` — list sessions for the current project/cwd and mark/delete old sessions.

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

Each extension lives under `extensions/<name>` and exports a default pi extension function from `index.ts`.

When developing locally, point pi at the extension package or add it to your pi configuration according to the pi extension loading docs.

## License

BSD-3-Clause. See [LICENSE](./LICENSE).
