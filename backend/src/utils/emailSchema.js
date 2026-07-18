export async function ensureEmailSchema(dbQuery) {
  const userBalanceColumns = await dbQuery('SHOW COLUMNS FROM user_balances');
  const columnNames = new Set(userBalanceColumns.map((column) => column.Field));

  if (!columnNames.has('email')) {
    await dbQuery(
      'ALTER TABLE user_balances ADD COLUMN email VARCHAR(254) NULL AFTER wallet_address'
    );
  }

  if (!columnNames.has('email_bound_at')) {
    await dbQuery(
      'ALTER TABLE user_balances ADD COLUMN email_bound_at DATETIME NULL AFTER email'
    );
  }

  const indexes = await dbQuery('SHOW INDEX FROM user_balances');
  const indexNames = new Set(indexes.map((index) => index.Key_name));
  if (!indexNames.has('idx_user_balances_email')) {
    await dbQuery('ALTER TABLE user_balances ADD INDEX idx_user_balances_email (email)');
  }

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS email_send_logs (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      admin_username VARCHAR(50) NOT NULL,
      subject VARCHAR(200) NOT NULL,
      content TEXT NOT NULL,
      recipient_count INT UNSIGNED NOT NULL DEFAULT 0,
      success_count INT UNSIGNED NOT NULL DEFAULT 0,
      failure_count INT UNSIGNED NOT NULL DEFAULT 0,
      target_wallets LONGTEXT NULL,
      results_json LONGTEXT NULL,
      ip_address VARCHAR(45) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_email_send_logs_admin (admin_username),
      INDEX idx_email_send_logs_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}
