#!/bin/bash
# =============================================================================
# Database Backup Script for VituFinance
# 
# Features:
# - Automatic MySQL database backup
# - Compression with gzip
# - Push to Git repository for disaster recovery
# - Retention policy (keep last 7 days)
# - Detailed logging
# - Error notifications
#
# Schedule: Run every 3 days via cron (configured by setup-backup-cron.sh)
# Cron: 0 3 */3 * * (3:00 AM every 3 days)
# =============================================================================

set -o pipefail

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$PROJECT_DIR/backups/database"
ENV_FILE="$PROJECT_DIR/backend/.env"
LOG_FILE="$PROJECT_DIR/backups/backup.log"
MAX_LOG_SIZE=5242880  # 5MB max log size

# Date format for backup files
DATE=$(date +%Y-%m-%d)
DATETIME=$(date +%Y-%m-%d_%H-%M-%S)

# Retention settings
RETENTION_DAYS=7  # Keep backups for 7 days
MAX_BACKUPS=10    # Maximum number of backup files to keep

# =============================================================================
# Utility Functions
# =============================================================================

# Function to log messages with timestamp
log_message() {
    local level="${2:-INFO}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $1" | tee -a "$LOG_FILE"
}

# Function to log errors
log_error() {
    log_message "$1" "ERROR"
}

# Function to log warnings
log_warning() {
    log_message "$1" "WARN"
}

# Function to read env variable from .env file
get_env_var() {
    local var_name=$1
    local value=$(grep "^${var_name}=" "$ENV_FILE" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    echo "$value"
}

# Function to rotate log file if too large
rotate_log() {
    if [ -f "$LOG_FILE" ]; then
        local size=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null)
        if [ "$size" -gt "$MAX_LOG_SIZE" ]; then
            mv "$LOG_FILE" "${LOG_FILE}.old"
            log_message "Log file rotated (exceeded $MAX_LOG_SIZE bytes)"
        fi
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log_message "Cleaning up old backups..."
    
    # Remove backups older than retention period
    find "$BACKUP_DIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null
    find "$BACKUP_DIR" -name "*.sql" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null
    
    # Keep only MAX_BACKUPS most recent files
    local backup_count=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
    if [ "$backup_count" -gt "$MAX_BACKUPS" ]; then
        local to_delete=$((backup_count - MAX_BACKUPS))
        ls -1t "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -n "$to_delete" | xargs rm -f 2>/dev/null
        log_message "Removed $to_delete old backup(s) to maintain max $MAX_BACKUPS backups"
    fi
    
    local remaining=$(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
    log_message "Total backups retained: $remaining"
}

# Function to push to Git
push_to_git() {
    log_message "Pushing backup to Git repository..."
    
    cd "$PROJECT_DIR" || return 1
    
    # Configure Git if needed
    git config user.email "backup@vitufinance.com" 2>/dev/null || true
    git config user.name "VituFinance Backup Bot" 2>/dev/null || true
    
    # Add backup files
    git add backups/database/*.sql.gz 2>> "$LOG_FILE" || true
    git add backups/backup.log 2>> "$LOG_FILE" || true
    
    # Check if there are changes
    if git diff --cached --quiet 2>/dev/null; then
        log_message "No changes to commit"
        return 0
    fi
    
    # Create commit message with backup info
    local backup_info=$(ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -1 | awk '{print $5, $9}')
    local commit_msg="🗄️ Auto Backup: $DATE

Database: $(get_env_var 'DB_NAME')
Size: $(du -h "$BACKUP_DIR"/*.sql.gz 2>/dev/null | tail -1 | cut -f1)
Backups retained: $(ls -1 "$BACKUP_DIR"/*.sql.gz 2>/dev/null | wc -l)
Server: $(hostname)
"
    
    # Commit
    git commit -m "$commit_msg" >> "$LOG_FILE" 2>&1
    
    if [ $? -ne 0 ]; then
        log_error "Failed to create Git commit"
        return 1
    fi
    
    # Push to remote
    # Try main branch first, then master
    if git push origin main >> "$LOG_FILE" 2>&1; then
        log_message "Successfully pushed to 'main' branch"
        return 0
    elif git push origin master >> "$LOG_FILE" 2>&1; then
        log_message "Successfully pushed to 'master' branch"
        return 0
    else
        log_error "Failed to push to Git repository"
        return 1
    fi
}

# =============================================================================
# Main Backup Process
# =============================================================================

main() {
log_message "========== Starting database backup =========="
    log_message "Backup time: $DATETIME"
    log_message "Project: $PROJECT_DIR"
    
    # Rotate log if needed
    rotate_log

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
        log_error ".env file not found at $ENV_FILE"
    exit 1
fi

    # Read database configuration
DB_HOST=$(get_env_var "DB_HOST")
DB_PORT=$(get_env_var "DB_PORT")
DB_USER=$(get_env_var "DB_USER")
DB_PASSWORD=$(get_env_var "DB_PASSWORD")
DB_NAME=$(get_env_var "DB_NAME")

    # Set defaults
DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3306}
DB_USER=${DB_USER:-root}

# Validate required variables
if [ -z "$DB_NAME" ]; then
        log_error "DB_NAME not found in .env file"
    exit 1
fi

log_message "Database: $DB_NAME @ $DB_HOST:$DB_PORT"

    # Create backup directory
mkdir -p "$BACKUP_DIR"

    # Backup filename (include datetime for uniqueness)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${DATE}.sql"
BACKUP_FILE_GZ="$BACKUP_FILE.gz"

    # Remove old backup for today (update daily)
rm -f "$BACKUP_FILE" "$BACKUP_FILE_GZ" 2>/dev/null

# Perform MySQL dump
log_message "Creating database backup..."
    
    # Build mysqldump command
    # Note: Using --no-tablespaces to avoid PROCESS privilege requirement
    # Using --skip-routines if user lacks privilege to dump procedures
    local DUMP_CMD="mysqldump -h '$DB_HOST' -P '$DB_PORT' -u '$DB_USER'"
if [ -n "$DB_PASSWORD" ]; then
        DUMP_CMD="$DUMP_CMD -p'$DB_PASSWORD'"
    fi
    DUMP_CMD="$DUMP_CMD --single-transaction --triggers --add-drop-table --complete-insert --no-tablespaces '$DB_NAME'"
    
    # Execute dump
    eval "$DUMP_CMD" > "$BACKUP_FILE" 2>> "$LOG_FILE"
    
    local DUMP_EXIT_CODE=$?

# Check if backup was successful
    if [ $DUMP_EXIT_CODE -ne 0 ] || [ ! -s "$BACKUP_FILE" ]; then
        log_error "Database backup failed! Exit code: $DUMP_EXIT_CODE"
    rm -f "$BACKUP_FILE" 2>/dev/null
    exit 1
fi

# Get backup file size
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_message "Backup created: $(basename $BACKUP_FILE) ($BACKUP_SIZE)"

    # Compress backup
log_message "Compressing backup..."
    gzip -9 -f "$BACKUP_FILE"

    if [ $? -eq 0 ] && [ -f "$BACKUP_FILE_GZ" ]; then
    COMPRESSED_SIZE=$(du -h "$BACKUP_FILE_GZ" | cut -f1)
        log_message "Backup compressed: $(basename $BACKUP_FILE_GZ) ($COMPRESSED_SIZE)"
else
        log_warning "Compression failed, keeping uncompressed backup"
    BACKUP_FILE_GZ="$BACKUP_FILE"
fi

    # Cleanup old backups
    cleanup_old_backups

# Push to Git
    if push_to_git; then
        log_message "Git push completed successfully"
    else
        log_warning "Git push failed, backup saved locally"
    fi
    
    # Summary
    log_message "========================================="
    log_message "Backup Summary:"
    log_message "  File: $(basename $BACKUP_FILE_GZ)"
    log_message "  Size: $COMPRESSED_SIZE"
    log_message "  Location: $BACKUP_DIR"
log_message "========== Backup completed successfully =========="
log_message ""

exit 0
}

# Run main function
main "$@"
