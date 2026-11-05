/* ============================================================
   EDDIE'S DASHBOARD — CONFIG
   This is the one file you edit to change the dashboard.
   Or just tell Claude: "add a button to School that goes to ___".
   ============================================================ */
window.DASH_CONFIG = {
  name: "Eddie",

  // Leave null to auto-detect your location (the browser will ask permission).
  // Or pin it:  { name: "Austin, TX", lat: 30.27, lon: -97.74 }
  location: null,
  units: "fahrenheit", // "fahrenheit" or "celsius"

  // Header tabs. The first one is the welcome page.
  // `links` are buttons shown on that tab's page.
  tabs: [
    { id: "welcome",    label: "Welcome" },
    { id: "school",     label: "School",     blurb: "Classes, assignments, deadlines.",       links: [] },
    { id: "personal",   label: "Personal",   blurb: "Your own projects and life admin.",      links: [] },
    { id: "businesses", label: "Businesses", blurb: "The AI businesses you're building.",     links: [] },
    { id: "trading",    label: "Trading",    blurb: "Day trading — charts, journal, P/L.",    links: [
      { label: "TradingView", url: "https://www.tradingview.com/chart/", icon: "📈" }
    ] },
    { id: "investing",  label: "Investing",  blurb: "Long-term portfolio and research.",      links: [] },
    { id: "assistant",  label: "Assistant",  blurb: "Talk to your assistant, set up texting.", links: [] }
  ],

  // Buttons on the welcome page "Quick Launch" card.
  quickLaunch: [
    { label: "Gmail",     url: "https://mail.google.com",           icon: "✉" },
    { label: "Calendar",  url: "https://calendar.google.com",       icon: "◷" },
    { label: "Drive",     url: "https://drive.google.com",          icon: "▤" },
    { label: "Claude",    url: "https://claude.ai",                 icon: "✦" },
    { label: "TradingView", url: "https://www.tradingview.com",     icon: "↗" },
    { label: "YouTube",   url: "https://www.youtube.com",           icon: "▶" }
  ],

  // Rotating lines at the top. Add your own favorites.
  quotes: [
    "Discipline is choosing what you want most over what you want now.",
    "Small steps, every day, compound into something unreasonable.",
    "Build quietly. Let the results make the noise.",
    "Protect the downside; the upside takes care of itself.",
    "You don't rise to the level of your goals — you fall to the level of your systems."
  ],
  quoteSeconds: 20
};
