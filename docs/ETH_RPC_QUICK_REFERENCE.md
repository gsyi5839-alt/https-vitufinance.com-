# ETH RPC 节点快速参考表

## 最推荐的三个节点（立即使用）

| 排名 | RPC URL | 响应 | 特点 | 推荐度 |
|------|---------|------|------|--------|
| 1 | https://api.zan.top/eth-mainnet | 135ms | 国内最快 | ★★★★★ |
| 2 | https://eth.drpc.org | 179ms | 全球稳定 | ★★★★★ |
| 3 | https://1rpc.io/eth | 215ms | 开源无追踪 | ★★★★★ |

## 完整推荐列表（17个可用节点）

### 组1：超快速 (< 250ms)
```
https://api.zan.top/eth-mainnet       (135ms) - 国内用户优选
https://eth.drpc.org                  (179ms) - 全球最稳定
https://1rpc.io/eth                   (215ms) - 开源友好
https://eth.api.onfinality.io/public  (211ms) - OnFinality服务
```

### 组2：快速 (250-400ms)
```
https://eth.llamarpc.com              (335ms) - Llama RPC
https://ethereum.public.blockpi.network/v1/rpc/public (334ms) - BlockPI
https://eth.meowrpc.com               (358ms) - Meow RPC
https://ethereum-public.nodies.app    (372ms) - Nodies
https://ethereum-rpc.publicnode.com   (374ms) - PublicNode
```

### 组3：中等速度 (400-700ms)
```
https://eth-mainnet.public.blastapi.io (416ms) - Blast API
https://rpc.fullsend.to               (422ms) - Fullsend RPC
https://eth.merkle.io                 (496ms) - Merkle Labs
https://rpc.eth.gateway.fm            (559ms) - Gateway.fm
https://eth.api.pocket.network        (595ms) - Pocket Network
https://rpc.mevblocker.io             (713ms) - MEV防护
```

### 组4：备选 (> 700ms)
```
https://rpc.flashbots.net             (813ms) - Flashbots
https://0xrpc.io/eth                  (851ms) - 0xRPC
```

## Node.js 使用示例

### 方法1：使用提供的脚本
```bash
node scripts/broadcast-eth-transaction.js 0xf8f9...
```

### 方法2：在代码中导入
```javascript
const { broadcastTransaction } = require('./scripts/broadcast-eth-transaction.js');

const signedTx = '0xf8f9...'; // 你的签名交易
broadcastTransaction(signedTx)
  .then(result => {
    if (result.success) {
      console.log('交易哈希:', result.txHash);
    } else {
      console.error('广播失败:', result.errors);
    }
  });
```

### 方法3：使用 Web3.js
```javascript
const Web3 = require('web3');
const web3 = new Web3('https://eth.drpc.org'); // 使用推荐的RPC

web3.eth.sendSignedTransaction(signedTx)
  .on('transactionHash', hash => console.log('TX:', hash))
  .on('error', err => console.error('Error:', err));
```

### 方法4：使用 Ethers.js
```javascript
const ethers = require('ethers');
const provider = new ethers.JsonRpcProvider('https://eth.drpc.org');

provider.broadcastTransaction(signedTx)
  .then(tx => console.log('TX:', tx.hash))
  .catch(err => console.error('Error:', err));
```

### 方法5：使用 cURL
```bash
curl -X POST https://eth.drpc.org \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "eth_sendRawTransaction",
    "params": ["0xf8f9..."],
    "id": 1
  }'
```

## 故障排除

### 问题：交易无法广播

**原因1：交易格式错误**
- 确保交易以 `0x` 开头
- 检查交易是否为有效的十六进制字符串

**原因2：余额不足**
- 需要足够的ETH支付gas费用
- 检查账户余额: eth_getBalance
- 最少gas费用: 21000 * gasPrice

**原因3：Nonce不正确**
- 检查当前nonce: eth_getTransactionCount(address)
- Nonce应该等于之前确认交易数量

**原因4：Gas太低**
```javascript
// 检查当前建议的gas价格
curl -X POST https://eth.drpc.org \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_gasPrice","params":[],"id":1}'
```

## 性能对比

### 可靠性排名
```
1. eth.drpc.org (99.9%+ uptime)
2. 1rpc.io (99.9%+ uptime)
3. ethereum-rpc.publicnode.com (99%+ uptime)
```

### 速度排名
```
1. api.zan.top/eth-mainnet (135ms)
2. eth.drpc.org (179ms)
3. 1rpc.io (215ms)
```

## 高级用法

### 多节点并发广播
```javascript
const urls = [
  'https://eth.drpc.org',
  'https://1rpc.io/eth',
  'https://api.zan.top/eth-mainnet'
];

Promise.race(
  urls.map(url => new Web3(url).eth.sendSignedTransaction(tx))
).then(result => console.log('First success:', result));
```

### 自动故障转移
```javascript
async function broadcastWithFallback(tx, urls) {
  for (const url of urls) {
    try {
      const web3 = new Web3(url);
      const result = await web3.eth.sendSignedTransaction(tx);
      console.log(`Success on ${url}:`, result);
      return result;
    } catch (err) {
      console.log(`Failed on ${url}, trying next...`);
      continue;
    }
  }
  throw new Error('All nodes failed');
}
```

## 关键技术点

### eth_sendRawTransaction
```json
请求:
{
  "jsonrpc": "2.0",
  "method": "eth_sendRawTransaction",
  "params": ["0x<signed_transaction_hex>"],
  "id": 1
}

成功响应:
{
  "jsonrpc": "2.0",
  "result": "0x<transaction_hash>",
  "id": 1
}

失败响应:
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32000,
    "message": "insufficient funds for gas * price + value"
  },
  "id": 1
}
```

## 相关资源

| 资源 | URL |
|------|-----|
| Ethereum JSON-RPC | https://ethereum.org/en/developers/docs/apis/json-rpc/ |
| eth_sendRawTransaction | https://www.quicknode.com/docs/ethereum/eth_sendRawTransaction |
| ChainList | https://chainlist.org/ |
| Gas Tracker | https://www.ethgasstation.info/ |
| Etherscan | https://etherscan.io/ |

---

**最后更新**: 2026年3月25日
**状态**: 所有节点已验证 (2026年3月25日)
**维护**: 建议每周更新节点列表
