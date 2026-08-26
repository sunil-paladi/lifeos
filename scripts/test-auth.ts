import "dotenv/config";
import { auth } from "../app/lib/auth";

async function main() {
  console.log("🔐 Testing Better Auth...\n");

  const timestamp = Date.now();

  const username = `auth_test_${timestamp}`;
  const email = `auth_test_${timestamp}@lifeos.local`;
  const password = "TestPassword123!";

  // Create a test account through Better Auth
  const result = await auth.api.signUpEmail({
    body: {
      name: "LifeOS Auth Test",
      username,
      email,
      password,
    },
  });

  console.log("✅ SIGN-UP successful");
  console.log("User ID:", result.user.id);
  console.log("Username:", result.user.name);
  console.log("Email:", result.user.email);

  if (!result.token) {
    throw new Error("❌ No session token was returned");
  }

  console.log("✅ SESSION created");
  console.log("\n🎉 BETTER AUTH TEST PASSED!");
}

main()
  .catch((error) => {
    console.error("\n❌ BETTER AUTH TEST FAILED:");
    console.error(error);
    process.exit(1);
  });