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
    console.log('✓ 数据库连接成功\n');
    
    // 查询 deposit_records 表结构
    const [depositColumns] = await connection.query(
      'DESCRIBE deposit_records'
    );
    console.log('[deposit_records 表结构]');
    console.log(JSON.stringify(depositColumns, null, 2));
    
    // 查询 user_balances 表结构
    const [balanceColumns] = await connection.query(
      'DESCRIBE user_balances'
    );
    console.log('\n[user_balances 表结构]');
    console.log(JSON.stringify(balanceColumns, null, 2));
    
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
