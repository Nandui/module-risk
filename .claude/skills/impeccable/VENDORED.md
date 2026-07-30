# Vendored dependency

`impeccable` v4.0.4 — https://github.com/pbakaus/impeccable

Copied from `plugin/skills/impeccable` at that repository. Apache 2.0; see
`LICENSE` and `NOTICE.md` alongside this file.

Nothing here is ours. To update, re-copy that directory rather than editing in
place. The upstream installer (`npx impeccable install`) does the same thing
plus hook wiring, which is deliberately not set up here — see below.

## What was not installed

The upstream plugin also ships `hooks.json`, which runs a design check after
every `Edit`/`Write` and again on `Stop`. That is a change to how the harness
behaves on every edit in this repository, so it is left off. Wire it into
`.claude/settings.json` if it is wanted.
