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
  
  const [tables] = await conn.execute('SHOW TABLES');
  console.log('=== All Tables ===');
  console.log(JSON.stringify(tables, null, 2));
  
  // 检查数据库名
  const [db] = await conn.execute('SELECT DATABASE()');
  console.log('\n=== Current Database ===');
  console.log(JSON.stringify(db, null, 2));
  
  await conn.end();
}
check().catch(console.error);
