#!/bin/bash
# Prepare for PR09 - Projects & Budgets with Maps implementation
# This script sets up the foundation for MapLibre integration and project management

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🚀 Preparing for PR09 - Projects & Budgets with Maps"
echo "=================================================="

# Update status.md to reflect PR09 start
echo "📋 Updating status.md for PR09..."
STATUS_FILE="$ROOT_DIR/status.md"

# Update current phase
sed -i.bak "s/\*\*Current Phase:\*\* .*/\*\*Current Phase:\*\* PR09 Projects \& Budgets with Maps *(In Progress)*/" "$STATUS_FILE"

# Update upcoming plan
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M:%S UTC')
sed -i.bak "s/\*\*Last Updated:\*\* [0-9-]* [0-9:]* UTC/\*\*Last Updated:\*\* $TIMESTAMP/g" "$STATUS_FILE"

# Add PR09 progress section
if ! grep -q "## 🏗️ PR09 Progress" "$STATUS_FILE"; then
    # Find the line after PR08 Progress section and add PR09 section
    awk '
    /^## 🏗️ PR08 Progress/ { in_pr08 = 1; print; next }
    in_pr08 && /^## 🏗️ PR07 Progress/ { 
        print "## 🏗️ PR09 Progress (In Progress)"
        print "**Projects & Budgets with Maps** - Implementation per 18-PR roadmap:"
        print "- [ ] MapLibre integration with configurable tile servers"
        print "- [ ] Project CRUD interface with milestone tracking"
        print "- [ ] Geotagged project locations and mapping"
        print "- [ ] Budget vs spent tracking with data models"
        print "- [ ] Sankey chart budget explorer using d3-sankey"
        print "- [ ] CSV export functionality for project data"
        print "- [ ] Project document management and change logs"
        print "- [ ] Admin interface for project management"
        print "- [ ] TypeScript types and comprehensive error handling"
        print "- [ ] Mobile-responsive design and i18n support"
        print ""
        in_pr08 = 0
        print
        next
    }
    { print }
    ' "$STATUS_FILE" > "$STATUS_FILE.tmp" && mv "$STATUS_FILE.tmp" "$STATUS_FILE"
fi

# Clean up backup
rm -f "$STATUS_FILE.bak"

echo "✅ Status updated for PR09 start"

# Check if MapLibre dependencies need to be added
echo "📦 Checking project dependencies for PR09..."

PACKAGE_JSON="$ROOT_DIR/package.json"

# Check if MapLibre dependencies are present
if ! grep -q "maplibre-gl" "$PACKAGE_JSON"; then
    echo "⚠️  MapLibre dependencies not found in package.json"
    echo "   The following dependencies should be added for PR09:"
    echo "   - maplibre-gl: Map rendering library"
    echo "   - d3-sankey: For Sankey budget diagrams" 
    echo "   - @types/d3-sankey: TypeScript types"
    echo "   - @turf/turf: For geospatial operations"
else
    echo "✅ MapLibre dependencies already configured"
fi

# Check if Prisma schema has project-related models
PRISMA_SCHEMA="$ROOT_DIR/prisma/schema.prisma"

if ! grep -q "model Project" "$PRISMA_SCHEMA"; then
    echo "⚠️  Project models not found in Prisma schema"
    echo "   The following models should be added for PR09:"
    echo "   - Project: Main project entity"
    echo "   - ProjectMilestone: Project milestones with geo data"
    echo "   - BudgetLine: Budget tracking"
    echo "   - ProjectDocument: Document management"
else
    echo "✅ Project models already configured"
fi

# Create directory structure for PR09 if it doesn't exist
echo "📁 Setting up directory structure..."

DIRS_TO_CREATE=(
    "$ROOT_DIR/lib/maps"
    "$ROOT_DIR/lib/projects" 
    "$ROOT_DIR/components/maps"
    "$ROOT_DIR/components/projects"
    "$ROOT_DIR/app/admin/projects"
    "$ROOT_DIR/app/api/projects"
    "$ROOT_DIR/public/maps"
)

for dir in "${DIRS_TO_CREATE[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "   Creating: $dir"
        mkdir -p "$dir"
    else
        echo "   Exists: $dir"
    fi
done

echo ""
echo "🎯 PR09 Preparation Summary"
echo "=========================="
echo "✅ Status updated to reflect PR09 start"
echo "✅ Directory structure prepared"
echo "📋 Next steps for PR09 implementation:"
echo "   1. Add MapLibre and d3-sankey dependencies"
echo "   2. Create Project, ProjectMilestone, BudgetLine models"
echo "   3. Implement MapLibre integration component"
echo "   4. Build project CRUD interface"
echo "   5. Add Sankey chart budget explorer"
echo "   6. Implement CSV export functionality"
echo ""
echo "🚀 Ready to start PR09 implementation!"