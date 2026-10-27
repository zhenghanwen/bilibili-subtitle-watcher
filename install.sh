#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_SOURCE="$REPO_ROOT/skill"
AGENT="${1:-claude}"
SKILL_DIR="${2:-}"

echo "Installing bili-sub CLI globally with npm..."
npm install -g "$REPO_ROOT"

if [[ "$AGENT" != "none" ]]; then
  if [[ "$AGENT" == "custom" ]]; then
    if [[ -z "$SKILL_DIR" ]]; then
      echo "custom agent requires a target skill directory" >&2
      exit 1
    fi
    TARGET="$SKILL_DIR/bilibili-subtitle-watcher"
  elif [[ "$AGENT" == "claude" ]]; then
    TARGET="$HOME/.claude/skills/bilibili-subtitle-watcher"
  else
    echo "Unsupported agent: $AGENT" >&2
    exit 1
  fi
  echo "Installing Skill to $TARGET"
  mkdir -p "$TARGET"
  cp -R "$SKILL_SOURCE/." "$TARGET/"
fi

echo "Install complete. Run: bili-sub doctor && bili-sub login"
