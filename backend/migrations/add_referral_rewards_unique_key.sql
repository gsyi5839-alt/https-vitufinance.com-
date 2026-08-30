-- Migration: enforce uniqueness on referral_rewards to prevent double-credit (H5)
--
-- The reward distribution code (robotReferralService.js / robotExpiryRewards.js) used a
-- SELECT-then-INSERT idempotency check that races under concurrent triggers, allowing the
-- same (recipient, source, level) reward to be inserted and credited twice. The code now
-- uses INSERT IGNORE + credit-only-if-inserted, which is race-safe ONLY when this unique
-- key exists.
--
-- IMPORTANT: run on a maintenance window. Step 1 deletes duplicate *audit rows* (it does
-- NOT refund balances — investigate historical duplicates separately if needed).

-- Step 1: remove duplicate rows, keeping the lowest id per logical key.
DELETE r1 FROM `referral_rewards` r1
INNER JOIN `referral_rewards` r2
  ON  r1.`wallet_address` = r2.`wallet_address`
  AND r1.`from_wallet`    = r2.`from_wallet`
  AND r1.`level`          = r2.`level`
  AND r1.`source_type`    = r2.`source_type`
  AND r1.`source_id`      = r2.`source_id`
  AND r1.`id` > r2.`id`;

-- Step 2: add the unique constraint used by INSERT IGNORE.
ALTER TABLE `referral_rewards`
  ADD UNIQUE KEY `uniq_referral_reward`
  (`wallet_address`, `from_wallet`, `level`, `source_type`, `source_id`);
