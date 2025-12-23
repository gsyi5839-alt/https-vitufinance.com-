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
