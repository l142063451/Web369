#!/bin/bash
# Update status.md with current timestamp and CI health status
# Usage: ./scripts/update-status.sh [ci-results]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
STATUS_FILE="$ROOT_DIR/status.md"

# Update timestamp
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
echo "Updating status.md timestamp to: $TIMESTAMP"

# Update the last updated timestamp
sed -i.bak "s/\*\*Last Updated:\*\* [0-9-]* [0-9:]* UTC/\*\*Last Updated:\*\* $TIMESTAMP/g" "$STATUS_FILE"

# If CI results are provided as arguments, update CI health status
if [ "$1" = "ci-success" ]; then
    echo "Updating CI health status to success"
    sed -i.bak 's/- \*\*Lint:\*\* .*/- \*\*Lint:\*\* ✅ Passes/' "$STATUS_FILE"
    sed -i.bak 's/- \*\*Typecheck:\*\* .*/- \*\*Typecheck:\*\* ✅ Passes/' "$STATUS_FILE"  
    sed -i.bak 's/- \*\*Unit Tests:\*\* .*/- \*\*Unit Tests:\*\* ✅ Passes/' "$STATUS_FILE"
    sed -i.bak 's/- \*\*Build:\*\* .*/- \*\*Build:\*\* ✅ Passes/' "$STATUS_FILE"
elif [ "$1" = "ci-failure" ]; then
    echo "Updating CI health status to failure"
    sed -i.bak 's/- \*\*Lint:\*\* .*/- \*\*Lint:\*\* ❌ Failed/' "$STATUS_FILE"
    sed -i.bak 's/- \*\*Typecheck:\*\* .*/- \*\*Typecheck:\*\* ❌ Failed/' "$STATUS_FILE"  
    sed -i.bak 's/- \*\*Unit Tests:\*\* .*/- \*\*Unit Tests:\*\* ❌ Failed/' "$STATUS_FILE"
    sed -i.bak 's/- \*\*Build:\*\* .*/- \*\*Build:\*\* ❌ Failed/' "$STATUS_FILE"
fi

# Clean up backup file
rm -f "$STATUS_FILE.bak"

echo "Status.md updated successfully"

# If git is available and we're in a git repository, show the diff
if command -v git &> /dev/null && git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Changes made:"
    git diff --no-index /dev/null "$STATUS_FILE" 2>/dev/null | grep "^\+" | grep -v "^+++" | head -5 || true
fi