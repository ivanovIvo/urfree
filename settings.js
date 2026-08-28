const SETTINGS = Object.freeze({
  timezone: "Europe/Sofia",

  start: {
    year: 2026,
    month: 8,
    day: 24,
    hour: 2,
    minute: 10,
    second: 0
  },

  packsPerDay: 3,

  project: {
    initialBalance: -998.00,

    adjustments: [
      { date: "2026-08-27", amount: -80.00 }
    ]
  },

  prices: [
    {
      from: {
        year: 2026,
        month: 8,
        day: 24,
        hour: 2,
        minute: 10,
        second: 0
      },
      pricePerPack: 3.50
    }

    // Example:
    // {
    //   from: {
    //     year: 2026,
    //     month: 10,
    //     day: 29,
    //     hour: 0,
    //     minute: 0,
    //     second: 0
    //   },
    //   pricePerPack: 4.00
    // }
  ]
});
