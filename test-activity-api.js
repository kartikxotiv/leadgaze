// Quick test script to check the activities API
// Run with: node test-activity-api.js

const testSimpleAPI = async () => {
  const baseUrl = "http://localhost:3000";

  try {
    console.log("=== Testing Simple API Route ===");

    const response = await fetch(`${baseUrl}/api/test-activities`, {
      method: "GET",
    });

    console.log("Response status:", response.status);
    const responseText = await response.text();
    console.log("Raw response:", responseText);

    try {
      const responseJson = JSON.parse(responseText);
      console.log("Parsed response:", responseJson);
    } catch (parseError) {
      console.log("Failed to parse response as JSON:", parseError.message);
    }
  } catch (error) {
    console.error("Simple API test failed:", error);
  }
};

const testActivityAPI = async () => {
  const baseUrl = "http://localhost:3000";

  try {
    console.log("\n=== Testing Activities API ===");

    // Test payload with minimal required fields
    const testPayload = {
      activityType: "task",
      relatedType: "lead",
      relatedId: "test-lead-id",
      subject: "Test Activity",
      userId: "test-user-id",
      priority: "medium",
    };

    console.log("Sending request with payload:", testPayload);

    const response = await fetch(`${baseUrl}/api/activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testPayload),
    });

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    const responseText = await response.text();
    console.log("Raw response:", responseText);

    try {
      const responseJson = JSON.parse(responseText);
      console.log("Parsed response:", responseJson);
    } catch (parseError) {
      console.log("Failed to parse response as JSON:", parseError.message);
    }
  } catch (error) {
    console.error("Activities API test failed:", error);
  }
};

const runAllTests = async () => {
  await testSimpleAPI();
  await testActivityAPI();
};

runAllTests();
