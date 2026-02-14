import dotenv from "dotenv";
import { resolve } from "path";

// Load .env explicitly from the backend root
dotenv.config({ path: resolve(process.cwd(), ".env") });

import redis from "../config/redis.js";
import {
  hashMAC,
  cacheDeviceAuth,
  checkDeviceAuth,
  revokeDeviceAuth,
  getAuthHash,
  hashDeviceID,
  syncDeviceHashes,
} from "../services/deviceAuth.service.js";

const TEST_MAC = "AA:BB:CC:DD:EE:FF";
const TEST_DEVICE_ID = "device_test_001";
const TEST_TTL = 60; // 60 seconds for test

async function runTests() {
  let passed = 0;
  const total = 7;

  console.log("===========================================");
  console.log("  Raidware — Redis Device Auth Hash Tests  ");
  console.log("===========================================\n");

  try {
    // Wait for Redis to be ready
    console.log("[Setup] Waiting for Redis connection...");
    await redis.ping();
    console.log("[Setup] Redis PING successful!\n");

    // ── Step 1: Hash a test MAC ──────────────────────────
    console.log("--- Step 1: Hash MAC Address ---");
    const hash = hashMAC(TEST_MAC);
    console.log(`  MAC:  ${TEST_MAC}`);
    console.log(`  Hash: ${hash}`);
    console.log(`  Length: ${hash.length} chars (SHA-256 = 64 hex chars)`);

    if (hash && hash.length === 64) {
      console.log("  PASS\n");
      passed++;
    } else {
      console.log("  FAIL: Hash is invalid\n");
    }

    // ── Step 2: getAuthHash (should match) ───────────────
    console.log("--- Step 2: getAuthHash (consistency check) ---");
    const hash2 = getAuthHash(TEST_MAC);
    console.log(`  getAuthHash result: ${hash2}`);
    console.log(`  Matches hashMAC:    ${hash === hash2}`);

    if (hash === hash2) {
      console.log("  PASS\n");
      passed++;
    } else {
      console.log("  FAIL: Hashes don't match\n");
    }

    // ── Step 3: hashDeviceID (pepper-based hash) ─────────
    console.log("--- Step 3: hashDeviceID (HMAC with pepper) ---");
    const hashedId = hashDeviceID(TEST_MAC);
    console.log(`  hashedId: ${hashedId}`);
    console.log(`  Length: ${hashedId.length} chars`);
    console.log(`  Different from hashMAC: ${hashedId !== hash} (expected: true — different algorithms)`);

    if (hashedId && hashedId.length === 64 && hashedId !== hash) {
      console.log("  PASS\n");
      passed++;
    } else {
      console.log("  FAIL\n");
    }

    // ── Step 4: Cache device auth ────────────────────────
    console.log("--- Step 4: Cache Device Auth ---");
    const cachedHash = await cacheDeviceAuth(TEST_MAC, TEST_DEVICE_ID, TEST_TTL);
    console.log(`  Cached with hash: ${cachedHash}`);
    console.log(`  TTL: ${TEST_TTL} seconds`);

    // Verify key exists in Redis directly
    const rawData = await redis.get(`device:auth:${cachedHash}`);
    console.log(`  Raw Redis data: ${rawData ? "EXISTS" : "MISSING"}`);

    if (cachedHash === hash && rawData) {
      console.log("  PASS\n");
      passed++;
    } else {
      console.log("  FAIL: Returned hash doesn't match or data missing\n");
    }

    // ── Step 5: Check auth (should be authenticated) ─────
    console.log("--- Step 5: Check Device Auth (expect: authenticated) ---");
    const checkResult = await checkDeviceAuth(TEST_MAC);
    console.log(`  authenticated:   ${checkResult.authenticated}`);
    console.log(`  deviceId:        ${checkResult.deviceId}`);
    console.log(`  macAddress:      ${checkResult.macAddress}`);
    console.log(`  authenticatedAt: ${checkResult.authenticatedAt}`);
    console.log(`  hash:            ${checkResult.hash}`);

    if (
      checkResult.authenticated === true &&
      checkResult.deviceId === TEST_DEVICE_ID &&
      checkResult.macAddress === TEST_MAC
    ) {
      console.log("  PASS\n");
      passed++;
    } else {
      console.log("  FAIL: Unexpected check result\n");
    }

    // ── Step 6: Revoke device auth ───────────────────────
    console.log("--- Step 6: Revoke Device Auth ---");
    const revokeResult = await revokeDeviceAuth(TEST_MAC);
    console.log(`  revoked: ${revokeResult.revoked}`);
    console.log(`  hash:    ${revokeResult.hash}`);

    // Verify key is gone from Redis
    const afterRevoke = await redis.get(`device:auth:${hash}`);
    console.log(`  Redis key after revoke: ${afterRevoke ? "STILL EXISTS (BAD)" : "DELETED (GOOD)"}`);

    if (revokeResult.revoked === true && revokeResult.hash === hash && !afterRevoke) {
      console.log("  PASS\n");
      passed++;
    } else {
      console.log("  FAIL: Revocation did not work correctly\n");
    }

    // ── Step 7: Check auth again (should NOT be authenticated) ──
    console.log("--- Step 7: Check Device Auth After Revoke (expect: NOT authenticated) ---");
    const checkAfterRevoke = await checkDeviceAuth(TEST_MAC);
    console.log(`  authenticated: ${checkAfterRevoke.authenticated}`);

    if (checkAfterRevoke.authenticated === false) {
      console.log("  PASS\n");
      passed++;
    } else {
      console.log("  FAIL: Device is still authenticated after revocation!\n");
    }

    // ── Results ──────────────────────────────────────────
    console.log("===========================================");
    console.log(`  Results: ${passed}/${total} tests passed`);
    console.log("===========================================");

    if (passed === total) {
      console.log("\n  ALL TESTS PASSED\n");
    } else {
      console.log(`\n  ${total - passed} test(s) FAILED\n`);
    }
  } catch (error) {
    console.error("\n[ERROR] Test failed with exception:");
    console.error(`  Message: ${error.message}`);
    console.error(`  Stack:   ${error.stack}`);
  } finally {
    // Always disconnect Redis so the process exits cleanly
    console.log("[Cleanup] Disconnecting Redis...");
    await redis.disconnect();
    console.log("[Cleanup] Done.");
    process.exit(passed === total ? 0 : 1);
  }
}

runTests();
