import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });
  
  const targetAddress = '0x9e0100cfb7274a473bb6e205c0b430071711484f';
  
  // 1. 检查 users 表
  console.log('\n=== Users Table ===');
  const [users] = await conn.execute('SELECT * FROM users WHERE LOWER(wallet_address) = ?', [targetAddress.toLowerCase()]);
  console.log(JSON.stringify(users, null, 2));
  
  // 2. 检查 user_balances 表
  console.log('\n=== User Balances Table ===');
  const [balances] = await conn.execute('SELECT * FROM user_balances WHERE LOWER(wallet_address) = ?', [targetAddress.toLowerCase()]);
  console.log(JSON.stringify(balances, null, 2));
  
  // 3. 检查 deposit_records 表
  console.log('\n=== Deposit Records Table ===');
  const [deposits] = await conn.execute('SELECT * FROM deposit_records WHERE LOWER(wallet_address) = ?', [targetAddress.toLowerCase()]);
  console.log(JSON.stringify(deposits, null, 2));
  
  // 4. 用模糊查询再检查一次
  console.log('\n=== Fuzzy deposit_records matches ===');
  const [fuzzyDeposits] = await conn.execute('SELECT * FROM deposit_records WHERE wallet_address LIKE ?', ['%9e0100%']);
  console.log(JSON.stringify(fuzzyDeposits, null, 2));
  
  console.log('\n=== Fuzzy user_balances matches ===');
  const [fuzzyBalances] = await conn.execute('SELECT * FROM user_balances WHERE wallet_address LIKE ?', ['%9e0100%']);
  console.log(JSON.stringify(fuzzyBalances, null, 2));
  
  await conn.end();
}
check().catch(console.error);
