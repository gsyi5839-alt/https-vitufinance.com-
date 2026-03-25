const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  // 列出所有表的结构
  const [tables] = await conn.execute("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME", [process.env.DB_NAME]);
  
  console.log('=== ALL TABLES IN DATABASE ===');
  for (const table of tables) {
    console.log(table.TABLE_NAME);
  }

  // 查询 deposit_records 表结构
  console.log('\n=== DEPOSIT_RECORDS COLUMNS ===');
  const [depCols] = await conn.execute("DESCRIBE deposit_records");
  console.log(JSON.stringify(depCols, null, 2));

  // 查询 user_balances 表结构
  console.log('\n=== USER_BALANCES COLUMNS ===');
  const [balCols] = await conn.execute("DESCRIBE user_balances");
  console.log(JSON.stringify(balCols, null, 2));

  // 列出 deposit_records 中所有唯一的 wallet_address
  console.log('\n=== SAMPLE DEPOSIT RECORDS (last 10) ===');
  const [deps] = await conn.execute('SELECT id, wallet_address, amount, status, created_at FROM deposit_records ORDER BY id DESC LIMIT 10');
  console.log(JSON.stringify(deps, null, 2));

  // 列出 user_balances 中所有唯一的 wallet_address
  console.log('\n=== SAMPLE USER_BALANCES (last 10) ===');
  const [bals] = await conn.execute('SELECT id, wallet_address, usdt_balance, total_deposit, updated_at FROM user_balances ORDER BY id DESC LIMIT 10');
  console.log(JSON.stringify(bals, null, 2));

  await conn.end();
}

check().catch(console.error);
