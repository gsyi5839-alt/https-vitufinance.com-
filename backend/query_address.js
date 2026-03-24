const mysql = require('mysql2/promise');

const config = {
  host: '127.0.0.1',
  port: 3306,
  user: '10193427',
  password: 'xie080886',
  database: 'xie080886'
};

const targetAddress = '0x9e0100cfb7274a473bb6e205c0b430071711484f';

async function runQueries() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('✓ 数据库连接成功');
    console.log('\n========================================');
    
    // Query 1: 查询该地址的充值记录
    console.log('\n[查询 1] 地址的充值记录：');
    console.log('SQL: SELECT id, wallet_address, amount, chain, tx_hash, status, created_at FROM deposit_records WHERE LOWER(wallet_address) = ? ORDER BY created_at DESC;');
    const [deposits] = await connection.query(
      'SELECT id, wallet_address, amount, chain, tx_hash, status, created_at FROM deposit_records WHERE LOWER(wallet_address) = ? ORDER BY created_at DESC',
      [targetAddress.toLowerCase()]
    );
    console.log('结果数: ', deposits.length);
    console.log(JSON.stringify(deposits, null, 2));
    
    // Query 2: 查询该地址的余额
    console.log('\n[查询 2] 地址的余额信息：');
    console.log('SQL: SELECT * FROM user_balances WHERE LOWER(wallet_address) = ?;');
    const [balances] = await connection.query(
      'SELECT * FROM user_balances WHERE LOWER(wallet_address) = ?',
      [targetAddress.toLowerCase()]
    );
    console.log('结果数: ', balances.length);
    console.log(JSON.stringify(balances, null, 2));
    
    // Query 3: 查询用户表信息
    console.log('\n[查询 3] 用户表信息：');
    console.log('SQL: SELECT id, wallet_address, created_at FROM users WHERE LOWER(wallet_address) = ?;');
    const [users] = await connection.query(
      'SELECT id, wallet_address, created_at FROM users WHERE LOWER(wallet_address) = ?',
      [targetAddress.toLowerCase()]
    );
    console.log('结果数: ', users.length);
    console.log(JSON.stringify(users, null, 2));
    
    // Query 4: 检查大小写不一致的重复地址
    console.log('\n[查询 4] user_balances 中大小写不一致的重复地址：');
    console.log('SQL: SELECT wallet_address, COUNT(*) as cnt FROM user_balances GROUP BY LOWER(wallet_address) HAVING cnt > 1;');
    const [duplicates] = await connection.query(
      'SELECT wallet_address, COUNT(*) as cnt FROM user_balances GROUP BY LOWER(wallet_address) HAVING COUNT(*) > 1'
    );
    console.log('结果数: ', duplicates.length);
    console.log(JSON.stringify(duplicates, null, 2));
    
    // Query 5: 查看 deposit_records 表中最新的10条记录
    console.log('\n[查询 5] deposit_records 表最新的 10 条记录：');
    console.log('SQL: SELECT id, wallet_address, amount, chain, status, created_at FROM deposit_records ORDER BY id DESC LIMIT 10;');
    const [recent] = await connection.query(
      'SELECT id, wallet_address, amount, chain, status, created_at FROM deposit_records ORDER BY id DESC LIMIT 10'
    );
    console.log('结果数: ', recent.length);
    console.log(JSON.stringify(recent, null, 2));
    
    // Query 6: 检查 PLATFORM_WALLET 配置
    console.log('\n[检查 6] .env 配置中的 PLATFORM_WALLET：');
    console.log('PLATFORM_WALLET_ADDRESS=0x537BD2D898a64b0214FfefD8910E77FA89c6B2bB');
    
    console.log('\n========================================');
    console.log('✓ 所有查询完成');
    
  } catch (error) {
    console.error('错误:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

runQueries();
