#!/usr/bin/env node

/**
 * 以太坊交易广播工具
 * 使用免费RPC节点广播签名的交易
 * 
 * 使用方法:
 *   node broadcast-eth-transaction.js <signedTransaction>
 *   node broadcast-eth-transaction.js 0xf8f9... (带0x前缀)
 */

const https = require('https');
const http = require('http');

// 推荐的RPC节点列表（按性能排序）
const RPC_NODES = [
  // 一级推荐 - 超快响应
  { url: 'https://eth.drpc.org', name: 'dRPC', latency: 179 },
  { url: 'https://1rpc.io/eth', name: '1RPC', latency: 215 },
  { url: 'https://api.zan.top/eth-mainnet', name: 'ZAN', latency: 135 },
  
  // 二级推荐 - 中速响应
  { url: 'https://eth.meowrpc.com', name: 'Meow RPC', latency: 358 },
  { url: 'https://ethereum-rpc.publicnode.com', name: 'PublicNode', latency: 374 },
  { url: 'https://ethereum-public.nodies.app', name: 'Nodies', latency: 372 },
  { url: 'https://eth-mainnet.public.blastapi.io', name: 'Blast API', latency: 416 },
  { url: 'https://eth.api.onfinality.io/public', name: 'OnFinality', latency: 211 },
  { url: 'https://ethereum.public.blockpi.network/v1/rpc/public', name: 'BlockPI', latency: 334 },
  
  // 三级推荐 - 较慢但可靠
  { url: 'https://eth.llamarpc.com', name: 'Llama RPC', latency: 335 },
  { url: 'https://rpc.fullsend.to', name: 'Fullsend', latency: 422 },
  { url: 'https://eth.merkle.io', name: 'Merkle', latency: 496 },
  { url: 'https://rpc.eth.gateway.fm', name: 'Gateway.fm', latency: 559 },
  { url: 'https://eth.api.pocket.network', name: 'Pocket Network', latency: 595 },
  { url: 'https://rpc.mevblocker.io', name: 'MEV Blocker', latency: 713 },
  
  // 四级推荐 - 备选
  { url: 'https://0xrpc.io/eth', name: '0xRPC', latency: 851 },
  { url: 'https://rpc.flashbots.net', name: 'Flashbots', latency: 813 }
];

/**
 * 发送JSON-RPC请求到以太坊节点
 */
function sendJsonRpcRequest(rpcUrl, method, params) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: 1
    });

    const urlObj = new URL(rpcUrl);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': payload.length
      },
      timeout: 10000
    };

    const request = client.request(rpcUrl, options, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Invalid JSON response: ${data}`));
        }
      });
    });

    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });

    request.write(payload);
    request.end();
  });
}

/**
 * 广播交易到单个RPC节点
 */
async function broadcastToNode(node, signedTx) {
  const startTime = Date.now();
  try {
    const response = await sendJsonRpcRequest(node.url, 'eth_sendRawTransaction', [signedTx]);
    const elapsed = Date.now() - startTime;
    
    if (response.result) {
      return {
        success: true,
        txHash: response.result,
        node: node.name,
        url: node.url,
        elapsed: elapsed
      };
    } else if (response.error) {
      return {
        success: false,
        error: response.error.message,
        node: node.name,
        url: node.url,
        elapsed: elapsed
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      node: node.name,
      url: node.url,
      elapsed: Date.now() - startTime
    };
  }
}

/**
 * 并发广播交易到多个节点
 */
async function broadcastTransaction(signedTx, maxConcurrent = 3) {
  console.log('\n========================================');
  console.log('以太坊交易广播工具');
  console.log('========================================\n');
  
  // 验证交易格式
  if (!signedTx.startsWith('0x')) {
    signedTx = '0x' + signedTx;
  }
  
  console.log(`交易哈希值: ${signedTx.substring(0, 50)}...`);
  console.log(`广播节点数: ${RPC_NODES.length}`);
  console.log(`并发限制: ${maxConcurrent}`);
  console.log('\n正在广播...\n');

  const results = [];
  const successResults = [];
  const failedResults = [];

  // 分批处理
  for (let i = 0; i < RPC_NODES.length; i += maxConcurrent) {
    const batch = RPC_NODES.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(node => broadcastToNode(node, signedTx));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // 如果已有成功结果，可以提前停止
    const successCount = batchResults.filter(r => r.success).length;
    if (successCount > 0 && results.filter(r => r.success).length > 0) {
      console.log(`已成功广播到节点，停止尝试其他节点。`);
      break;
    }
  }

  // 分类结果
  results.forEach(result => {
    if (result.success) {
      successResults.push(result);
    } else {
      failedResults.push(result);
    }
  });

  // 显示结果
  if (successResults.length > 0) {
    console.log('\n========================================');
    console.log('成功广播的节点');
    console.log('========================================\n');
    
    successResults.forEach((result, index) => {
      console.log(`[${index + 1}] ${result.node}`);
      console.log(`    URL: ${result.url}`);
      console.log(`    交易哈希: ${result.txHash}`);
      console.log(`    响应时间: ${result.elapsed}ms\n`);
    });
    
    console.log('\n========================================');
    console.log('广播完成！');
    console.log('========================================\n');
    console.log(`成功: ${successResults.length} 个节点`);
    console.log(`推荐使用此交易哈希在区块浏览器查询: https://etherscan.io/tx/${successResults[0].txHash}\n`);
    
    return {
      success: true,
      txHash: successResults[0].txHash,
      nodes: successResults.map(r => r.node),
      totalTime: Date.now()
    };
  } else {
    console.log('\n========================================');
    console.log('广播失败');
    console.log('========================================\n');
    console.log('所有节点都无法广播交易。常见原因:\n');
    console.log('1. 交易格式不正确');
    console.log('2. 账户余额不足（需要gas费用）');
    console.log('3. Nonce值不正确');
    console.log('4. 交易签名无效');
    console.log('\n失败详情:\n');
    
    failedResults.slice(0, 5).forEach((result, index) => {
      console.log(`[${index + 1}] ${result.node} (${result.elapsed}ms)`);
      console.log(`    错误: ${result.error}\n`);
    });
    
    if (failedResults.length > 5) {
      console.log(`... 以及其他 ${failedResults.length - 5} 个失败的节点\n`);
    }
    
    return {
      success: false,
      errors: failedResults.map(r => `${r.node}: ${r.error}`)
    };
  }
}

// 主程序
if (require.main === module) {
  const signedTx = process.argv[2];
  
  if (!signedTx) {
    console.error('\n使用方法:');
    console.error('  node broadcast-eth-transaction.js <signedTransaction>\n');
    console.error('示例:');
    console.error('  node broadcast-eth-transaction.js 0xf8f9...\n');
    process.exit(1);
  }

  broadcastTransaction(signedTx)
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('错误:', error.message);
      process.exit(1);
    });
} else {
  module.exports = {
    broadcastTransaction,
    RPC_NODES,
    sendJsonRpcRequest,
    broadcastToNode
  };
}
