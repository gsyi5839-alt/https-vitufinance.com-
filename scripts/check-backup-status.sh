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
BACKUP_COUNT=$(find "$BACKUP_DIR" -maxdepth 1 -name "*.sql.gz" -type f 2>/dev/null | wc -l)
DAILY_COUNT=$(find "$PROJECT_DIR/backups/daily" -maxdepth 1 -name "*.sql.gz" -type f 2>/dev/null | wc -l)
EMERGENCY_COUNT=$(find "$PROJECT_DIR/backups/emergency" -maxdepth 1 -name "*.sql.gz" -type f 2>/dev/null | wc -l)
TRACKED_COUNT=$(git -C "$PROJECT_DIR" ls-files backups 2>/dev/null | wc -l)
echo "Database backups: $BACKUP_COUNT"
echo "Daily backups: $DAILY_COUNT"
echo "Emergency backups: $EMERGENCY_COUNT"
echo "Git-tracked backup files: $TRACKED_COUNT"
echo ""

# Show recent backups
echo "Recent backups:"
find "$PROJECT_DIR/backups" -maxdepth 2 -name "*.sql.gz" -type f -printf '%TY-%Tm-%Td %TH:%TM %s %p\n' 2>/dev/null | sort | tail -10 || echo "  No backups found"
echo ""

# Show last backup log entries
echo "Last backup log entries:"
tail -20 "$PROJECT_DIR/backups/backup.log" 2>/dev/null || echo "  No log found"
echo ""

# Check cron job status
echo "Cron job status:"
crontab -l 2>/dev/null | grep -E "backup-database" || echo "  No backup cron job found"
echo ""

echo "Git push status:"
git -C "$PROJECT_DIR" status -sb 2>/dev/null || echo "  Git status unavailable"
