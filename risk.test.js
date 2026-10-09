// Run: node risk.test.js
const assert = require("assert");
const { projectedBuffer, classifyBuffer, weatherReasons } = require("./risk.js");

const cases = [
  [55, 40, 15, "CRITICAL"],
  [55, 10, 45, "WATCH"],
  [180, 20, 160, "LOW"],
  [55, 36, 19, "CRITICAL"], // boundary
  [55, 35, 20, "HIGH"],     // boundary
  [60, 0, 60, "LOW"],       // boundary
];
for (const [conn, delay, buf, tier] of cases) {
  assert.strictEqual(projectedBuffer(conn, delay), buf);
  assert.strictEqual(classifyBuffer(buf), tier, `${conn}-${delay}`);
}

const calm = { wind_speed_10m: 14, wind_gusts_10m: 26, precipitation: 0.1, weather_code: 51 };
assert.deepStrictEqual(weatherReasons(calm), []);
assert.strictEqual(weatherReasons({ ...calm, weather_code: 95 }).length, 1);
assert.strictEqual(weatherReasons({ ...calm, wind_gusts_10m: 80 }).length, 1);

console.log("All risk tests passed");
