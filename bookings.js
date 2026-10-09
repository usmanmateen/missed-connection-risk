// SIMULATED. Stands in for the backend itinerary connection and the flight-status
// feed, which we don't have. Times are minutes relative to page load so the
// countdowns are meaningful whenever the page is opened. Flight numbers are
// illustrative; delays are invented.

const AIRPORTS = {
  // Real coordinates, used for the live Open-Meteo call.
  LHR: { name: "London Heathrow", lat: 51.4700, lon: -0.4543 },
  AMS: { name: "Amsterdam Schiphol", lat: 52.3086, lon: 4.7639 },
};

const BOOKINGS = [
  {
    ref: "P-18422",
    traveller: "R. Okafor",
    legs: [
      { flight: "BA430", from: "LHR", to: "AMS", depMin: 15, arrMin: 85, delayMin: 40 },
      { flight: "KL643", from: "AMS", to: "JFK", depMin: 140, arrMin: 655, delayMin: 0 },
    ],
  },
  {
    ref: "P-18437",
    traveller: "S. Lindqvist",
    legs: [
      { flight: "KL1008", from: "LHR", to: "AMS", depMin: 70, arrMin: 140, delayMin: 30 },
      { flight: "KL641", from: "AMS", to: "JFK", depMin: 220, arrMin: 735, delayMin: 0 },
    ],
  },
  {
    ref: "P-18451",
    traveller: "M. Haddad",
    legs: [
      { flight: "BA428", from: "LHR", to: "AMS", depMin: 40, arrMin: 110, delayMin: 20 },
      { flight: "DL49", from: "AMS", to: "JFK", depMin: 290, arrMin: 805, delayMin: 0 },
    ],
  },
];
