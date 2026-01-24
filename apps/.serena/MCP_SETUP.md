# Serena MCP Server Setup for Cursor

This guide explains how to configure Serena as an MCP server in Cursor IDE.

## Configuration

### Option 1: Using stdio (Recommended)

Add the following to your Cursor MCP settings:

**Location**: Cursor Settings → Features → MCP → Edit Config

```json
{
  "mcpServers": {
    "serena": {
      "command": "uvx",
      "args": [
        "serena-mcp",
        "--project",
        "${workspaceFolder}"
      ]
    }
  }
}
```

### Option 2: Using HTTP/SSE

If you prefer to run Serena as a separate server:

1. Start Serena in HTTP mode:
```bash
uvx serena-mcp --http --port 24282 --project .
```

2. Add to Cursor MCP settings:
```json
{
  "mcpServers": {
    "serena": {
      "url": "http://127.0.0.1:24282"
    }
  }
}
```

## Prerequisites

1. **Python 3.11+** with `uv` package manager
2. **Serena MCP package** installed:
   ```bash
   uvx serena-mcp --help
   ```

## Project Configuration

The project is already configured with `.serena/project.yml` which includes:
- Language servers: TypeScript, Vue
- Project name: "apps"
- Encoding: UTF-8
- Gitignore integration enabled

## Verification

After configuration:
1. Restart Cursor
2. Check MCP status in Cursor's MCP panel
3. Serena tools should be available in the AI chat

## Troubleshooting

- **Path issues on Windows**: Use forward slashes or double backslashes (`\\\\`) in paths
- **Language server not starting**: Ensure TypeScript/Vue language servers are installed
- **Project not found**: Verify `${workspaceFolder}` resolves to the correct project directory
