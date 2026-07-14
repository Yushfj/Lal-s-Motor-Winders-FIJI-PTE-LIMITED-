#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/.env"
MCP_FILE="$ROOT/.cursor/mcp.json"
EXAMPLE_FILE="$ROOT/.cursor/mcp.json.example"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing .env file. Copy .env.example to .env and add your API key."
  echo "Get a key at https://21st.dev/settings/api-keys"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

if [[ -z "${API_KEY_21ST:-}" ]]; then
  echo "API_KEY_21ST is not set in .env"
  exit 1
fi

mkdir -p "$ROOT/.cursor"

cat > "$MCP_FILE" <<EOF
{
  "mcpServers": {
    "21st": {
      "url": "https://21st.dev/api/mcp",
      "headers": {
        "x-api-key": "${API_KEY_21ST}"
      }
    }
  }
}
EOF

echo "Wrote $MCP_FILE"
echo "Restart Cursor, then open Settings > Tools & MCP and confirm the 21st server is enabled."
