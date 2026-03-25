const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const addr1 = '0x9e0100cfb7274a473bb6e205c0b430071711484f';
  const addr2 = '0x9e0e66411e2506d3f2b8d2e48f4dddf6ad11484f';

  // 检查 users 表
  console.log('=== USERS TABLE ===');
  const [users1] = await conn.execute('SELECT id, wallet_address, email, created_at FROM users WHERE LOWER(wallet_address) = ?', [addr1.toLowerCase()]);
  console.log('Address 1 users:', JSON.stringify(users1, null, 2));
  const [users2] = await conn.execute('SELECT id, wallet_address, email, created_at FROM users WHERE LOWER(wallet_address) = ?', [addr2.toLowerCase()]);
  console.log('Address 2 users:', JSON.stringify(users2, null, 2));

  // 检查 user_balances 表
  console.log('\n=== USER_BALANCES TABLE ===');
  const [bal1] = await conn.execute('SELECT * FROM user_balances WHERE LOWER(wallet_address) = ?', [addr1.toLowerCase()]);
  console.log('Address 1 balances:', JSON.stringify(bal1, null, 2));
  const [bal2] = await conn.execute('SELECT * FROM user_balances WHERE LOWER(wallet_address) = ?', [addr2.toLowerCase()]);
  console.log('Address 2 balances:', JSON.stringify(bal2, null, 2));

  // 检查 deposit_records 表
  console.log('\n=== DEPOSIT_RECORDS TABLE ===');
  const [dep1] = await conn.execute('SELECT * FROM deposit_records WHERE LOWER(wallet_address) = ?', [addr1.toLowerCase()]);
  console.log('Address 1 deposits:', JSON.stringify(dep1, null, 2));
  const [dep2] = await conn.execute('SELECT * FROM deposit_records WHERE LOWER(wallet_address) = ?', [addr2.toLowerCase()]);
  console.log('Address 2 deposits:', JSON.stringify(dep2, null, 2));

  // 模糊搜索包含 9e0 的地址
  console.log('\n=== FUZZY SEARCH (9e0) ===');
  const [fuzzyUsers] = await conn.execute("SELECT id, wallet_address FROM users WHERE wallet_address LIKE '%9e0%'");
  console.log('Fuzzy users:', JSON.stringify(fuzzyUsers, null, 2));
  const [fuzzyBal] = await conn.execute("SELECT wallet_address, usdt_balance, total_deposit FROM user_balances WHERE wallet_address LIKE '%9e0%'");
  console.log('Fuzzy balances:', JSON.stringify(fuzzyBal, null, 2));
  const [fuzzyDep] = await conn.execute("SELECT id, wallet_address, amount, status FROM deposit_records WHERE wallet_address LIKE '%9e0%'");
  console.log('Fuzzy deposits:', JSON.stringify(fuzzyDep, null, 2));

  // 检查最近插入的deposit_records和user_balances（最近5条）
  console.log('\n=== LATEST RECORDS ===');
  const [latestDep] = await conn.execute('SELECT id, wallet_address, amount, status, created_at FROM deposit_records ORDER BY id DESC LIMIT 5');
  console.log('Latest deposits:', JSON.stringify(latestDep, null, 2));
  const [latestBal] = await conn.execute('SELECT id, wallet_address, usdt_balance, total_deposit, updated_at FROM user_balances ORDER BY updated_at DESC LIMIT 5');
  console.log('Latest balances:', JSON.stringify(latestBal, null, 2));

  await conn.end();
}

check().catch(console.error);
