# CLAUDE.md — Monorepo Root

| Directory | Stack |
|-----------|-------|
| `apps/` | SvelteKit 5 + TypeScript + Drizzle ORM + SQLite → [apps/CLAUDE.md](apps/CLAUDE.md) |
| `api/` | Go + Gin |

> **When working on any file under `apps/`, always read `apps/CLAUDE.md` in full before making any changes.**

## Quick Start

```bash
cd apps && npm install && npm run dev   # Frontend
cd api && go run main.go               # API
```

## Conventions

- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (see Git Workflow in apps/CLAUDE.md)
- Branches: feature branches off `main`, PRs required
- IDE config (`.idea/`, `.vscode/`, `.cursor/`) is gitignored — keep local

## Git Worktree Convention

AI agents performing parallel work **must** use git worktrees so concurrent edits never collide on the main checkout.

### Branch Base Rule

- **Always** branch worktrees from the current active branch at session start
- The canonical base for this project is **`demo`** — it contains all custom modules; `main` does not
- **Never** use `main`, `master`, `staging`, or `develop` as the worktree base
- If the detected base branch is a forbidden base → **abort and notify the user**

```bash
# Detect base branch at agent spawn
BASE_BRANCH=$(git rev-parse --abbrev-ref HEAD)

# demo is the canonical base for this project; main/master/staging/develop are forbidden
FORBIDDEN="main master staging develop"
if echo "$FORBIDDEN" | grep -wq "$BASE_BRANCH"; then
  echo "ERROR: Refusing to branch worktree from '$BASE_BRANCH'."
  echo "   Checkout your feature branch (or 'demo') first, then re-invoke the agent."
  exit 1
fi
```

### Worktree Creation

```bash
# Pattern: agent/<module-name> branched from current HEAD
git worktree add .claude/worktrees/<module> -b agent/<module> $BASE_BRANCH
```

### Naming Convention

| Item | Pattern |
|------|---------|
| Worktree path | `.claude/worktrees/<module-name>/` |
| Branch name | `agent/<module-name>` |
| Base | `demo` (default) or current feature branch (e.g. `feat/your-feature`) |

### Print Paths on Spawn

After creating each worktree, print:

```
Worktree ready: agent/<module>
   Path  : /absolute/path/to/.claude/worktrees/<module>/
   Branch: agent/<module>
   Base  : <base-branch>

   Open in PyCharm : File → Open → <path> → Open in New Window
   Open in VS Code : code <path>
```

### Odoo-Specific Rules

- Bump `version` in `__manifest__.py` when changing views, models, or data files
- Write config changes as XML data files — never rely on staging DB state
- Never push `agent/*` branches directly to `staging` or production

### Merge Strategy

**Agent worktree → feature branch: squash merge**

Each agent task is a single logical unit. Squash collapses noisy incremental commits into one reviewable commit and makes it trivially revertable.

```bash
# From your feature/demo branch
git merge --squash agent/<module>
git commit -m "[IMP] module: short description of what the agent did"
```

**Feature branch → demo: squash merge via PR**

One commit per feature on `demo`. Open a PR and use GitHub's "Squash and merge" button — do not merge locally.

```bash
# After PR is approved
gh pr merge <pr-number> --squash --delete-branch
```

### Cleanup After Merge

```bash
git worktree remove .claude/worktrees/<module>
git branch -d agent/<module>
```

### Promotion Pipeline

```
demo
  └── agent/<module>        ← worktree (AI agent edits here)
        ↓ squash merge
feat/<your-feature>
        ↓ rebase + fast-forward onto demo
        ↓ push + open PR → code review → squash merge
demo
        ↓ push
Odoo.sh DEV → staging → production
```
