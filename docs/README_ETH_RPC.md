# 以太坊 RPC 节点资源包

## 快速开始

如果你需要立即广播以太坊交易，使用这三个节点中的任一个：

```
https://eth.drpc.org
https://1rpc.io/eth
https://api.zan.top/eth-mainnet
```

## 文件指南

### 1. 快速参考（推荐新用户先读）

**文件**: `ETH_RPC_QUICK_REFERENCE.md`

快速查找：
- 17个推荐节点的完整列表
- 按响应速度分组
- 使用示例代码（Web3.js、Ethers.js、cURL）
- 常见问题和故障排除

**最适合**: 5分钟内快速上手

### 2. 完整技术报告（深度了解）

**文件**: `ETH_RPC_NODES_REPORT_20260325.md`

包含内容：
- 详细的搜索过程和方法论
- 所有测试数据和结果
- 性能对比分析
- 隐私和安全评估
- 故障排除深度指南
- 相关技术资源

**最适合**: 需要完整背景信息和技术深度

### 3. 自动广播工具（代码集成）

**文件**: `../scripts/broadcast-eth-transaction.js`

使用方式：
```bash
# 简单使用
node scripts/broadcast-eth-transaction.js 0xf8f9...

# 在代码中导入
const { broadcastTransaction } = require('./scripts/broadcast-eth-transaction.js');
broadcastTransaction(signedTx).then(result => console.log(result));
```

功能：
- 并发测试所有节点
- 自动故障转移
- 详细的错误诊断
- JSON-RPC 处理

**最适合**: 生产环境使用

### 4. 数据表格（自动化处理）

**文件**: `../backend/data/eth_rpc_nodes.csv`

适用于：
- 数据库导入
- 自动化脚本
- 监控系统
- 性能分析工具

## 使用场景

### 场景1：紧急广播交易

```javascript
// 使用最稳定的节点
const provider = new Web3('https://eth.drpc.org');
provider.eth.sendSignedTransaction(tx)
  .then(receipt => console.log('Success:', receipt))
  .catch(err => console.error('Failed:', err));
```

### 场景2：提高成功率（多节点）

```javascript
const RPC_URLS = [
  'https://eth.drpc.org',
  'https://1rpc.io/eth',
  'https://api.zan.top/eth-mainnet'
];

// 并发发送，谁先成功就用谁
Promise.race(
  RPC_URLS.map(url => new Web3(url).eth.sendSignedTransaction(tx))
).then(result => console.log('Sent via first available node'));
```

### 场景3：隐私优先（无追踪节点）

```javascript
// 使用隐私友好的节点
const privacyFriendly = [
  'https://eth.drpc.org',
  'https://1rpc.io/eth',
  'https://eth.llamarpc.com'
];
```

### 场景4：MEV防护（防机器人）

```javascript
// 使用 MEV 保护的节点
const protectedNodes = [
  'https://rpc.mevblocker.io',
  'https://rpc.flashbots.net'
];
```

## 节点分类速查

| 需求 | 推荐节点 | 特点 |
|------|---------|------|
| 最快 | api.zan.top/eth-mainnet | 135ms (国内) |
| 最稳 | eth.drpc.org | 99.9% uptime |
| 开源 | 1rpc.io/eth | 无追踪 |
| 隐私 | eth.llamarpc.com | 无追踪 |
| 防MEV | rpc.mevblocker.io | 防机器人抢先 |
| 全能 | ethereum-rpc.publicnode.com | 可靠 + 快速 |

## 故障排除

### 问题：所有节点都无法连接

**检查项**：
1. 网络连接正常？（ping etherscan.io）
2. 交易格式正确？（0x开头，有效的十六进制）
3. 账户有足够ETH？（需要gas费用）
4. Nonce值正确？（检查 eth_getTransactionCount）

### 问题：节点响应超时

**解决方案**：
1. 增加超时时间到 15-20 秒
2. 尝试其他推荐节点
3. 检查网络延迟

### 问题：交易被拒绝

**常见原因**：
- insufficient funds (余额不足)
- invalid nonce (Nonce错误)
- intrinsic gas too low (Gas太低)
- already known (交易已存在内存池)

## 定期维护

建议每周检查节点状态：

```bash
# 使用提供的脚本测试
node scripts/broadcast-eth-transaction.js 0x00

# 或手动测试关键节点
curl -X POST https://eth.drpc.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

## 关键知识点

### eth_sendRawTransaction 方法

**作用**: 将签名的交易广播到以太坊网络

**参数**: 签名后的交易十六进制（包括前缀 0x）

**返回**:
- 成功：交易哈希 (0x...)
- 失败：错误信息

### 交易签名流程

```
1. 准备交易对象
   ├─ to: 收款地址
   ├─ from: 发起地址
   ├─ value: 转账金额
   ├─ gas: gas限制
   ├─ gasPrice: gas价格
   ├─ nonce: 交易序号
   └─ data: 合约数据

2. 签名交易
   使用私钥对交易进行签名

3. 广播交易
   发送到 RPC 节点的 eth_sendRawTransaction 方法
```

## 监控和告警

推荐的监控方案：

```javascript
const healthCheck = async () => {
  const nodes = [
    'https://eth.drpc.org',
    'https://1rpc.io/eth'
  ];
  
  for (const url of nodes) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });
      if (!response.ok) {
        console.warn(`Node ${url} is down`);
      }
    } catch (err) {
      console.warn(`Node ${url} error: ${err.message}`);
    }
  }
};

// 每5分钟检查一次
setInterval(healthCheck, 5 * 60 * 1000);
```

## 相关文档

- Ethereum JSON-RPC 文档：https://ethereum.org/en/developers/docs/apis/json-rpc/
- Web3.js 使用指南：https://docs.web3js.org/
- Ethers.js 使用指南：https://docs.ethers.org/
- ChainList 官网：https://chainlist.org/

## 版本历史

| 版本 | 日期 | 更新内容 |
|------|------|---------|
| 1.0 | 2026-03-25 | 初始版本，包含17个节点 |

## 反馈和更新

如果发现任何节点无法使用或有更好的选择：

1. 更新 `eth_rpc_nodes.csv` 文件
2. 重新运行测试脚本验证
3. 更新相关文档

---

**最后更新**: 2026年3月25日  
**下次更新建议**: 2026年4月1日  
**维护人员**: 研究分析团队
