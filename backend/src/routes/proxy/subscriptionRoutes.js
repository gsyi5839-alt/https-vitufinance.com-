/**
 * Proxy Subscription Routes
 * Provides Clash/Surge/V2Ray subscription links for internal use
 * 
 * Usage:
 * - Clash Verge: Import subscription URL
 * - URL format: /api/proxy/sub/{token}
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config paths
const DATA_DIR = path.join(__dirname, '../../../data/proxy');
const CONFIG_FILE = path.join(DATA_DIR, 'clash_config.yaml');
const TOKENS_FILE = path.join(DATA_DIR, 'tokens.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize tokens file
if (!fs.existsSync(TOKENS_FILE)) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify({
    tokens: [],
    created: new Date().toISOString()
  }, null, 2));
}

/**
 * Load subscription tokens
 */
const loadTokens = () => {
  try {
    const data = fs.readFileSync(TOKENS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return { tokens: [] };
  }
};

/**
 * Save subscription tokens
 */
const saveTokens = (data) => {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(data, null, 2));
};

/**
 * Generate unique subscription token
 */
const generateToken = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * GET /api/proxy/sub/:token
 * Get Clash subscription config by token
 */
router.get('/sub/:token', (req, res) => {
  try {
    const { token } = req.params;
    const tokensData = loadTokens();
    
    // Validate token
    const tokenInfo = tokensData.tokens.find(t => t.token === token && t.active);
    
    if (!tokenInfo) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired subscription token'
      });
    }
    
    // Check expiry
    if (tokenInfo.expiresAt && new Date(tokenInfo.expiresAt) < new Date()) {
      return res.status(403).json({
        success: false,
        message: 'Subscription has expired'
      });
    }
    
    // Update last access
    tokenInfo.lastAccess = new Date().toISOString();
    tokenInfo.accessCount = (tokenInfo.accessCount || 0) + 1;
    saveTokens(tokensData);
    
    // Read and return config
    if (!fs.existsSync(CONFIG_FILE)) {
      return res.status(404).json({
        success: false,
        message: 'Configuration file not found'
      });
    }
    
    const config = fs.readFileSync(CONFIG_FILE, 'utf-8');
    
    // Set headers for Clash
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="clash_config.yaml"');
    res.setHeader('subscription-userinfo', `upload=0; download=${tokenInfo.usedTraffic || 0}; total=${tokenInfo.totalTraffic || 107374182400}; expire=${tokenInfo.expiresAt ? Math.floor(new Date(tokenInfo.expiresAt).getTime() / 1000) : 0}`);
    
    res.send(config);
    
  } catch (error) {
    console.error('[Proxy] Subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

/**
 * POST /api/proxy/token/create
 * Create new subscription token (admin only)
 */
router.post('/token/create', (req, res) => {
  try {
    const { name, expiresInDays = 30, totalTrafficGB = 100 } = req.body;
    
    const token = generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    const tokenInfo = {
      token,
      name: name || 'VituFinance Internal',
      active: true,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      totalTraffic: totalTrafficGB * 1024 * 1024 * 1024, // Convert to bytes
      usedTraffic: 0,
      accessCount: 0,
      lastAccess: null
    };
    
    const tokensData = loadTokens();
    tokensData.tokens.push(tokenInfo);
    saveTokens(tokensData);
    
    // Generate subscription URL
    const baseUrl = process.env.API_BASE_URL || 'https://vitufinance.com';
    const subscriptionUrl = `${baseUrl}/api/proxy/sub/${token}`;
    
    res.json({
      success: true,
      message: 'Subscription token created',
      data: {
        token,
        name: tokenInfo.name,
        subscriptionUrl,
        expiresAt: tokenInfo.expiresAt,
        totalTrafficGB
      }
    });
    
  } catch (error) {
    console.error('[Proxy] Create token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create token'
    });
  }
});

/**
 * GET /api/proxy/tokens
 * List all subscription tokens (admin only)
 */
router.get('/tokens', (req, res) => {
  try {
    const tokensData = loadTokens();
    
    const tokens = tokensData.tokens.map(t => ({
      token: t.token.substring(0, 8) + '...',
      name: t.name,
      active: t.active,
      createdAt: t.createdAt,
      expiresAt: t.expiresAt,
      usedTrafficGB: ((t.usedTraffic || 0) / 1024 / 1024 / 1024).toFixed(2),
      totalTrafficGB: ((t.totalTraffic || 0) / 1024 / 1024 / 1024).toFixed(2),
      accessCount: t.accessCount || 0,
      lastAccess: t.lastAccess
    }));
    
    res.json({
      success: true,
      data: tokens
    });
    
  } catch (error) {
    console.error('[Proxy] List tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list tokens'
    });
  }
});

/**
 * DELETE /api/proxy/token/:token
 * Deactivate a subscription token
 */
router.delete('/token/:token', (req, res) => {
  try {
    const { token } = req.params;
    const tokensData = loadTokens();
    
    const tokenInfo = tokensData.tokens.find(t => t.token === token);
    
    if (!tokenInfo) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }
    
    tokenInfo.active = false;
    saveTokens(tokensData);
    
    res.json({
      success: true,
      message: 'Token deactivated'
    });
    
  } catch (error) {
    console.error('[Proxy] Delete token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete token'
    });
  }
});

/**
 * PUT /api/proxy/config
 * Update Clash configuration (admin only)
 */
router.put('/config', (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Configuration content required'
      });
    }
    
    // Backup current config
    if (fs.existsSync(CONFIG_FILE)) {
      const backupPath = CONFIG_FILE + '.backup';
      fs.copyFileSync(CONFIG_FILE, backupPath);
    }
    
    // Save new config
    fs.writeFileSync(CONFIG_FILE, config, 'utf-8');
    
    res.json({
      success: true,
      message: 'Configuration updated'
    });
    
  } catch (error) {
    console.error('[Proxy] Update config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update configuration'
    });
  }
});

/**
 * GET /api/proxy/config
 * Get current Clash configuration (admin only)
 */
router.get('/config', (req, res) => {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return res.status(404).json({
        success: false,
        message: 'Configuration not found'
      });
    }
    
    const config = fs.readFileSync(CONFIG_FILE, 'utf-8');
    
    res.json({
      success: true,
      data: { config }
    });
    
  } catch (error) {
    console.error('[Proxy] Get config error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get configuration'
    });
  }
});

export default router;

