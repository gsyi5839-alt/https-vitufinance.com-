/**
 * Wallet authentication & ownership enforcement middleware.
 *
 * SECURITY (C2): user-facing /api routes historically trusted `wallet_address` taken
 * straight from the request body/query, with no proof the caller owns that wallet. This
 * allowed unauthenticated withdrawal/balance IDOR. This middleware verifies the wallet
 * signature JWT (issued by /api/auth/verify) and ties the request to the authenticated
 * wallet.
 *
 * Rollout is gated by the ENFORCE_WALLET_AUTH env flag so it can be deployed before the
 * frontend reliably sends the token:
 *   - soft mode (default): if a valid token is present, still reject any wallet_address
 *     that doesn't match it (closes IDOR for authenticated callers); tokenless legacy
 *     requests are allowed through.
 *   - enforce mode (ENFORCE_WALLET_AUTH=true): every request must carry a valid token,
 *     and the operated wallet is forced to the authenticated wallet.
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET
  || (process.env.NODE_ENV !== 'production' ? 'dev_jwt_secret_not_for_production' : null);

function normalize(addr) {
  return String(addr || '').trim().toLowerCase();
}

function extractToken(req) {
  const header = req.headers['authorization'] || req.headers['Authorization'] || '';
  if (typeof header === 'string' && header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }
  return null;
}

/**
 * Returns the claimed wallet address present in the request (body/query/params), or null.
 */
function claimedWallet(req) {
  return (
    req.body?.wallet_address
    || req.body?.wallet
    || req.query?.wallet_address
    || req.query?.wallet
    || req.params?.wallet_address
    || null
  );
}

/**
 * Force the operated wallet to the authenticated wallet so handlers cannot act on another
 * account even if they read wallet_address from the request.
 */
function injectAuthenticatedWallet(req) {
  if (req.body && typeof req.body === 'object' && 'wallet_address' in req.body) {
    req.body.wallet_address = req.walletAddress;
  }
  if (req.query && typeof req.query === 'object' && 'wallet_address' in req.query) {
    req.query.wallet_address = req.walletAddress;
  }
}

export function createWalletAuthMiddleware() {
  const enforce = process.env.ENFORCE_WALLET_AUTH === 'true';

  return function walletAuth(req, res, next) {
    const token = extractToken(req);

    if (token && JWT_SECRET) {
      try {
        const payload = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
        if (payload && payload.type === 'wallet_signature' && payload.wallet_address) {
          req.walletAddress = normalize(payload.wallet_address);
        }
      } catch (e) {
        // invalid/expired token — treated as unauthenticated below
        req.walletAddress = undefined;
      }
    }

    // Ownership check: a request may never operate on a wallet other than the authenticated one.
    if (req.walletAddress) {
      const claimed = claimedWallet(req);
      if (claimed && normalize(claimed) !== req.walletAddress) {
        return res.status(403).json({
          success: false,
          message: 'Wallet address does not match authenticated session'
        });
      }
    }

    if (!enforce) {
      return next();
    }

    // Enforce mode: a valid wallet token is mandatory.
    if (!req.walletAddress) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    injectAuthenticatedWallet(req);
    return next();
  };
}

export default createWalletAuthMiddleware;
