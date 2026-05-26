# AGENTS Instructions

This repository contains local pi extensions in a pnpm workspace.

## Repository layout

- `extensions/<name>/` each extension package
- Root scripts are in `package.json`
- Source is TypeScript

## Development workflow

- Install deps: `pnpm install`
- Run checks before PRs:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm fmt:check`
- Auto-fix with:
  - `pnpm fmt`
  - `pnpm lint:fix`

## Working with git

- This repo uses **jj** (directory `/.jj` exists).
- Prefer `jj` commands for source control operations.

## PR/testing checklist

- Keep changes scoped and minimal.
- Ensure new/updated code passes lint + typecheck.
- Update README when extension behavior or commands change.
