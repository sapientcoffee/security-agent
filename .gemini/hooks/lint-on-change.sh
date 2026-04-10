#!/usr/bin/env bash

# Copyright 2026 Google LLC.
# SPDX-License-Identifier: Apache-2.0

# Read the input from Gemini CLI via stdin
input=$(cat)

# Extract the file path using jq
# Use // empty to avoid "null" string
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# If file_path is empty, try 'path' (some tools use that)
if [ -z "$file_path" ] || [ "$file_path" == "null" ]; then
    file_path=$(echo "$input" | jq -r '.tool_input.path // empty')
fi

# Log the received path for debugging (to stderr)
echo "Hook received file_path: $file_path" >&2

# If the path is absolute, make it relative to GEMINI_PROJECT_DIR if possible
if [[ "$file_path" == /* ]] && [[ -n "$GEMINI_PROJECT_DIR" ]]; then
    file_path="${file_path#$GEMINI_PROJECT_DIR/}"
fi

# Also handle cases where file_path might start with ./
file_path="${file_path#./}"

# Check for specific files to run relevant commands
# If a config file changes, we might want to run a full lint across all packages
if [[ "$file_path" == "eslint.config.js" || "$file_path" == ".prettierrc" || "$file_path" == "package.json" ]]; then
    echo "Configuration file changed ($file_path). Running full lint..." >&2
    npx turbo lint -- --fix >&2
else
    # Determine the project from the file path and run the respective lint command
    case "$file_path" in
        frontend/*)
            echo "File changed in frontend ($file_path). Running ESLint with fix..." >&2
            npx turbo lint --filter=security-audit-frontend -- --fix >&2
            ;;
        agent/*)
            echo "File changed in agent ($file_path). Running ESLint with fix..." >&2
            npx turbo lint --filter=security-audit-agent -- --fix >&2
            ;;
        *)
            echo "File $file_path does not belong to a known workspace or has no lint setup." >&2
            ;;
    esac
fi

# Return a valid JSON object to stdout as required by the hook interface
echo '{"decision": "allow"}'
exit 0
