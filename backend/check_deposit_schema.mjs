import mysql from 'mysql2/promise';

const config = {
  host: '127.0.0.1',
  port: 3306,
  user: '10193427',
  password: 'xie080886',
  database: 'xie080886'
};

async function checkSchema() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    
    // 查询 deposit_records 表结构
    const [depositColumns] = await connection.query(
      'DESCRIBE deposit_records'
    );
    console.log('deposit_records 表列：');
    depositColumns.forEach(col => {
      console.log(`  - ${col.Field}`);
    });
    
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkSchema();
