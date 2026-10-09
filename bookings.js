// SIMULATED. Stands in for the backend itinerary connection and the flight-status
// feed, which we don't have. Times are minutes relative to page load, so the
// screen makes sense whenever it's opened. Flight numbers are illustrative;
// delays are invented. Only the bookings change between scenarios; weather is
// always the live forecast.

const AIRPORTS = {
  // Real coordinates, used for the live Open-Meteo call.
  LHR: { name: "London Heathrow", lat: 51.4700, lon: -0.4543 },
  AMS: { name: "Amsterdam Schiphol", lat: 52.3086, lon: 4.7639 },
};

// Reused bookings
const P18422 = { ref: "P-18422", legs: [ // 55 min connection, 40 min delay -> 15
  { flight: "BA430", from: "LHR", to: "AMS", depMin: 15, arrMin: 85, delayMin: 40 },
  { flight: "KL643", from: "AMS", to: "JFK", depMin: 140, arrMin: 655, delayMin: 0 },
] };
const P18437 = { ref: "P-18437", legs: [ // 80 min connection, 30 min delay -> 50
  { flight: "KL1008", from: "LHR", to: "AMS", depMin: 70, arrMin: 140, delayMin: 30 },
  { flight: "KL641", from: "AMS", to: "JFK", depMin: 220, arrMin: 735, delayMin: 0 },
] };
const P18451 = { ref: "P-18451", legs: [ // 180 min connection, 20 min delay -> 160
  { flight: "BA428", from: "LHR", to: "AMS", depMin: 40, arrMin: 110, delayMin: 20 },
  { flight: "DL49", from: "AMS", to: "JFK", depMin: 290, arrMin: 805, delayMin: 0 },
] };

const SCENARIOS = {
  mixed: {
    label: "Mixed",
    bookings: [P18422, P18437, P18451],
  },
  busy: {
    label: "Busy evening",
    bookings: [
      P18422,
      { ref: "P-18460", legs: [ // 60 min connection, 50 min delay -> 10
        { flight: "KL1000", from: "LHR", to: "AMS", depMin: 10, arrMin: 80, delayMin: 50 },
        { flight: "KL611", from: "AMS", to: "ORD", depMin: 140, arrMin: 680, delayMin: 0 },
      ] },
      { ref: "P-18471", legs: [ // 50 min connection, 32 min delay -> 18
        { flight: "BA432", from: "LHR", to: "AMS", depMin: 30, arrMin: 100, delayMin: 32 },
        { flight: "KL605", from: "AMS", to: "SFO", depMin: 150, arrMin: 805, delayMin: 0 },
      ] },
      // Same delayed inbound flight as P-18437, but a tighter onward connection.
      { ref: "P-18488", legs: [ // 60 min connection, 30 min delay -> 30
        { flight: "KL1008", from: "LHR", to: "AMS", depMin: 70, arrMin: 140, delayMin: 30 },
        { flight: "KL615", from: "AMS", to: "BOS", depMin: 200, arrMin: 680, delayMin: 0 },
      ] },
      P18437,
    ],
  },
  quiet: {
    label: "Quiet day",
    bookings: [
      P18437,
      P18451,
      { ref: "P-18493", legs: [ // 90 min connection, 10 min delay -> 80
        { flight: "BA434", from: "LHR", to: "AMS", depMin: 45, arrMin: 115, delayMin: 10 },
        { flight: "KL691", from: "AMS", to: "YYZ", depMin: 205, arrMin: 700, delayMin: 0 },
      ] },
    ],
  },
};
