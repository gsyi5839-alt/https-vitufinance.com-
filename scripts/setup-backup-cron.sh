#!/bin/bash
# =============================================================================
# Setup Automatic Database Backup Cron Job
# 
# This script sets up a cron job to automatically backup the database
# every 3 days and push to Git for disaster recovery
#
# Usage: sudo ./setup-backup-cron.sh
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-database.sh"
CRON_LOG="$PROJECT_DIR/backups/backup-cron.log"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  VituFinance Database Backup Cron Setup  ${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}Note: Running without sudo. Will configure for current user.${NC}"
fi

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo -e "${RED}ERROR: Backup script not found at $BACKUP_SCRIPT${NC}"
    exit 1
fi

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"
echo -e "${GREEN}✓ Backup script is executable${NC}"

# Create backup directories if not exist
mkdir -p "$PROJECT_DIR/backups/database"
echo -e "${GREEN}✓ Backup directories created${NC}"

# Configure Git for the backup commits
cd "$PROJECT_DIR"
git config user.email "backup@vitufinance.com" 2>/dev/null || true
git config user.name "VituFinance Backup Bot" 2>/dev/null || true
echo -e "${GREEN}✓ Git configured for backup commits${NC}"

# Create .gitignore entry to exclude large/sensitive files but include backups
if ! grep -q "!backups/database" "$PROJECT_DIR/.gitignore" 2>/dev/null; then
    echo "" >> "$PROJECT_DIR/.gitignore"
    echo "# Include database backups for disaster recovery" >> "$PROJECT_DIR/.gitignore"
    echo "!backups/database/*.sql.gz" >> "$PROJECT_DIR/.gitignore"
    echo "!backups/backup.log" >> "$PROJECT_DIR/.gitignore"
    echo -e "${GREEN}✓ Updated .gitignore for backups${NC}"
fi

# Cron job configuration
# Run at 3:00 AM every 3 days
CRON_SCHEDULE="0 3 */3 * *"
CRON_CMD="cd $PROJECT_DIR && $BACKUP_SCRIPT >> $CRON_LOG 2>&1"

# Check if cron job already exists
EXISTING_CRON=$(crontab -l 2>/dev/null | grep -F "$BACKUP_SCRIPT" || true)

if [ -n "$EXISTING_CRON" ]; then
    echo -e "${YELLOW}Cron job already exists. Updating...${NC}"
    # Remove existing cron job
    crontab -l 2>/dev/null | grep -v -F "$BACKUP_SCRIPT" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null || true; echo "$CRON_SCHEDULE $CRON_CMD") | crontab -

echo -e "${GREEN}✓ Cron job installed successfully${NC}"
echo ""
echo -e "${GREEN}Cron Schedule: Every 3 days at 3:00 AM${NC}"
echo -e "${GREEN}Cron Expression: $CRON_SCHEDULE${NC}"
echo ""

# Show current crontab
echo -e "${YELLOW}Current crontab entries:${NC}"
crontab -l 2>/dev/null | grep -E "(backup|BACKUP)" || echo "  (none found with 'backup' in name)"
echo ""

# Test the backup script (dry run info)
echo -e "${YELLOW}To test the backup script manually, run:${NC}"
echo "  $BACKUP_SCRIPT"
echo ""

# Create a simple status check script
cat > "$SCRIPT_DIR/check-backup-status.sh" << 'EOF'
#!/bin/bash
# Check the status of database backups

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups/database"

echo "========================================="
echo "  VituFinance Backup Status Check"
echo "========================================="
echo ""

# Count backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
echo "Total backups: $BACKUP_COUNT"
echo ""

# Show recent backups
echo "Recent backups:"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -5 || echo "  No backups found"
echo ""

# Show last backup log entries
echo "Last backup log entries:"
tail -20 "$PROJECT_DIR/backups/backup.log" 2>/dev/null || echo "  No log found"
echo ""

# Check cron job status
echo "Cron job status:"
crontab -l 2>/dev/null | grep -E "backup-database" || echo "  No backup cron job found"
EOF

chmod +x "$SCRIPT_DIR/check-backup-status.sh"
echo -e "${GREEN}✓ Created check-backup-status.sh script${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Run a manual backup to test: $BACKUP_SCRIPT"
echo "  2. Check backup status: $SCRIPT_DIR/check-backup-status.sh"
echo "  3. Monitor cron logs: tail -f $CRON_LOG"
echo ""

