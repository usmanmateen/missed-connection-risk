# Disruption Watch: Question 7 prototype

**Live:** https://usmanmateen.github.io/missed-connection-risk/

Prototype for an **invented assessment scenario**. Nothing here describes a real Perk system or
rule.

**What's proposed:** a proactive workflow that catches missed connections before the traveller is
stranded:

```
Booking itinerary → flight-status signal → projected connection buffer
  → weather as supporting context → prioritised case in Care's existing queue → a human decides
```

This page is only the information an agent would see when a case is surfaced. It answers:
**which bookings are at risk, and why?**

## Run

Open `index.html` in a browser. There's no build or install step. If your browser blocks the
request from `file://`, serve the folder instead:

```
python -m http.server 8000   # then open http://localhost:8000
```

Tests: `node risk.test.js`

## Real vs simulated

| Data | Source |
|---|---|
| Weather at LHR and AMS (wind, gusts, precipitation, WMO code) | **Live** hourly forecast from Open-Meteo `/v1/forecast`, in one request for both airports. The page links to the raw response, and units come from the response. |
| Bookings, flight numbers, delays | **Simulated** (`bookings.js`), standing in for the backend itinerary connection and the flight-status feed. Times are offsets from page load, so the countdowns always make sense. |

If Open-Meteo fails, the page says "Weather unavailable". It keeps the last good forecast, with
its fetch time, if there is one, and leaves the connection risk unchanged. No weather value is
ever made up. A forecast fetched more than 60 minutes ago is marked STALE.

## Logic

All thresholds are prototype placeholders, not Perk values and not minimum connection times.

- **Projected buffer** = scheduled connection − inbound delay. *This is a prototype
  simplification.* The real formula is **current onward departure − predicted inbound
  arrival**. A real version should also account for:
  - a delay on the onward leg, which can save the connection
  - the applicable minimum connection time, where reliable data exists
  - terminal or gate transfer requirements

  None of these are built here.
- **Risk level:** CRITICAL < 20 min · HIGH 20–44 · WATCH 45–59 · LOW ≥ 60. LOW bookings collapse
  to one line, so a 20-minute delay against a 3-hour buffer doesn't page anyone.
- **"Lands at [connection airport] in"** is the time until the inbound flight's projected arrival
  (scheduled arrival + delay), taken straight from the flight data. There's no invented "act
  by" deadline.
- **Weather is matched by airport and time.** The prototype follows the connection at AMS in an
  LHR → AMS → JFK itinerary. Each booking shows the forecast for LHR at its delayed departure
  hour and for AMS at its projected arrival hour (nearest hour), because those two moments decide
  whether the connection is made.
- **Severe-weather check:** a signal fires on sustained wind ≥ 50 km/h, gusts ≥ 70 km/h,
  precipitation ≥ 8 mm/h, or a severe WMO code (heavy rain or snow, freezing rain, violent
  showers, thunderstorm). Each weather panel states the result: "None at projected travel time"
  or "Elevated — [reason]". **The signal never changes the risk level and never triggers an
  action.**

## v1 deliberately does NOT

- automatically rebook travellers, issue refunds, or contact travellers
- watch every disruption type (cancellations, gate changes, diversions)
- poll every itinerary continuously
- treat weather as proof of a disruption
- save acknowledgements (they're held in memory, which is enough for a mockup)

## How a real version might work (hypothetical, not built)

- **Weather decides where to look, not who to alert.** A forecast weather window at an airport
  increases how often connections through that window are checked. Flight status shows what's
  actually happening, and the buffer decides each traveller's risk.
- **Adaptive polling** keeps the status feed within cost and rate limits:
  - rarely when a trip is days away
  - frequently in the final hours, for tight connections
  - more often inside a weather window
  - not at all once the connection is made
- **Feed reliability:** a reading that puts a connection at risk triggers an immediate re-check,
  and the case escalates only if the status holds. A reversal downgrades the case.
- **Next steps:**
  - replace the fixtures with the real backend and feed
  - switch to the real buffer formula
  - run in shadow mode against past disruptions before any traveller contact
