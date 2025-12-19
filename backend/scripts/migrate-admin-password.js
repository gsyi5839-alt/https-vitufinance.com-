#!/usr/bin/env node
/**
 * 管理员密码迁移脚本
 * 
 * 功能：
 * - 将现有明文密码转换为bcrypt哈希
 * - 备份原配置文件
 * - 验证迁移结果
 * 
 * 使用方法：
 * node scripts/migrate-admin-password.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

// 获取当前目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置文件路径
const CONFIG_FILE = path.join(__dirname, '../data/admin_config.json');
const BACKUP_FILE = path.join(__dirname, '../data/admin_config.backup.json');

/**
 * 生成bcrypt哈希
 * @param {string} password - 明文密码
 * @returns {Promise<string>} - 哈希后的密码
 */
async function hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
}

/**
 * 主迁移函数
 */
async function migratePasswords() {
    console.log('🔐 管理员密码迁移工具');
    console.log('========================\n');
    
    // 检查配置文件是否存在
    if (!fs.existsSync(CONFIG_FILE)) {
        console.error('❌ 配置文件不存在:', CONFIG_FILE);
        console.log('\n请先创建配置文件，格式如下：');
        console.log(JSON.stringify({
            admin: {
                password: 'YourStrongPassword123!',
                role: 'super_admin'
            }
        }, null, 2));
        process.exit(1);
    }
    
    // 读取配置文件
    let config;
    try {
        const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
        config = JSON.parse(data);
    } catch (error) {
        console.error('❌ 读取配置文件失败:', error.message);
        process.exit(1);
    }
    
    // 检查是否有需要迁移的密码
    let needsMigration = false;
    for (const [username, userData] of Object.entries(config)) {
        if (userData.password && !userData.password.startsWith('$2')) {
            needsMigration = true;
            console.log(`📋 发现明文密码: ${username}`);
        } else if (userData.password?.startsWith('$2')) {
            console.log(`✅ 已加密: ${username}`);
        }
    }
    
    if (!needsMigration) {
        console.log('\n✅ 所有密码已加密，无需迁移');
        return;
    }
    
    // 备份原配置文件
    console.log('\n📦 备份原配置文件...');
    try {
        fs.copyFileSync(CONFIG_FILE, BACKUP_FILE);
        console.log(`✅ 备份已保存到: ${BACKUP_FILE}`);
    } catch (error) {
        console.error('❌ 备份失败:', error.message);
        process.exit(1);
    }
    
    // 迁移密码
    console.log('\n🔄 开始迁移密码...\n');
    
    for (const [username, userData] of Object.entries(config)) {
        if (userData.password && !userData.password.startsWith('$2')) {
            console.log(`  正在加密: ${username}...`);
            
            const hashedPassword = await hashPassword(userData.password);
            config[username].password = hashedPassword;
            
            console.log(`  ✅ ${username} 密码已加密`);
        }
    }
    
    // 保存新配置
    console.log('\n💾 保存新配置...');
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
        console.log('✅ 配置已更新');
    } catch (error) {
        console.error('❌ 保存失败:', error.message);
        console.log('\n尝试恢复备份...');
        fs.copyFileSync(BACKUP_FILE, CONFIG_FILE);
        console.log('✅ 已恢复备份');
        process.exit(1);
    }
    
    // 验证迁移结果
    console.log('\n🔍 验证迁移结果...');
    const newData = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const newConfig = JSON.parse(newData);
    
    let allMigrated = true;
    for (const [username, userData] of Object.entries(newConfig)) {
        if (userData.password?.startsWith('$2')) {
            console.log(`  ✅ ${username}: 已加密`);
        } else {
            console.log(`  ❌ ${username}: 未加密`);
            allMigrated = false;
        }
    }
    
    if (allMigrated) {
        console.log('\n✅ 所有密码迁移完成！');
        console.log('\n⚠️ 重要提示：');
        console.log('  1. 备份文件包含明文密码，请妥善保管或删除');
        console.log('  2. 请重启服务器使新配置生效');
        console.log('  3. 首次登录时将自动完成最终迁移');
    } else {
        console.log('\n⚠️ 部分密码迁移失败，请检查配置文件');
    }
}

// 运行迁移
migratePasswords().catch(error => {
    console.error('❌ 迁移过程发生错误:', error.message);
    process.exit(1);
});

