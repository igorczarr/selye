import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testApiNinjas() {
  const apiKey = process.env.API_NINJAS_KEY;
  if (!apiKey) {
    console.error("API_NINJAS_KEY is not set");
    process.exit(1);
  }

  console.log("Testing API Ninjas Exercises API...");
  const response = await fetch("https://api.api-ninjas.com/v1/exercises?muscle=biceps", {
    headers: {
      "X-Api-Key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`API Ninjas responded with ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  console.log(`Success! Received ${data.length} exercises from API Ninjas.`);
  if (data.length > 0) {
    console.log("Sample exercise:", JSON.stringify(data[0], null, 2));
  }
}

testApiNinjas().catch((err) => {
  console.error("API Ninjas test failed:", err);
  process.exit(1);
});
