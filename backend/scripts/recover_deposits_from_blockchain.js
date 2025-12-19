/**
 * 从区块链恢复充值记录
 * 通过 BSCScan API 查询平台收款地址收到的所有 USDT 转账
 * 
 * 使用方法:
 * node scripts/recover_deposits_from_blockchain.js
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const CONFIG = {
  // 平台收款地址
  PLATFORM_WALLET: '0x0290df8A512Eff68d0B0a3ECe1E3F6aAB49d79D4',
  
  // BSC USDT 合约地址
  USDT_CONTRACT: '0x55d398326f99059fF775485246999027B3197955',
  
  // BSCScan API (免费 API 限制 5次/秒)
  BSCSCAN_API: 'https://api.bscscan.com/api',
  
  // BSCScan API Key (可选，没有的话用免费额度)
  BSCSCAN_API_KEY: process.env.BSCSCAN_API_KEY || '',
  
  // 恢复的钱包地址文件
  RECOVERED_WALLETS_FILE: '/www/backup/recovered_data/recovered_wallets_20251220.txt',
  
  // 输出文件
  OUTPUT_DIR: '/www/backup/recovered_data',
};

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 格式化金额 (USDT 有 18 位小数)
const formatAmount = (value) => {
  const amount = BigInt(value);
  const decimals = BigInt(10 ** 18);
  const whole = amount / decimals;
  const fraction = amount % decimals;
  return parseFloat(`${whole}.${fraction.toString().padStart(18, '0').slice(0, 4)}`);
};

// 格式化时间戳
const formatTimestamp = (timestamp) => {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toISOString().replace('T', ' ').slice(0, 19);
};

/**
 * 查询平台收款地址收到的所有 USDT 转账
 */
async function queryIncomingUSDTTransfers() {
  console.log('📊 开始查询区块链充值记录...\n');
  console.log(`平台收款地址: ${CONFIG.PLATFORM_WALLET}`);
  console.log(`USDT 合约地址: ${CONFIG.USDT_CONTRACT}\n`);
  
  try {
    const params = {
      module: 'account',
      action: 'tokentx',
      contractaddress: CONFIG.USDT_CONTRACT,
      address: CONFIG.PLATFORM_WALLET,
      sort: 'desc',
      apikey: CONFIG.BSCSCAN_API_KEY || undefined,
    };
    
    console.log('正在从 BSCScan 查询数据...');
    const response = await axios.get(CONFIG.BSCSCAN_API, { params });
    
    if (response.data.status !== '1') {
      console.log('⚠️ API 返回错误或无数据:', response.data.message);
      return [];
    }
    
    const transfers = response.data.result;
    console.log(`✅ 找到 ${transfers.length} 条 USDT 交易记录\n`);
    
    // 筛选转入记录 (to 地址是平台地址)
    const deposits = transfers.filter(tx => 
      tx.to.toLowerCase() === CONFIG.PLATFORM_WALLET.toLowerCase()
    );
    
    console.log(`📥 其中充值转入记录: ${deposits.length} 条\n`);
    
    return deposits.map(tx => ({
      txHash: tx.hash,
      from: tx.from,
      to: tx.to,
      amount: formatAmount(tx.value),
      amountRaw: tx.value,
      timestamp: formatTimestamp(tx.timeStamp),
      timestampRaw: tx.timeStamp,
      blockNumber: tx.blockNumber,
      confirmations: tx.confirmations,
    }));
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    return [];
  }
}

/**
 * 读取已恢复的钱包地址
 */
function loadRecoveredWallets() {
  try {
    if (fs.existsSync(CONFIG.RECOVERED_WALLETS_FILE)) {
      const content = fs.readFileSync(CONFIG.RECOVERED_WALLETS_FILE, 'utf8');
      return content.split('\n')
        .map(line => line.trim().toLowerCase())
        .filter(line => line.startsWith('0x'));
    }
  } catch (error) {
    console.error('读取钱包文件失败:', error.message);
  }
  return [];
}

/**
 * 生成恢复报告
 */
function generateReport(deposits, recoveredWallets) {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    区块链充值记录恢复报告                      ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  // 统计
  const totalDeposits = deposits.length;
  const totalAmount = deposits.reduce((sum, d) => sum + d.amount, 0);
  const uniqueUsers = new Set(deposits.map(d => d.from.toLowerCase())).size;
  
  console.log('📊 总体统计:');
  console.log(`   总充值笔数: ${totalDeposits}`);
  console.log(`   总充值金额: ${totalAmount.toFixed(4)} USDT`);
  console.log(`   充值用户数: ${uniqueUsers}`);
  console.log('');
  
  // 匹配已恢复的钱包
  const recoveredSet = new Set(recoveredWallets);
  const matchedDeposits = deposits.filter(d => recoveredSet.has(d.from.toLowerCase()));
  const unmatchedDeposits = deposits.filter(d => !recoveredSet.has(d.from.toLowerCase()));
  
  console.log('🔍 与已恢复钱包匹配:');
  console.log(`   匹配到的充值: ${matchedDeposits.length} 笔`);
  console.log(`   未匹配的充值: ${unmatchedDeposits.length} 笔`);
  console.log('');
  
  // 详细充值记录
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                        详细充值记录                            ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  deposits.forEach((d, index) => {
    const isMatched = recoveredSet.has(d.from.toLowerCase()) ? '✅' : '❓';
    console.log(`${index + 1}. ${isMatched} 充值记录`);
    console.log(`   发送地址: ${d.from}`);
    console.log(`   金额: ${d.amount} USDT`);
    console.log(`   时间: ${d.timestamp}`);
    console.log(`   交易哈希: ${d.txHash}`);
    console.log(`   区块号: ${d.blockNumber}`);
    console.log('');
  });
  
  return {
    summary: {
      totalDeposits,
      totalAmount,
      uniqueUsers,
      matchedCount: matchedDeposits.length,
      unmatchedCount: unmatchedDeposits.length,
    },
    deposits,
    matchedDeposits,
    unmatchedDeposits,
  };
}

/**
 * 保存恢复数据
 */
function saveRecoveredData(report) {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  // 保存 JSON 格式
  const jsonFile = path.join(CONFIG.OUTPUT_DIR, `blockchain_deposits_${timestamp}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(report, null, 2));
  console.log(`✅ JSON 数据已保存: ${jsonFile}`);
  
  // 保存 CSV 格式
  const csvFile = path.join(CONFIG.OUTPUT_DIR, `blockchain_deposits_${timestamp}.csv`);
  const csvHeader = 'from,amount,timestamp,txHash,blockNumber,matched\n';
  const csvRows = report.deposits.map(d => {
    const matched = report.matchedDeposits.some(m => m.txHash === d.txHash) ? 'Yes' : 'No';
    return `${d.from},${d.amount},${d.timestamp},${d.txHash},${d.blockNumber},${matched}`;
  }).join('\n');
  fs.writeFileSync(csvFile, csvHeader + csvRows);
  console.log(`✅ CSV 数据已保存: ${csvFile}`);
  
  // 保存 SQL 恢复脚本
  const sqlFile = path.join(CONFIG.OUTPUT_DIR, `restore_deposits_${timestamp}.sql`);
  let sqlContent = `-- 充值记录恢复 SQL 脚本
-- 生成时间: ${new Date().toISOString()}
-- 数据来源: BSCScan 区块链查询
-- 平台地址: ${CONFIG.PLATFORM_WALLET}

-- 注意: 执行前请检查数据是否正确，避免重复插入

`;
  
  report.deposits.forEach(d => {
    sqlContent += `-- 充值: ${d.from} -> ${d.amount} USDT @ ${d.timestamp}
INSERT INTO deposit_records (wallet_address, amount, token, tx_hash, status, created_at, confirmed_at)
SELECT '${d.from}', ${d.amount}, 'USDT', '${d.txHash}', 'confirmed', '${d.timestamp}', '${d.timestamp}'
WHERE NOT EXISTS (SELECT 1 FROM deposit_records WHERE tx_hash = '${d.txHash}');

`;
  });
  
  // 更新用户余额的 SQL
  sqlContent += `
-- =====================================================
-- 更新用户余额 (请谨慎执行)
-- =====================================================

`;
  
  // 按用户汇总充值
  const userDeposits = {};
  report.deposits.forEach(d => {
    const addr = d.from.toLowerCase();
    if (!userDeposits[addr]) {
      userDeposits[addr] = { address: d.from, total: 0, count: 0 };
    }
    userDeposits[addr].total += d.amount;
    userDeposits[addr].count++;
  });
  
  Object.values(userDeposits).forEach(u => {
    sqlContent += `-- 用户 ${u.address} 共充值 ${u.count} 笔，总计 ${u.total.toFixed(4)} USDT
UPDATE user_balances 
SET total_deposit = ${u.total.toFixed(4)}, usdt_balance = usdt_balance + ${u.total.toFixed(4)}
WHERE wallet_address = '${u.address}' 
  AND total_deposit < ${u.total.toFixed(4)};

`;
  });
  
  fs.writeFileSync(sqlFile, sqlContent);
  console.log(`✅ SQL 恢复脚本已保存: ${sqlFile}`);
}

/**
 * 主函数
 */
async function main() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════════════╗');
  console.log('║       VituFinance 区块链充值记录恢复工具                       ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  // 读取已恢复的钱包
  const recoveredWallets = loadRecoveredWallets();
  console.log(`📁 已加载 ${recoveredWallets.length} 个恢复的钱包地址\n`);
  
  // 查询区块链
  const deposits = await queryIncomingUSDTTransfers();
  
  if (deposits.length === 0) {
    console.log('❌ 未找到充值记录');
    console.log('');
    console.log('可能的原因:');
    console.log('1. 平台收款地址没有收到过 USDT 转账');
    console.log('2. BSCScan API 限流，请稍后重试');
    console.log('3. 网络连接问题');
    return;
  }
  
  // 生成报告
  const report = generateReport(deposits, recoveredWallets);
  
  // 保存数据
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                        保存恢复数据                            ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  saveRecoveredData(report);
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                          完成                                  ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log('📌 后续步骤:');
  console.log('1. 检查生成的 CSV 和 JSON 文件确认数据正确');
  console.log('2. 仔细审查 SQL 恢复脚本');
  console.log('3. 在测试环境验证后再执行 SQL');
  console.log('4. 执行前备份当前数据库');
  console.log('');
}

// 运行
main().catch(console.error);

