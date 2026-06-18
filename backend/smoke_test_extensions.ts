/**
 * @file smoke_test_extensions.ts
 * @description Integration smoke test script for Phase 6 Backend Extensions.
 * Usage: npx tsx smoke_test_extensions.ts
 */

import 'dotenv/config';
import { query } from './src/shared/database/pool.js';

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

// Simple assertion helper
function assert(condition: any, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log('🧪 Starting Phase 6 Integration Smoke Tests...\n');

  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'testpassword123';
  const testDisplayName = 'Test User Extensions';
  let token = '';
  let userId = '';

  // 1. Clean up any left-overs first
  await query('DELETE FROM users WHERE email = $1', [testEmail]);
  await query("DELETE FROM sponsors WHERE brand_name LIKE 'Test Brand %'");

  // ───────────────────────────────────────────────────────────────────────────
  // TEST: Signup
  // ───────────────────────────────────────────────────────────────────────────
  console.log('1. Testing User Signup...');
  const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      display_name: testDisplayName,
    }),
  });
  assert(signupRes.status === 201, `Signup should return 201, got ${signupRes.status}`);
  const signupData = await signupRes.json();
  assert(signupData.status === 'success', 'Signup status should be success');
  assert(signupData.data.email === testEmail, 'Email in response should match');
  assert(signupData.data.display_name === testDisplayName, 'Display name in response should match');
  userId = signupData.data.id;
  assert(userId, 'Signup should return user ID');
  console.log('✅ Signup Successful.');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST: Duplicate Signup
  // ───────────────────────────────────────────────────────────────────────────
  console.log('2. Testing Duplicate Signup Prevention...');
  const dupSignupRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      display_name: testDisplayName,
    }),
  });
  assert(dupSignupRes.status === 400, `Duplicate signup should fail with 400, got ${dupSignupRes.status}`);
  const dupSignupData = await dupSignupRes.json();
  assert(dupSignupData.status === 'error', 'Duplicate signup response status should be error');
  console.log('✅ Duplicate Signup properly blocked.');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST: Login
  // ───────────────────────────────────────────────────────────────────────────
  console.log('3. Testing User Login...');
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
    }),
  });
  assert(loginRes.status === 200, `Login should return 200, got ${loginRes.status}`);
  const loginData = await loginRes.json();
  assert(loginData.status === 'success', 'Login status should be success');
  token = loginData.data.token;
  assert(token, 'Login response should contain JWT token');
  assert(loginData.data.user.id === userId, 'Login user ID should match signup user ID');
  console.log('✅ Login Successful.');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST: Route Security (Unauthorized)
  // ───────────────────────────────────────────────────────────────────────────
  console.log('4. Testing Protected Routes Security...');
  // No token
  const noTokenRes = await fetch(`${BASE_URL}/meals`, {
    method: 'GET',
  });
  assert(noTokenRes.status === 401, `Protected route without token should return 401, got ${noTokenRes.status}`);

  // Invalid token
  const invalidTokenRes = await fetch(`${BASE_URL}/meals`, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer invalid_token_here' },
  });
  assert(invalidTokenRes.status === 401, `Protected route with invalid token should return 401, got ${invalidTokenRes.status}`);
  console.log('✅ Route security checks passed.');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST: Weight History Tracking
  // ───────────────────────────────────────────────────────────────────────────
  console.log('5. Testing Weight Logging...');
  const logWeightRes = await fetch(`${BASE_URL}/users/${userId}/weight`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ weight_kg: 85.5 }),
  });
  assert(logWeightRes.status === 201, `Log weight should return 201, got ${logWeightRes.status}`);
  const logWeightData = await logWeightRes.json();
  assert(logWeightData.status === 'success', 'Status should be success');
  assert(Number(logWeightData.data.weight_kg) === 85.5, 'Logged weight should be 85.5');

  // Verify weight history
  console.log('6. Testing Weight History Retrieval...');
  const weightHistRes = await fetch(`${BASE_URL}/users/${userId}/weight/history`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  assert(weightHistRes.status === 200, `Get weight history should return 200, got ${weightHistRes.status}`);
  const weightHistData = await weightHistRes.json();
  assert(weightHistData.status === 'success', 'Status should be success');
  assert(weightHistData.data.length >= 1, 'Should have at least 1 weight history log');
  assert(Number(weightHistData.data[0].weight_kg) === 85.5, 'Most recent weight should match');
  console.log('✅ Weight logging & history timeline successful.');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST: Water Intake Tracking
  // ───────────────────────────────────────────────────────────────────────────
  console.log('7. Testing Water Logging...');
  const logWaterRes = await fetch(`${BASE_URL}/users/${userId}/water`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ amount_ml: 250 }),
  });
  assert(logWaterRes.status === 201, `Log water should return 201, got ${logWaterRes.status}`);
  const logWaterData = await logWaterRes.json();
  assert(logWaterData.status === 'success', 'Status should be success');
  assert(logWaterData.data.amount_ml === 250, 'Amount should be 250ml');
  const waterLogId = logWaterData.data.id;

  // Log a second water log to verify accumulation
  await fetch(`${BASE_URL}/users/${userId}/water`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ amount_ml: 500 }),
  });

  // Verify daily sum
  console.log('8. Testing Daily Water Intake Retrieval...');
  const dailyWaterRes = await fetch(`${BASE_URL}/users/${userId}/water/today`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  assert(dailyWaterRes.status === 200, `Get water today should return 200, got ${dailyWaterRes.status}`);
  const dailyWaterData = await dailyWaterRes.json();
  assert(dailyWaterData.status === 'success', 'Status should be success');
  assert(dailyWaterData.data.total_ml === 750, `Total water intake should be 750, got ${dailyWaterData.data.total_ml}`);
  assert(dailyWaterData.data.logs.length === 2, 'Should return exactly 2 log entries');
  console.log('✅ Water logging & accumulation timeline successful.');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST: Meal Log CRUD
  // ───────────────────────────────────────────────────────────────────────────
  console.log('9. Testing Meal Log Persistence via Analysis...');
  const mealAnalyzeRes = await fetch(`${BASE_URL}/meals/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // No token validation on analyze text since analyze endpoint has userId param,
      // but it persists the meal log to daily_calorie_logs.
    },
    body: JSON.stringify({
      rawText: 'كوب شاي باللبن وملعقة سكر',
      userId: userId,
    }),
  });
  assert(mealAnalyzeRes.status === 200, `Analyze meal should return 200, got ${mealAnalyzeRes.status}`);
  const mealAnalyzeData = await mealAnalyzeRes.json();
  assert(mealAnalyzeData.status === 'success', 'Status should be success');
  const mealLogId = mealAnalyzeData.meta.logId;
  assert(mealLogId, 'Should return generated logId');

  // Verify retrieving logs by day
  console.log('10. Testing Meal Logs Retrieval by Day...');
  const mealsByDayRes = await fetch(`${BASE_URL}/meals`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  assert(mealsByDayRes.status === 200, `Get meals should return 200, got ${mealsByDayRes.status}`);
  const mealsByDayData = await mealsByDayRes.json();
  assert(mealsByDayData.status === 'success', 'Status should be success');
  assert(mealsByDayData.data.length >= 1, 'Should return at least 1 meal log');
  assert(mealsByDayData.data[0].id === mealLogId, 'First meal ID should match analyzed meal log ID');
  console.log('✅ Meal log retrieval by day successful.');

  // Delete the meal log
  console.log('11. Testing Meal Log Deletion...');
  const deleteMealRes = await fetch(`${BASE_URL}/meals/${mealLogId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  assert(deleteMealRes.status === 200, `Delete meal should return 200, got ${deleteMealRes.status}`);
  const deleteMealData = await deleteMealRes.json();
  assert(deleteMealData.status === 'success', 'Status should be success');

  // Verify deletion
  const mealsByDayAfterDeleteRes = await fetch(`${BASE_URL}/meals`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const mealsAfterDelete = await mealsByDayAfterDeleteRes.json();
  const found = mealsAfterDelete.data.some((m: any) => m.id === mealLogId);
  assert(!found, 'Meal log should no longer exist');
  console.log('✅ Meal log deletion successful.');

  // Delete water log
  console.log('12. Testing Water Log Deletion...');
  const deleteWaterRes = await fetch(`${BASE_URL}/users/${userId}/water/${waterLogId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  assert(deleteWaterRes.status === 200, `Delete water should return 200, got ${deleteWaterRes.status}`);
  
  // Verify water total has decreased to 500ml
  const dailyWaterAfterDeleteRes = await fetch(`${BASE_URL}/users/${userId}/water/today`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  const waterAfterDelete = await dailyWaterAfterDeleteRes.json();
  assert(waterAfterDelete.data.total_ml === 500, `Water total should be 500 after deleting 250ml log, got ${waterAfterDelete.data.total_ml}`);
  console.log('✅ Water log deletion successful.');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST: Sponsors API
  // ───────────────────────────────────────────────────────────────────────────
  console.log('13. Testing Sponsors API...');
  // Insert active & inactive test sponsors direct to DB
  await query(`
    INSERT INTO sponsors (brand_name, product_name, category, description, is_active, priority)
    VALUES 
      ('Test Brand Active Low', 'Low Priority Bar', 'protein', 'Low priority description', TRUE, 10),
      ('Test Brand Active High', 'High Priority Bar', 'protein', 'High priority description', TRUE, 100),
      ('Test Brand Inactive', 'Inactive Bar', 'protein', 'Inactive description', FALSE, 200)
  `);

  // Fetch sponsors from public endpoint
  const sponsorsRes = await fetch(`${BASE_URL}/sponsors`, { method: 'GET' });
  assert(sponsorsRes.status === 200, `Get sponsors should return 200, got ${sponsorsRes.status}`);
  const sponsorsData = await sponsorsRes.json();
  assert(sponsorsData.status === 'success', 'Status should be success');

  const items = sponsorsData.data;
  // Verify filtering (Test Brand Inactive should not be in response)
  const hasInactive = items.some((item: any) => item.brand_name === 'Test Brand Inactive');
  assert(!hasInactive, 'Inactive sponsors should not be returned');

  // Verify sorting (Active High priority 100 should be ahead of Active Low priority 10)
  const activeLowIndex = items.findIndex((item: any) => item.brand_name === 'Test Brand Active Low');
  const activeHighIndex = items.findIndex((item: any) => item.brand_name === 'Test Brand Active High');
  
  assert(activeLowIndex !== -1 && activeHighIndex !== -1, 'Both test active sponsors should be returned');
  assert(activeHighIndex < activeLowIndex, 'Sponsor with higher priority should appear first');
  console.log('✅ Sponsors API filter and sorting successful.');

  // ───────────────────────────────────────────────────────────────────────────
  // CLEANUP & WRAP UP
  // ───────────────────────────────────────────────────────────────────────────
  console.log('14. Running Cleanup...');
  // Cascading delete user will clean up weight logs and remaining water logs
  await query('DELETE FROM users WHERE id = $1', [userId]);
  // Delete test sponsors
  await query("DELETE FROM sponsors WHERE brand_name LIKE 'Test Brand %'");
  console.log('✅ Cleanup finished.');

  console.log('\n🎉 ALL INTEGRATION SMOKE TESTS PASSED SUCCESSFULLY! 🎉');
}

runTests().catch((err) => {
  console.error('\n❌ Smoke test execution failed with error:', err);
  process.exit(1);
});
