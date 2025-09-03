#!/bin/bash
# Advanced status automation system for Web369 repository
# Handles PR progression, milestone tracking, and automated status updates
# Usage: ./scripts/status-automation.sh [command] [args...]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
STATUS_FILE="$ROOT_DIR/status.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

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

log_progress() {
    echo -e "${PURPLE}🚀 $1${NC}"
}

# Function to detect current environment and branch
detect_environment() {
    local branch_name=$(git branch --show-current 2>/dev/null || echo "unknown")
    local commit_hash=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    
    case "$branch_name" in
        main)
            echo "production"
            ;;
        develop)
            echo "staging"
            ;;
        *)
            echo "development"
            ;;
    esac
}

# Function to update timestamp with environment context
update_timestamp() {
    local timestamp=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
    local environment=$(detect_environment)
    
    log_info "Updating timestamp: $timestamp (Environment: $environment)"
    
    # Update timestamp
    sed -i.bak "s/\*\*Last Updated:\*\* [0-9-]* [0-9:]* UTC/\*\*Last Updated:\*\* $timestamp/g" "$STATUS_FILE"
    
    # Update environment if needed
    case "$environment" in
        production)
            sed -i.bak "s/\*\*Environment:\*\* .*/\*\*Environment:\*\* Production/" "$STATUS_FILE"
            ;;
        staging)
            sed -i.bak "s/\*\*Environment:\*\* .*/\*\*Environment:\*\* Staging/" "$STATUS_FILE"
            ;;
        *)
            sed -i.bak "s/\*\*Environment:\*\* .*/\*\*Environment:\*\* Development/" "$STATUS_FILE"
            ;;
    esac
    
    rm -f "$STATUS_FILE.bak"
}

# Function to update CI health status with detailed information
update_ci_status() {
    local status="$1"
    local details="${2:-}"
    
    log_info "Updating CI health status: $status"
    
    case "$status" in
        "success")
            sed -i.bak 's/- \*\*Lint:\*\* .*/- \*\*Lint:\*\* ✅ Passes/' "$STATUS_FILE"
            sed -i.bak 's/- \*\*Typecheck:\*\* .*/- \*\*Typecheck:\*\* ✅ Passes/' "$STATUS_FILE"
            sed -i.bak 's/- \*\*Unit Tests:\*\* .*/- \*\*Unit Tests:\*\* ✅ Passes/' "$STATUS_FILE"
            sed -i.bak 's/- \*\*Build:\*\* .*/- \*\*Build:\*\* ✅ Passes/' "$STATUS_FILE"
            sed -i.bak 's/- \*\*E2E Tests:\*\* .*/- \*\*E2E Tests:\*\* ⚪ Ready/' "$STATUS_FILE"
            ;;
        "failure")
            # Mark individual components as failed - we'll enhance this with specific failure detection
            sed -i.bak 's/- \*\*Lint:\*\* .*/- \*\*Lint:\*\* ❌ Failed/' "$STATUS_FILE"
            sed -i.bak 's/- \*\*Typecheck:\*\* .*/- \*\*Typecheck:\*\* ❌ Failed/' "$STATUS_FILE"
            sed -i.bak 's/- \*\*Unit Tests:\*\* .*/- \*\*Unit Tests:\*\* ❌ Failed/' "$STATUS_FILE"
            sed -i.bak 's/- \*\*Build:\*\* .*/- \*\*Build:\*\* ❌ Failed/' "$STATUS_FILE"
            ;;
        "warning")
            sed -i.bak 's/- \*\*Lint:\*\* .*/- \*\*Lint:\*\* ⚠️ Warnings/' "$STATUS_FILE"
            sed -i.bak 's/- \*\*Typecheck:\*\* .*/- \*\*Typecheck:\*\* ✅ Passes/' "$STATUS_FILE"
            sed -i.bak 's/- \*\*Unit Tests:\*\* .*/- \*\*Unit Tests:\*\* ⚠️ Partial/' "$STATUS_FILE"
            sed -i.bak 's/- \*\*Build:\*\* .*/- \*\*Build:\*\* ✅ Passes/' "$STATUS_FILE"
            ;;
    esac
    
    rm -f "$STATUS_FILE.bak"
}

# Function to update PR status with enhanced tracking
update_pr_status() {
    local pr_number="$1"
    local status="$2"
    local phase_update="${3:-}"
    
    if [ -z "$pr_number" ] || [ -z "$status" ]; then
        log_error "Usage: update_pr_status <pr_number> <completed|in-progress|blocked>"
        return 1
    fi
    
    log_progress "Updating PR${pr_number} status to: $status"
    
    case "$status" in
        "completed")
            # Mark PR as completed
            sed -i.bak "s/- \[ \] \*\*PR${pr_number}\*\*/- [x] **PR${pr_number}**/" "$STATUS_FILE"
            # Update any status indicators
            sed -i.bak "s/\*In Progress\*/\*Completed\*/g" "$STATUS_FILE"
            log_success "PR${pr_number} marked as completed"
            
            # Auto-advance to next PR if specified
            if [ -n "$phase_update" ]; then
                update_phase "$phase_update"
            fi
            ;;
        "in-progress")
            # Ensure PR shows as in progress
            sed -i.bak "s/- \[x\] \*\*PR${pr_number}\*\*/- [ ] **PR${pr_number}**/" "$STATUS_FILE"
            # Update phase if this is the current PR
            update_phase "PR${pr_number}"
            log_success "PR${pr_number} marked as in progress"
            ;;
        "blocked")
            # Mark as blocked (we'll use ⚠️ indicator)  
            sed -i.bak "s/\*\*PR${pr_number}\*\*.*\*Completed\*/\*\*PR${pr_number}\*\* ⚠️ \*Blocked\*/" "$STATUS_FILE"
            log_warning "PR${pr_number} marked as blocked"
            ;;
        *)
            log_error "Invalid status: $status. Use 'completed', 'in-progress', or 'blocked'"
            return 1
            ;;
    esac
    
    update_timestamp
    rm -f "$STATUS_FILE.bak"
}

# Function to update current phase
update_phase() {
    local new_phase="$1"
    
    if [ -n "$new_phase" ]; then
        log_info "Updating current phase to: $new_phase"
        sed -i.bak "s/\*\*Current Phase:\*\* .*/\*\*Current Phase:\*\* $new_phase \*(In Progress)\*/" "$STATUS_FILE"
        rm -f "$STATUS_FILE.bak"
    fi
}

# Function to add changelog entry with advanced formatting
add_changelog_entry() {
    local pr_number="$1"
    local title="$2"
    local description="$3"
    local date_str=$(date '+%Y-%m-%d')
    
    if [ -z "$pr_number" ] || [ -z "$title" ]; then
        log_error "Usage: add_changelog_entry <pr_number> <title> [description]"
        return 1
    fi
    
    log_info "Adding changelog entry for PR${pr_number}: $title"
    
    # Create changelog entry
    local changelog_header="### $date_str (PR${pr_number} Implementation Complete)"
    local changelog_title="- **$title:** $description"
    
    # Find the changelog section and add the entry at the top
    awk -v header="$changelog_header" -v entry="$changelog_title" '
    /^## 📝 Changelog/ { 
        print 
        print header
        print entry
        print ""
        next 
    }
    { print }
    ' "$STATUS_FILE" > "$STATUS_FILE.tmp" && mv "$STATUS_FILE.tmp" "$STATUS_FILE"
    
    log_success "Changelog entry added successfully"
}

# Function to finalize PR completion with full automation
finalize_pr_completion() {
    local pr_number="$1"
    local title="$2"
    local description="$3"
    local next_pr="${4:-}"
    
    if [ -z "$pr_number" ] || [ -z "$title" ]; then
        log_error "Usage: finalize_pr_completion <pr_number> <title> [description] [next_pr]"
        return 1
    fi
    
    log_progress "Finalizing completion of PR${pr_number}: $title"
    
    # Update PR status to completed
    update_pr_status "$pr_number" "completed"
    
    # Add changelog entry
    add_changelog_entry "$pr_number" "$title" "$description"
    
    # Update phase to next PR if specified
    if [ -n "$next_pr" ]; then
        update_phase "PR${next_pr}"
        log_info "Phase updated to PR${next_pr}"
    fi
    
    # Update timestamp
    update_timestamp
    
    log_success "PR${pr_number} completion finalized"
}

# Function to auto-detect next PR to implement
get_next_pr() {
    # Look for the first uncompleted PR in status.md
    local next_pr=$(grep -n "^- \[ \] \*\*PR" "$STATUS_FILE" | head -1 | sed 's/.*PR\([0-9]*\).*/\1/')
    echo "$next_pr"
}

# Function to commit changes with smart commit messages
commit_changes() {
    local commit_type="${1:-auto}"
    local pr_context="${2:-}"
    
    if ! git diff --quiet status.md; then
        local timestamp=$(date -u '+%Y-%m-%d %H:%M UTC')
        local branch=$(git branch --show-current)
        
        case "$commit_type" in
            "ci")
                git add status.md
                git commit -m "chore(ci): auto-update status.md - $timestamp [skip ci]"
                ;;
            "pr-completion")
                git add status.md
                git commit -m "feat: complete $pr_context - auto-update status.md [skip ci]"
                ;;
            "milestone")
                git add status.md  
                git commit -m "milestone: $pr_context - status automation update [skip ci]"
                ;;
            *)
                git add status.md
                git commit -m "chore: update status.md - $timestamp [skip ci]"
                ;;
        esac
        
        log_success "Changes committed to status.md"
        return 0
    else
        log_info "No changes to commit"
        return 1
    fi
}

# Main command dispatcher
case "${1:-help}" in
    "update-timestamp")
        update_timestamp
        ;;
    "update-ci")
        update_ci_status "$2" "$3"
        update_timestamp
        ;;
    "update-pr")
        update_pr_status "$2" "$3" "$4"
        ;;
    "finalize-pr") 
        finalize_pr_completion "$2" "$3" "$4" "$5"
        ;;
    "add-changelog")
        add_changelog_entry "$2" "$3" "$4"
        ;;
    "commit")
        commit_changes "$2" "$3"
        ;;
    "next-pr")
        next_pr=$(get_next_pr)
        echo "Next PR to implement: PR${next_pr}"
        ;;
    "auto-complete-pr09")
        # Special case for completing PR09 which is currently in progress
        finalize_pr_completion "09" "Projects & Budgets with Maps" "Complete MapLibre integration, project CRUD, Sankey charts, and CSV export functionality" "10"
        commit_changes "pr-completion" "PR09 Projects & Budgets"
        ;;
    "help"|*)
        echo "🚀 Advanced Status Automation System"
        echo "===================================="
        echo ""
        echo "Usage: $0 <command> [args...]"
        echo ""
        echo "Commands:"
        echo "  update-timestamp                           - Update last modified timestamp"
        echo "  update-ci <status> [details]              - Update CI health (success|failure|warning)"
        echo "  update-pr <pr> <status> [next_phase]      - Update PR status (completed|in-progress|blocked)"
        echo "  finalize-pr <pr> <title> [desc] [next]    - Complete PR with changelog and phase update"
        echo "  add-changelog <pr> <title> [description]  - Add changelog entry"
        echo "  commit <type> [context]                   - Commit changes (ci|pr-completion|milestone|auto)"
        echo "  next-pr                                   - Show next PR to implement"
        echo "  auto-complete-pr09                       - Complete PR09 automatically"
        echo "  help                                      - Show this help"
        echo ""
        echo "Examples:"
        echo "  $0 update-ci success"
        echo "  $0 finalize-pr 10 'Smart & Carbon Features' 'Carbon calculator and solar ROI tools' 11"
        echo "  $0 auto-complete-pr09"
        echo ""
        ;;
esac