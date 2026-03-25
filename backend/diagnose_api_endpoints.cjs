const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function diagnose() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const addr1 = '0x9e0100cfb7274a473bb6e205c0b430071711484f';
  const addr2 = '0x9e0e66411e2506d3f2b8d2e48f4dddf6ad11484f';

  console.log('====== DIAGNOSTIC REPORT ======\n');
  
  // Address 1 in user_balances
  console.log('ADDRESS 1: 0x9e0100cfb7274a473bb6e205c0b430071711484f');
  const [bal1] = await conn.execute(
    'SELECT id, wallet_address, usdt_balance, total_deposit, updated_at FROM user_balances WHERE LOWER(wallet_address) = ?',
    [addr1.toLowerCase()]
  );
  console.log('  Status: user_balances record EXISTS');
  console.log('  USDT Balance:', bal1[0]?.usdt_balance || '0');
  console.log('  Total Deposit:', bal1[0]?.total_deposit || '0');
  console.log('  Last Updated:', bal1[0]?.updated_at || 'N/A');

  const [dep1] = await conn.execute(
    'SELECT COUNT(*) as cnt, SUM(amount) as total FROM deposit_records WHERE LOWER(wallet_address) = ? AND status = "completed"',
    [addr1.toLowerCase()]
  );
  console.log('  Completed Deposits:', dep1[0].cnt, 'records, Total:', dep1[0].total || '0');

  console.log('\nADDRESS 2: 0x9e0e66411e2506d3f2b8d2e48f4dddf6ad11484f');
  const [bal2] = await conn.execute(
    'SELECT id, wallet_address, usdt_balance, total_deposit, updated_at FROM user_balances WHERE LOWER(wallet_address) = ?',
    [addr2.toLowerCase()]
  );
  console.log('  Status: user_balances record EXISTS');
  console.log('  USDT Balance:', bal2[0]?.usdt_balance || '0');
  console.log('  Total Deposit:', bal2[0]?.total_deposit || '0');
  console.log('  Last Updated:', bal2[0]?.updated_at || 'N/A');

  const [dep2] = await conn.execute(
    'SELECT COUNT(*) as cnt, SUM(amount) as total FROM deposit_records WHERE LOWER(wallet_address) = ? AND status = "completed"',
    [addr2.toLowerCase()]
  );
  console.log('  Completed Deposits:', dep2[0].cnt, 'records, Total:', dep2[0].total || '0');

  console.log('\n====== API ENDPOINT ANALYSIS ======');
  console.log('Backend Endpoints Available:');
  console.log('  ✓ GET /api/user/balance?wallet_address=... (returns user_balances)');
  console.log('  ✓ GET /api/user/deposits?wallet_address=... (returns deposit_records)');
  console.log('  ✓ GET /api/deposit/history?wallet_address=... (returns deposit_records)');
  console.log('\nFrontend Endpoints Called:');
  console.log('  Assets.vue:');
  console.log('    ✓ /api/user/balance (via fetch)');
  console.log('    ✓ /api/deposit/history (via fetch)');
  console.log('  useAssetsData.js (used by AssetsOptimized.vue):');
  console.log('    ✗ /api/deposit/records (DOES NOT EXIST - returns 404)');
  console.log('    ✓ /api/user/balance (correct)');

  await conn.end();
}

diagnose().catch(console.error);
