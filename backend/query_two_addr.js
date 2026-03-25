const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const addr1 = '0x9e0100cfb7274a473bb6e205c0b430071711484f';
  const addr2 = '0x9e0e66411e2506d3f2b8d2e48f4dddf6ad11484f';

  console.log('=== Address 1 in deposit_records ===');
  const [dep1] = await conn.execute('SELECT * FROM deposit_records WHERE LOWER(wallet_address) = ?', [addr1.toLowerCase()]);
  console.log(JSON.stringify(dep1, null, 2));

  console.log('\n=== Address 2 in deposit_records ===');
  const [dep2] = await conn.execute('SELECT * FROM deposit_records WHERE LOWER(wallet_address) = ?', [addr2.toLowerCase()]);
  console.log(JSON.stringify(dep2, null, 2));

  console.log('\n=== Address 1 in user_balances ===');
  const [bal1] = await conn.execute('SELECT * FROM user_balances WHERE LOWER(wallet_address) = ?', [addr1.toLowerCase()]);
  console.log(JSON.stringify(bal1, null, 2));

  console.log('\n=== Address 2 in user_balances ===');
  const [bal2] = await conn.execute('SELECT * FROM user_balances WHERE LOWER(wallet_address) = ?', [addr2.toLowerCase()]);
  console.log(JSON.stringify(bal2, null, 2));

  await conn.end();
}

check().catch(console.error);
