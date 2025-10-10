import axios from "axios";
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

const jar = new CookieJar();
const client = wrapper(
  axios.create({
    jar,
    withCredentials: true,
    baseURL: "http://localhost:5000/api/auth",
  })
);

const TEST_USER = {
  name: "Test User",
  email: `test_${Date.now()}@example.com`,
  password: "password123",
};

async function runTests() {
  try {
    console.log("1. Registering user...");
    const regRes = await client.post("/register", TEST_USER);
    console.log("   Register success:", regRes.data.success);
    const accessToken = regRes.data.data.accessToken;

    console.log("2. Accessing protected route (me)...");
    const meRes = await client.get("/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log("   Me success:", meRes.data.success);

    console.log("3. Refreshing token...");
    const refreshRes = await client.post("/refresh");
    console.log("   Refresh success:", refreshRes.data.success);
    const newAccessToken = refreshRes.data.data.accessToken;

    console.log("4. Accessing protected route with NEW token...");
    const meRes2 = await client.get("/me", {
      headers: { Authorization: `Bearer ${newAccessToken}` },
    });
    console.log("   Me (new token) success:", meRes2.data.success);

    console.log("5. Testing Rate Limiting (Login)...");
    let limitHit = false;
    for (let i = 0; i < 25; i++) {
      try {
        await client.post("/login", {
          email: TEST_USER.email,
          password: TEST_USER.password,
        });
      } catch (err) {
        if (err.response && err.response.status === 429) {
          console.log("   Rate limit hit at request #", i + 1);
          limitHit = true;
          break;
        }
      }
    }
    if (!limitHit) console.warn("   WARNING: Rate limit NOT hit!");

    console.log("All tests completed.");
  } catch (err) {
    console.error(
      "Test failed:",
      err.response ? err.response.data : err.message
    );
  }
}

runTests();
