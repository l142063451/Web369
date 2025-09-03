#!/bin/bash
# Git operations automation for repository status management
# Usage: ./scripts/git-status-ops.sh [commit-changes|update-pr-status|finalize-pr]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
STATUS_FILE="$ROOT_DIR/status.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to commit status changes with appropriate message
commit_status_changes() {
    log_info "Checking for status.md changes..."
    
    if ! git diff --quiet status.md; then
        local timestamp=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
        git add status.md
        git commit -m "chore: update status.md - $timestamp [skip ci]"
        log_success "Status changes committed"
        return 0
    else
        log_info "No status changes to commit"
        return 1
    fi
}

# Function to update PR completion status
update_pr_status() {
    local pr_number="$1"
    local status="$2" # "completed" or "in-progress"
    
    if [ -z "$pr_number" ] || [ -z "$status" ]; then
        log_error "Usage: update_pr_status <pr_number> <completed|in-progress>"
        return 1
    fi
    
    log_info "Updating PR${pr_number} status to: $status"
    
    case "$status" in
        "completed")
            # Mark PR as completed with [x]
            sed -i.bak "s/- \[ \] \*\*PR${pr_number}\*\*/- [x] **PR${pr_number}**/" "$STATUS_FILE"
            # Update any existing status indicators
            sed -i.bak "s/\*\*PR${pr_number}\*\*.*\*(.*)\*/\*\*PR${pr_number}\*\*.**(Completed)*/" "$STATUS_FILE"
            log_success "PR${pr_number} marked as completed"
            ;;
        "in-progress")
            # Ensure PR is not marked as completed but show in progress
            sed -i.bak "s/- \[x\] \*\*PR${pr_number}\*\*/- [ ] **PR${pr_number}**/" "$STATUS_FILE"
            sed -i.bak "s/\*\*PR${pr_number}\*\*.*\*(.*)\*/\*\*PR${pr_number}\*\*.**(In Progress)*/" "$STATUS_FILE"
            log_success "PR${pr_number} marked as in progress"
            ;;
        *)
            log_error "Invalid status: $status. Use 'completed' or 'in-progress'"
            return 1
            ;;
    esac
    
    # Update timestamp
    ./scripts/update-status.sh
    rm -f "$STATUS_FILE.bak"
}

# Function to finalize a PR completion
finalize_pr() {
    local pr_number="$1"
    local summary="$2"
    
    if [ -z "$pr_number" ]; then
        log_error "Usage: finalize_pr <pr_number> [summary]"
        return 1
    fi
    
    log_info "Finalizing PR${pr_number}..."
    
    # Mark PR as completed
    update_pr_status "$pr_number" "completed"
    
    # Add changelog entry if summary provided
    if [ -n "$summary" ]; then
        local date_str=$(date '+%Y-%m-%d')
        local changelog_entry="### $date_str (PR${pr_number} Implementation Complete)"
        
        # Find changelog section and add entry
        awk -v entry="$changelog_entry" -v summary="$summary" '
        /^## 📝 Changelog/ { 
            print 
            print entry
            print "- " summary
            print ""
            next 
        }
        { print }
        ' "$STATUS_FILE" > "$STATUS_FILE.tmp" && mv "$STATUS_FILE.tmp" "$STATUS_FILE"
        
        log_success "Added changelog entry for PR${pr_number}"
    fi
    
    commit_status_changes
}

# Function to auto-detect current branch PR number
detect_current_pr() {
    local branch_name=$(git branch --show-current)
    
    # Try to extract PR number from branch name patterns
    if [[ "$branch_name" =~ pr([0-9]+) ]]; then
        echo "${BASH_REMATCH[1]}"
    elif [[ "$branch_name" =~ PR([0-9]+) ]]; then
        echo "${BASH_REMATCH[1]}"
    elif [[ "$branch_name" =~ ([0-9]+) ]]; then
        echo "${BASH_REMATCH[1]}"
    else
        echo ""
    fi
}

# Main script logic
case "${1:-help}" in
    "commit-changes")
        commit_status_changes
        ;;
    "update-pr-status")
        update_pr_status "$2" "$3"
        ;;
    "finalize-pr")
        finalize_pr "$2" "$3"
        ;;
    "help"|*)
        echo "Git Status Operations Automation"
        echo "================================"
        echo ""
        echo "Usage: $0 <command> [args...]"
        echo ""
        echo "Commands:"
        echo "  commit-changes                    - Commit any status.md changes"
        echo "  update-pr-status <pr> <status>   - Update PR status (completed|in-progress)"
        echo "  finalize-pr <pr> [summary]       - Mark PR as completed with optional summary"
        echo "  help                             - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 update-pr-status 09 in-progress"
        echo "  $0 finalize-pr 08 'Services & Requests implementation complete'"
        echo "  $0 commit-changes"
        echo ""
        ;;
esac