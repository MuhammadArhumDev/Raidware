import "dotenv/config";
const fetch = global.fetch; // Node 22 has native fetch

const BASE_URL = "http://localhost:5000/api/auth";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@raidware.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "adminsecret";

// Helper for colored logs
const log = (msg, type = "info") => {
  const colors = {
    info: "\x1b[36m%s\x1b[0m", // Cyan
    success: "\x1b[32m%s\x1b[0m", // Green
    error: "\x1b[31m%s\x1b[0m", // Red
  };
  console.log(colors[type] || colors.info, msg);
};

async function testAuth() {
  log("--- STARTING API TESTS ---");
  const timestamp = Date.now();
  const testOrg = {
    name: `Test Org ${timestamp}`,
    email: `org${timestamp}@test.com`,
    password: "password123",
    role: "organization",
  };

  // 1. Signup Organization
  log("\n1. Testing Organization Signup...");
  try {
    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testOrg),
    });
    const data = await res.json();

    if (res.ok) {
      log("✓ Signup Successful", "success");
      log(`  User ID: ${data.data.user.id}`);
      log(`  Role: ${data.data.user.role}`);
    } else {
      log(`✗ Signup Failed: ${data.message}`, "error");
      console.error(data);
    }
  } catch (e) {
    log(`✗ Signup Error: ${e.message}`, "error");
  }

  // 2. Login Organization
  log("\n2. Testing Organization Login...");
  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testOrg.email,
        password: testOrg.password,
      }),
    });
    const data = await res.json();

    if (res.ok) {
      log("✓ Org Login Successful", "success");
      log(`  Token received: ${!!data.data.accessToken}`);
    } else {
      log(`✗ Org Login Failed: ${data.message}`, "error");
    }
  } catch (e) {
    log(`✗ Org Login Error: ${e.message}`, "error");
  }

  // 3. Login Admin (Hardcoded)
  log("\n3. Testing Admin Login...");
  try {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const data = await res.json();

    if (res.ok) {
      log("✓ Admin Login Successful", "success");
      log(`  Role: ${data.data.user.role}`);
      log(`  Token received: ${!!data.data.accessToken}`);
      log(`  Cookies: ${res.headers.get("set-cookie")}`);
    } else {
      log(`✗ Admin Login Failed: ${data.message}`, "error");
    }
  } catch (e) {
    log(`✗ Admin Login Error: ${e.message}`, "error");
  }

  // 4. Test Protected Route (Cookie Auth)
  log("\n4. Testing Protected Route (Cookie Auth)...");
  try {
    // Helper to extract cookie string from Set-Cookie header array or string
    const getCookieString = (res) => {
      const setCookie = res.headers.get("set-cookie");
      return setCookie
        ? setCookie
            .split(",")
            .map((c) => c.split(";")[0])
            .join("; ")
        : "";
    };

    // Re-login as Admin to get fresh cookies
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const cookieHeader = getCookieString(loginRes);

    const res = await fetch(`${BASE_URL}/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader, // Send cookies manually since fetch doesn't persist them automatically
      },
    });
    const data = await res.json();

    if (res.ok) {
      log("✓ Protected Route Access Successful (via Cookie)", "success");
      log(`  User: ${data.data.user.name}`);
    } else {
      log(`✗ Protected Route Access Failed: ${data.message}`, "error");
    }
  } catch (e) {
    log(`✗ Protected Route Error: ${e.message}`, "error");
  }

  log("\n--- TESTS COMPLETED ---");
}

testAuth();
