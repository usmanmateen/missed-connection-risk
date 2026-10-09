# Missed connection risk

**Live:** https://usmanmateen.github.io/missed-connection-risk/

**What this prototype shows:** a simulated flight delay reduces a traveller's connection time.
The page calculates the remaining buffer and shows live weather at the relevant airports and
times alongside it.

It's the screen a support agent would see when a risky connection is flagged. That's the output
of the process, not the whole automation.

## Real and simulated data

- **Weather is live:** the Open-Meteo hourly forecast for LHR at the delayed departure hour and
  for AMS at the projected arrival hour. It's never made up. If the call fails, the page says so,
  and the connection risk is still shown.
- **Bookings and flight status are simulated** (`bookings.js`), invented for an assessment
  exercise. A real system would replace them with the actual booking backend and a
  flight-status feed.

## How the numbers work

- **Projected connection** = scheduled connection − inbound delay. That's a simplification. A
  real version would use the expected onward departure minus the predicted inbound arrival.
- **Risk levels** are placeholders: CRITICAL under 20 min, HIGH 20–44, WATCH 45–59, LOW 60+.
- **The severe-weather check** uses placeholder thresholds: wind ≥ 50 km/h, gusts ≥ 70 km/h,
  precipitation ≥ 8 mm/h, or a severe WMO weather code. It's shown alongside the booking and
  never changes the risk level.

## Iteration trail

Three snapshots, taken from the real commits in this repo:

- **V1** ([iterations/v1](https://usmanmateen.github.io/missed-connection-risk/iterations/v1/), commit `ebd144a`):
  I initially built too much.
- **V2** ([iterations/v2](https://usmanmateen.github.io/missed-connection-risk/iterations/v2/), commit `65726e7`):
  I stripped it back to the core question: which booking is at risk, and why?
- **V3** ([iterations/v3](https://usmanmateen.github.io/missed-connection-risk/iterations/v3/), commit `715dceb`):
  I realised an agent also needed to know what to do next, so I added only the timeline and
  next-step guidance. This is the version at the main link.

The snapshots are as committed. The only edit is in V1, where one sentence on the page and one
code comment originally named the company that set the exercise. That word is replaced with
"real".

## Run

Open `index.html`, or serve the folder with `python -m http.server 8000` and open
http://localhost:8000.

Tests: `node risk.test.js`
