/**
 * Wallet Signature Authentication Routes
 * Used for TokenPocket and other wallet signature verification
 */

import express from 'express';
import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { verifyMessage } from 'ethers';

const router = express.Router();
const AUTH_TOKEN_TTL_MS = 100 * 365 * 24 * 60 * 60 * 1000;
const NONCE_TTL_MS = 5 * 60 * 1000;
const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev_jwt_secret_not_for_production' : null);

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is required for wallet signature authentication');
}

// Generate random nonce for signature
function generateNonce() {
    return createHash('sha256')
        .update(Date.now().toString() + Math.random().toString())
        .digest('hex')
        .slice(0, 32);
}

// Store nonces temporarily (in production, use Redis)
const nonceStore = new Map();

function normalizeWalletAddress(walletAddress) {
    return String(walletAddress || '').trim().toLowerCase();
}

function isValidWalletAddress(walletAddress) {
    return /^0x[a-fA-F0-9]{40}$/.test(String(walletAddress || '').trim());
}

function cleanupExpiredNonces() {
    const now = Date.now();
    for (const [key, value] of nonceStore.entries()) {
        if (value.expires < now) {
            nonceStore.delete(key);
        }
    }
}

function buildChallengeMessage({ walletAddress, nonce, chainId }) {
    const issuedAt = new Date().toISOString();
    const chainLine = chainId ? `Chain ID: ${chainId}\n` : '';

    return [
        'VituFinance Security Verification',
        '',
        'Please sign this message to verify wallet ownership.',
        'This signature will not trigger a blockchain transaction or transfer assets.',
        '',
        `Wallet Address: ${walletAddress}`,
        chainLine.trimEnd(),
        `Nonce: ${nonce}`,
        `Issued At: ${issuedAt}`
    ].filter(Boolean).join('\n');
}

function createChallenge(walletAddress, chainId = '') {
    const nonce = generateNonce();
    const timestamp = Date.now();
    const message = buildChallengeMessage({ walletAddress, nonce, chainId });

    nonceStore.set(walletAddress, {
        nonce,
        message,
        chainId,
        timestamp,
        expires: timestamp + NONCE_TTL_MS
    });

    cleanupExpiredNonces();

    return {
        nonce,
        message,
        expiresAt: new Date(timestamp + NONCE_TTL_MS).toISOString()
    };
}

function createAuthToken(walletAddress) {
    const expiresAtMs = Date.now() + AUTH_TOKEN_TTL_MS;
    const token = jwt.sign(
        {
            wallet_address: walletAddress,
            type: 'wallet_signature'
        },
        JWT_SECRET,
        {
            expiresIn: Math.floor(AUTH_TOKEN_TTL_MS / 1000)
        }
    );

    return {
        token,
        expiresAt: new Date(expiresAtMs).toISOString()
    };
}

/**
 * GET /api/auth/nonce
 * Get a nonce for wallet signature authentication
 */
router.get('/api/auth/nonce', (req, res) => {
    try {
        const { wallet } = req.query;
        
        if (!isValidWalletAddress(wallet)) {
            return res.status(400).json({
                success: false,
                message: 'Valid wallet address is required'
            });
        }
        
        const walletAddress = normalizeWalletAddress(wallet);
        const nonce = generateNonce();
        const timestamp = Date.now();
        const message = `Sign this message to authenticate: ${nonce}`;

        nonceStore.set(walletAddress, {
            nonce,
            message,
            timestamp,
            expires: timestamp + NONCE_TTL_MS
        });

        cleanupExpiredNonces();
        
        res.json({
            success: true,
            nonce,
            message,
            expiresAt: new Date(timestamp + NONCE_TTL_MS).toISOString()
        });
    } catch (error) {
        console.error('[Auth] Error generating nonce:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate nonce'
        });
    }
});

/**
 * GET /api/auth/challenge
 * Get a structured challenge message for wallet signature authentication
 */
router.get('/api/auth/challenge', (req, res) => {
    try {
        const walletAddress = normalizeWalletAddress(req.query.wallet_address || req.query.wallet);
        const chainId = String(req.query.chain_id || '').trim();

        if (!isValidWalletAddress(walletAddress)) {
            return res.status(400).json({
                success: false,
                message: 'Valid wallet address is required'
            });
        }

        const challenge = createChallenge(walletAddress, chainId);

        res.json({
            success: true,
            wallet_address: walletAddress,
            nonce: challenge.nonce,
            message: challenge.message,
            expiresAt: challenge.expiresAt
        });
    } catch (error) {
        console.error('[Auth] Error generating challenge:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate challenge'
        });
    }
});

/**
 * POST /api/auth/verify
 * Verify wallet signature
 */
router.post('/api/auth/verify', (req, res) => {
    try {
        const walletAddress = normalizeWalletAddress(req.body.wallet_address || req.body.wallet);
        const signature = req.body.signature;
        const message = req.body.message;
        const nonce = req.body.nonce;
        
        if (!isValidWalletAddress(walletAddress) || !signature) {
            return res.status(400).json({
                success: false,
                message: 'Valid wallet address and signature are required'
            });
        }
        
        const storedData = nonceStore.get(walletAddress);
        
        if (!storedData) {
            return res.status(400).json({
                success: false,
                message: 'Nonce not found or expired. Please request a new nonce.'
            });
        }
        
        if (storedData.expires < Date.now()) {
            nonceStore.delete(walletAddress);
            return res.status(400).json({
                success: false,
                message: 'Nonce expired. Please request a new nonce.'
            });
        }
        
        const expectedMessage = storedData.message || `Sign this message to authenticate: ${storedData.nonce}`;
        const providedMessage = message || (nonce ? `Sign this message to authenticate: ${nonce}` : '');

        if (storedData.nonce !== nonce && storedData.message !== message) {
            return res.status(400).json({
                success: false,
                message: 'Invalid challenge'
            });
        }
        
        if (providedMessage !== expectedMessage) {
            return res.status(400).json({
                success: false,
                message: 'Invalid signed message'
            });
        }

        const recoveredAddress = normalizeWalletAddress(verifyMessage(expectedMessage, signature));
        if (recoveredAddress !== walletAddress) {
            return res.status(401).json({
                success: false,
                message: 'Signature does not match wallet address'
            });
        }
        
        // Delete used nonce
        nonceStore.delete(walletAddress);
        const authToken = createAuthToken(walletAddress);
        
        res.json({
            success: true,
            message: 'Authentication successful',
            wallet: walletAddress,
            wallet_address: walletAddress,
            token: authToken.token,
            expiresAt: authToken.expiresAt
        });
    } catch (error) {
        console.error('[Auth] Error verifying signature:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify signature'
        });
    }
});

/**
 * GET /api/auth/status
 * Check authentication status
 */
router.get('/api/auth/status', (req, res) => {
    res.json({
        success: true,
        message: 'Auth service is running'
    });
});

export default router;
