#!/usr/bin/env node

/**
 * 测试单个API
 */

import axios from 'axios';

const API_URL = 'http://localhost:3000/api/admin';

async function test() {
  try {
    // 1. 获取CSRF Token
    const csrfRes = await axios.get('http://localhost:3000/api/csrf-token');
    const csrfToken = csrfRes.data.csrfToken;
    console.log('✓ CSRF Token获取成功');
    
    // 2. 登录
    const loginRes = await axios.post(`${API_URL}/login`, {
      username: 'admin',
      password: 'Vf$2024#Sec@Admin!'
    }, {
      headers: {
        'X-CSRF-Token': csrfToken
      }
    });
    
    const token = loginRes.data.data.token;
    console.log('✓ 登录成功');
    
    // 3. 测试机器人收益汇总API
    console.log('\n测试: /robots/earnings-summary');
    const res = await axios.get(`${API_URL}/robots/earnings-summary`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('\n响应:');
    console.log(JSON.stringify(res.data, null, 2));
    
  } catch (error) {
    console.error('\n错误:');
    console.error('状态:', error.response?.status);
    console.error('消息:', error.response?.data);
    console.error('详细:', error.message);
    
    if (error.response?.status === 500) {
      console.error('\n这是服务器内部错误，请检查后端日志');
    }
  }
}

test();

