# TypeScript + Svelte Development Standards

## Code Style
- Use TypeScript for all new code
- Prefer `interface` over `type` for object shapes
- Use strict TypeScript configuration
- Export types and interfaces explicitly

## Svelte Conventions
- Use `.svelte` extension for components
- Use `<script lang="ts">` for TypeScript in components
- Prefer reactive statements (`$:`) over manual event handlers for derived state
- Use stores for shared state between components

## File Organization
- Components in `src/components/`
- Utilities in `src/lib/utils/`
- Types in `src/types/`
- Services in `src/lib/application/`

## Testing
- Use Vitest for unit tests
- Test files use `.test.ts` suffix
- Place tests adjacent to source files or in `__tests__` directories
- Write property-based tests for complex logic

## Naming
- Use PascalCase for components and types
- Use camelCase for variables and functions
- Use kebab-case for file names (except components)
- Prefix interfaces with descriptive names (avoid `I` prefix)

## Error Handling
- Use custom error classes extending `Error`
- Handle errors at component boundaries
- Log errors with structured logging