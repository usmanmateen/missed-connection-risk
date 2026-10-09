// The agent-facing screen. Booking and flight-status data come from bookings.js (simulated).
// Weather is the live Open-Meteo hourly forecast and is never substituted.

const LOADED_AT = Date.now();
let weather = { state: "loading", byAirport: {}, fetchedAt: null };

// Simulated scenario, chosen with ?scenario=busy etc. Defaults to "mixed".
const requested = new URLSearchParams(location.search).get("scenario");
let scenario = SCENARIOS[requested] ? requested : "mixed";

const codes = Object.keys(AIRPORTS);
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast" +
  `?latitude=${codes.map((c) => AIRPORTS[c].lat).join(",")}` +
  `&longitude=${codes.map((c) => AIRPORTS[c].lon).join(",")}` +
  "&hourly=precipitation,weather_code,wind_speed_10m,wind_gusts_10m" +
  "&forecast_days=2&wind_speed_unit=kmh&timezone=GMT";

async function loadWeather() {
  try {
    const res = await fetch(WEATHER_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [data]; // one entry per requested location, same order
    const byAirport = {};
    codes.forEach((code, i) => (byAirport[code] = list[i]));
    weather = { state: "ok", byAirport, fetchedAt: new Date() };
  } catch {
    weather = { state: "error", byAirport: {}, fetchedAt: null }; // never invent values
  }
  render();
}

const at = (offsetMin) => new Date(LOADED_AT + offsetMin * 60000);
const hhmm = (d) => d.toISOString().slice(11, 16);

function assess(booking) {
  const [inbound, onward] = booking.legs;
  const scheduledConnection = onward.depMin - inbound.arrMin;
  const buffer = projectedBuffer(scheduledConnection, inbound.delayMin);
  // Weather is matched by airport and time: origin at the delayed departure,
  // connection airport at the projected arrival.
  const checkpoints = [
    { code: inbound.from, when: at(inbound.depMin + inbound.delayMin), label: "departure" },
    { code: inbound.to, when: at(inbound.arrMin + inbound.delayMin), label: "arrival" },
  ].filter((p) => AIRPORTS[p.code]);
  return { booking, inbound, onward, scheduledConnection, buffer, tier: classifyBuffer(buffer), checkpoints, onwardDepMin: onward.depMin };
}

// Open-Meteo hourly value for the hour nearest `when` (times are GMT, "YYYY-MM-DDTHH:00").
function forecastAt(code, when) {
  const h = weather.byAirport[code]?.hourly;
  if (!h) return null;
  const hour = new Date(Math.round(when / 3600000) * 3600000).toISOString().slice(0, 13) + ":00";
  const i = h.time.indexOf(hour);
  if (i < 0) return null;
  return { hour, precipitation: h.precipitation[i], weather_code: h.weather_code[i],
           wind_speed_10m: h.wind_speed_10m[i], wind_gusts_10m: h.wind_gusts_10m[i] };
}

function weatherAt(p) {
  const f = forecastAt(p.code, p.when);
  if (!f) return `<div class="wx"><b>${p.code}</b> · no forecast for that hour</div>`;
  const u = weather.byAirport[p.code].hourly_units;
  const reasons = weatherReasons(f);
  const signal = reasons.length
    ? `<span class="elevated">Severe-weather signal: Elevated — ${reasons.join(", ")}</span>`
    : "No severe-weather signal";
  return `<div class="wx">
    <div><b>${p.code}</b> · ${f.hour.slice(11)} UTC, ${p.label}</div>
    <div>Wind ${f.wind_speed_10m} ${u.wind_speed_10m} · Gusts ${f.wind_gusts_10m} ${u.wind_gusts_10m} · Precipitation ${f.precipitation} ${u.precipitation}/h</div>
    <div>${signal}</div>
  </div>`;
}

function weatherSection(a) {
  if (weather.state === "loading") return "Loading live weather…";
  if (weather.state === "error") return "Live weather is unavailable right now. The connection risk above doesn't depend on it.";
  return `<div class="wx-grid">${a.checkpoints.map(weatherAt).join("")}</div>`;
}

const route = (a) => `${a.booking.legs.map((l) => l.from).join(" → ")} → ${a.onward.to}`;

function card(a) {
  const { booking, inbound, onward, buffer, scheduledConnection, tier } = a;
  // Same simplification as the buffer: the onward flight's scheduled departure is used.
  const arrives = at(inbound.arrMin + inbound.delayMin);
  const departs = at(onward.depMin);
  return `<article class="card tier-${tier.toLowerCase()}">
    <div class="head"><span class="tier">${tier}</span> — ${booking.ref} — ${route(a)}</div>
    <div class="buffer">${buffer} min</div>
    <div class="label">projected connection remaining</div>
    <div class="timeline">${inbound.flight} projected arrival ${inbound.to} ${hhmm(arrives)} UTC → ${onward.flight} departure ${hhmm(departs)} UTC → ${buffer} min projected connection</div>
    <p class="why">${inbound.flight} is delayed ${inbound.delayMin} min. The original ${scheduledConnection} min connection at ${inbound.to} is now projected to be ${buffer} min.</p>
    <div class="next">
      <div class="next-title">Agent next step</div>
      <div>Review this booking now. Verify the latest flight status and check the available onward options before contacting the traveller or changing the itinerary.</div>
      <div class="muted small">No action is taken automatically.</div>
    </div>
    <div class="weather">
      <div class="weather-title">Live weather around journey time</div>
      ${weatherSection(a)}
    </div>
  </article>`;
}

// Lower-risk bookings stay small so they don't compete with the real problem.
const row = (a) =>
  `<div class="row tier-${a.tier.toLowerCase()}"><span class="tier">${a.tier}</span> — ${a.booking.ref} — ${a.buffer} min projected connection</div>`;

function render() {
  document.getElementById("scenarios").innerHTML = "Simulated scenario: " +
    Object.entries(SCENARIOS).map(([key, s]) =>
      `<button data-scenario="${key}"${key === scenario ? ' aria-pressed="true"' : ""}>${s.label}</button>`).join("");

  const assessed = SCENARIOS[scenario].bookings.map(assess).sort(byUrgency);
  const atRisk = (a) => a.tier === "CRITICAL" || a.tier === "HIGH";
  const urgent = assessed.filter(atRisk);
  document.getElementById("cards").innerHTML =
    (urgent.length ? urgent.map(card).join("") : `<p class="none">No connections need an agent right now. Still monitoring:</p>`) +
    assessed.filter((a) => !atRisk(a)).map(row).join("");

  document.getElementById("source").innerHTML =
    weather.state === "ok"
      ? `Weather: Open-Meteo hourly forecast, fetched ${hhmm(weather.fetchedAt)} UTC · <a href="${WEATHER_URL}" target="_blank" rel="noopener">raw data</a>`
      : "";
}

document.addEventListener("click", (e) => {
  const key = e.target.dataset.scenario;
  if (!key) return;
  scenario = key;
  const url = new URL(location.href);
  if (key === "mixed") url.searchParams.delete("scenario"); else url.searchParams.set("scenario", key);
  history.replaceState(null, "", url);
  render();
});

render();
loadWeather();
