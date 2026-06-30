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
