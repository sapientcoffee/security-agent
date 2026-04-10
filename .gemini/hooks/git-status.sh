#!/bin/bash

# Copyright 2026 Google LLC.
# SPDX-License-Identifier: Apache-2.0

# Hook to inject git status into the context
# This script runs before every prompt in the `gemini-cli-examples` context

echo "## Git Context"
echo "- **Branch:** $(git branch --show-current 2>/dev/null || echo 'Not a git repo')"
echo "- **Status:** $(git status --porcelain 2>/dev/null | wc -l) modified files"
echo "---"
