// Screen logic. Booking/flight data comes from bookings.js (simulated);
// weather comes live from Open-Meteo and is never substituted.

const LOADED_AT = Date.now();
const STALE_AFTER_MIN = 60;
const acknowledged = new Map(); // ref -> Date (in-memory only)

let weather = { state: "loading", byAirport: {}, fetchedAt: null, error: null };

const WMO = {
  0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle", 61: "Light rain", 63: "Rain",
  65: "Heavy rain", 66: "Freezing rain", 67: "Heavy freezing rain", 71: "Light snow", 73: "Snow",
  75: "Heavy snow", 80: "Rain showers", 81: "Heavy showers", 82: "Violent showers",
  85: "Snow showers", 86: "Heavy snow showers", 95: "Thunderstorm", 96: "Thunderstorm, hail", 99: "Thunderstorm, heavy hail",
};

const codes = Object.keys(AIRPORTS);
const WEATHER_URL =
  "https://api.open-meteo.com/v1/forecast" +
  `?latitude=${codes.map((c) => AIRPORTS[c].lat).join(",")}` +
  `&longitude=${codes.map((c) => AIRPORTS[c].lon).join(",")}` +
  "&hourly=precipitation,weather_code,wind_speed_10m,wind_gusts_10m" +
  "&forecast_days=2&wind_speed_unit=kmh&timezone=GMT";

async function loadWeather() {
  weather = { ...weather, state: "loading" };
  render();
  try {
    const res = await fetch(WEATHER_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const list = Array.isArray(data) ? data : [data]; // one entry per requested location, same order
    const byAirport = {};
    codes.forEach((code, i) => (byAirport[code] = list[i]));
    weather = { state: "ok", byAirport, fetchedAt: new Date(), error: null };
  } catch (err) {
    // Keep showing the last good reading if there is one; never invent values.
    weather = { ...weather, state: "error", error: err.message };
  }
  render();
}

// ---- derived booking view ----

const at = (offsetMin) => new Date(LOADED_AT + offsetMin * 60000);
const minsUntil = (date) => Math.round((date - Date.now()) / 60000);
const hhmm = (d) => d.toISOString().slice(11, 16);

function fmtDuration(min) {
  if (min <= 0) return "landed";
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

function assess(booking) {
  const [inbound, onward] = booking.legs;
  const scheduledConnection = onward.depMin - inbound.arrMin;
  const buffer = projectedBuffer(scheduledConnection, inbound.delayMin);
  const departs = at(inbound.depMin + inbound.delayMin);
  const lands = at(inbound.arrMin + inbound.delayMin); // projected arrival at connection airport
  // Weather is matched by airport AND time: origin at the delayed departure,
  // connection airport at the projected arrival.
  const checkpoints = [
    { code: inbound.from, when: departs, label: "departure" },
    { code: inbound.to, when: lands, label: "arrival" },
  ].filter((p) => AIRPORTS[p.code]);
  const weatherFlags = checkpoints.flatMap((p) => {
    const f = forecastAt(p.code, p.when);
    return f ? weatherReasons(f).map((r) => `${p.code}: ${r}`) : [];
  });
  return { booking, inbound, onward, scheduledConnection, buffer, tier: classifyBuffer(buffer), lands, checkpoints, weatherFlags };
}

// ---- rendering ----

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

function weatherBlock(p) {
  const { code } = p;
  const w = weather.byAirport[code];
  const c = forecastAt(code, p.when);
  if (!c) {
    const msg = weather.state === "loading" ? "Loading…" : w ? "No forecast for that hour" : "Weather unavailable";
    return `<div class="wx"><div class="wx-code">${code}</div><div class="muted">${msg}</div></div>`;
  }
  const u = w.hourly_units;
  const reasons = weatherReasons(c);
  const signal = reasons.length
    ? `<span class="stale">Severe-weather signal: Elevated — ${reasons.join(", ")}</span>`
    : "Severe-weather signal: None at projected travel time";
  return `<div class="wx">
    <div class="wx-code">${code} <span class="muted">${AIRPORTS[code].name}</span></div>
    <dl>
      <dt>Wind</dt><dd>${c.wind_speed_10m} ${u.wind_speed_10m} <span class="muted">(gusts ${c.wind_gusts_10m})</span></dd>
      <dt>Precip</dt><dd>${c.precipitation} ${u.precipitation} <span class="muted">/ hour</span></dd>
      <dt>Conditions</dt><dd>${WMO[c.weather_code] ?? "Unknown"} <span class="muted">(WMO ${c.weather_code})</span></dd>
    </dl>
    <div class="small">${signal}</div>
    <div class="muted small">Forecast for ${c.hour.slice(11)} UTC (nearest hour to ${p.label})</div>
  </div>`;
}

function card(a) {
  const { booking, inbound, onward, buffer, tier, scheduledConnection, lands, weatherFlags } = a;
  if (tier === "LOW") {
    // Not an alert: one line, so it doesn't compete with real problems.
    return `<div class="low-row"><span class="tier tier-low">LOW</span> <strong>${booking.ref}</strong>
      ${booking.legs.map((l) => l.from).join(" → ")} → ${onward.to} · ${inbound.flight} +${inbound.delayMin}m ·
      ${buffer}m buffer · no action needed</div>`;
  }
  const ack = acknowledged.get(booking.ref);
  const why = `Inbound ${inbound.flight} delay of +${inbound.delayMin}m cuts the ${scheduledConnection}m connection at ${inbound.to} to ${buffer}m.`;
  return `<article class="card tier-${tier.toLowerCase()} ${ack ? "acked" : ""}">
    <header class="card-head">
      <span class="tier">${tier}</span>
      <strong>${booking.ref}</strong>
      <span class="route">${booking.legs.map((l) => l.from).join(" → ")} → ${onward.to}</span>
      <span class="muted">${booking.traveller}</span>
      ${weatherFlags.length ? `<span class="wx-badge">Weather signal</span>` : ""}
    </header>

    <div class="signals">
      <div class="big">
        <div class="label">Projected connection buffer</div>
        <div class="value">${buffer} min</div>
        <div class="muted small">scheduled ${scheduledConnection}m − delay ${inbound.delayMin}m</div>
      </div>
      <div class="big secondary">
        <div class="label">Lands at ${inbound.to} in</div>
        <div class="value">${fmtDuration(minsUntil(lands))}</div>
        <div class="muted small">${inbound.flight} projected arrival ${hhmm(lands)} UTC</div>
      </div>
    </div>

    <p class="why"><strong>Why flagged:</strong> ${why}
      ${weatherFlags.length ? `<br><strong>Weather (supporting signal, does not change tier):</strong> ${weatherFlags.join("; ")}.` : ""}</p>

    <div class="weather">${a.checkpoints.map(weatherBlock).join("")}</div>

    <details>
      <summary>Itinerary</summary>
      <table>
        <tr><th>Flight</th><th>Route</th><th>Sched dep</th><th>Sched arr</th><th>Delay</th></tr>
        ${booking.legs.map((l) => `<tr><td>${l.flight}</td><td>${l.from}→${l.to}</td><td>${hhmm(at(l.depMin))}</td><td>${hhmm(at(l.arrMin))}</td><td>${l.delayMin ? "+" + l.delayMin + "m" : "on time"}</td></tr>`).join("")}
      </table>
      <p class="muted small">Times UTC. Flight status: simulated, unconfirmed.</p>
    </details>

    <footer class="card-foot">
      ${ack ? `<span class="muted">Acknowledged ${hhmm(ack)} UTC</span> <button data-ack="${booking.ref}">Undo</button>`
            : `<button class="primary" data-ack="${booking.ref}">Acknowledge</button>`}
    </footer>
  </article>`;
}

function render() {
  const assessed = BOOKINGS.map(assess).sort(
    (x, y) => TIER_ORDER[x.tier] - TIER_ORDER[y.tier] || x.lands - y.lands
  );
  const count = (t) => assessed.filter((a) => a.tier === t).length;

  document.getElementById("summary").innerHTML = `
    <span><b>${assessed.length}</b> monitored</span>
    <span class="t-critical"><b>${count("CRITICAL")}</b> critical</span>
    <span class="t-high"><b>${count("HIGH")}</b> high</span>
    <span class="t-watch"><b>${count("WATCH")}</b> watch</span>
    <span><b>${count("LOW")}</b> low</span>`;

  const ws = document.getElementById("weather-status");
  if (weather.state === "loading") ws.textContent = "Loading live weather…";
  else if (weather.state === "error")
    ws.innerHTML = `<span class="stale">Weather unavailable (${weather.error}).</span> Connection risk is unaffected${weather.fetchedAt ? `; showing last reading from ${hhmm(weather.fetchedAt)} UTC` : ""}.`;
  else {
    const stale = minsUntil(weather.fetchedAt) < -STALE_AFTER_MIN;
    ws.innerHTML = `Forecast fetched ${hhmm(weather.fetchedAt)} UTC${stale ? ' <span class="stale">· STALE, refresh</span>' : ""}`;
  }

  document.getElementById("cards").innerHTML = assessed.map(card).join("");
}

document.addEventListener("click", (e) => {
  const ref = e.target.dataset.ack;
  if (ref) {
    acknowledged.has(ref) ? acknowledged.delete(ref) : acknowledged.set(ref, new Date());
    render();
  }
  if (e.target.id === "refresh") loadWeather();
});

document.getElementById("raw-link").href = WEATHER_URL;
setInterval(render, 30000); // keep countdowns ticking
loadWeather();
