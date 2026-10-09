// Risk rules. Pure functions, no DOM, so they can be tested with `node risk.test.js`.
// All thresholds are PROTOTYPE ASSUMPTIONS for the exercise, not real production
// values and not airport-specific minimum connection times (MCTs).

const BUFFER_THRESHOLDS = { critical: 20, high: 45, watch: 60 }; // minutes

// PROTOTYPE SIMPLIFICATION: buffer = scheduled connection - inbound delay.
// A real version would use (current onward departure - predicted inbound arrival),
// so onward delays count, and compare it with the airport's minimum connection time.

// Weather is a supporting signal only. It never changes the connection tier.
const WEATHER_THRESHOLDS = {
  windKmh: 50,          // sustained 10 m wind
  gustKmh: 70,          // 10 m gusts
  precipMmH: 8,         // hourly forecast total; ~heavy rain
  // WMO codes: heavy rain, freezing rain, heavy snow, violent showers, thunderstorm
  severeCodes: [65, 67, 75, 82, 86, 95, 96, 99],
};

const TIER_ORDER = { CRITICAL: 0, HIGH: 1, WATCH: 2, LOW: 3 };

function projectedBuffer(scheduledConnectionMin, inboundDelayMin) {
  return scheduledConnectionMin - inboundDelayMin;
}

function classifyBuffer(bufferMin) {
  if (bufferMin < BUFFER_THRESHOLDS.critical) return "CRITICAL";
  if (bufferMin < BUFFER_THRESHOLDS.high) return "HIGH";
  if (bufferMin < BUFFER_THRESHOLDS.watch) return "WATCH";
  return "LOW";
}

// Order for the screen: risk level first, then the smallest projected connection,
// then the earliest onward departure.
function byUrgency(a, b) {
  return TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.buffer - b.buffer || a.onwardDepMin - b.onwardDepMin;
}

// Takes one hourly forecast point; returns human-readable reasons (empty = no signal).
function weatherReasons(w) {
  const r = [];
  if (w.wind_speed_10m >= WEATHER_THRESHOLDS.windKmh) r.push(`wind ${w.wind_speed_10m} km/h`);
  if (w.wind_gusts_10m >= WEATHER_THRESHOLDS.gustKmh) r.push(`gusts ${w.wind_gusts_10m} km/h`);
  if (w.precipitation >= WEATHER_THRESHOLDS.precipMmH) r.push(`precip ${w.precipitation} mm/h`);
  if (WEATHER_THRESHOLDS.severeCodes.includes(w.weather_code)) r.push(`WMO code ${w.weather_code}`);
  return r;
}

if (typeof module !== "undefined") {
  module.exports = { BUFFER_THRESHOLDS, WEATHER_THRESHOLDS, TIER_ORDER, projectedBuffer, classifyBuffer, weatherReasons, byUrgency };
}
