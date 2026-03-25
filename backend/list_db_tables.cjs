const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  const [tables] = await conn.execute("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?", [process.env.DB_NAME]);
  console.log('Available tables:', tables.map(t => t.TABLE_NAME).join(', '));
  
  // 检查是否存在包含 user 或 balance 或 deposit 的表
  const filtered = tables.filter(t => 
    t.TABLE_NAME.toLowerCase().includes('user') || 
    t.TABLE_NAME.toLowerCase().includes('balance') || 
    t.TABLE_NAME.toLowerCase().includes('deposit')
  );
  console.log('\nRelevant tables:', filtered.map(t => t.TABLE_NAME).join(', '));

  await conn.end();
}

check().catch(console.error);
