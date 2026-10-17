/*
  Grading settings for the Puerto Rico Grid Report Card.

  HOW A METRIC IS SCORED (0–100 points)
  - Starting line: the Energy Bureau's FY2020 baseline (PREPA's performance before LUMA).
    If no official baseline exists, LUMA's first full year (FY2022) is used instead.
  - Goal: the Energy Bureau's benchmark. If there is no benchmark, or the benchmark is not
    better than the starting line, the goal is 25% better than the starting line.
  - Results at the starting line earn 60 points. Reaching the goal earns 100.
    Each step from the starting line toward the goal adds points in proportion.
    Results worse than the starting line lose points: 50% worse or more earns 0.

  WEIGHTS
  The weights follow the performance areas of the T&D Operation and Maintenance Agreement
  (reliability, customer service, safety, operations), with the most weight on the metrics
  the contract treats as key (SAIDI, SAIFI, OSHA fatalities, average speed of answer).
  They are this site's own choice, not the Energy Bureau's official Annex IX weights.
  Change any weight below; the page recalculates automatically. Weights do not need to add
  up to 100 — they are scaled.
*/
window.GRID_CONFIG = {
  pointsAtStart: 60,
  pointsAtGoal: 100,
  zeroWhenWorseBy: 0.5,      // 50% worse than the starting line = 0 points
  defaultGoalImprovement: 0.25,

  grades: [
    { letter: 'A', min: 90 },
    { letter: 'B', min: 80 },
    { letter: 'C', min: 70 },
    { letter: 'D', min: 60 },
    { letter: 'F', min: 0 }
  ],

  areas: [
    { key: 'reliability', name: 'Keeping the power on' },
    { key: 'service', name: 'Customer service' },
    { key: 'safety', name: 'Worker safety' },
    { key: 'operations', name: 'Running the system' }
  ],

  metrics: [
    { key: 'saidi', area: 'reliability', weight: 15, better: 'down', name: 'Hours without power per customer', unit: 'hours' },
    { key: 'saifi', area: 'reliability', weight: 15, better: 'down', name: 'Outages per customer', unit: 'count' },
    { key: 'caidi', area: 'reliability', weight: 5, better: 'down', name: 'Time to restore an outage', unit: 'minutes' },
    { key: 'veg', area: 'reliability', weight: 5, better: 'up', name: 'Miles of trees cleared from lines', unit: 'miles' },

    { key: 'calls', area: 'service', weight: 7, better: 'up', name: 'Customer calls answered', unit: 'percent' },
    { key: 'asa', area: 'service', weight: 6, better: 'down', name: 'Wait to reach an agent', unit: 'minutes' },
    { key: 'complaints', area: 'service', weight: 4, better: 'down', name: 'Customer complaint rate', unit: 'rate' },
    { key: 'estimated', area: 'service', weight: 4, better: 'down', name: 'Bills estimated instead of read', unit: 'percent' },
    { key: 'dispute', area: 'service', weight: 4, better: 'down', name: 'Days to resolve a billing dispute', unit: 'days' },

    { key: 'fatal', area: 'safety', weight: 8, better: 'down', name: 'Worker deaths on the job', unit: 'count' },
    { key: 'osha', area: 'safety', weight: 6, better: 'down', name: 'Worker injury rate', unit: 'rate' },
    { key: 'dart', area: 'safety', weight: 6, better: 'down', name: 'Serious injury rate (days away or restricted)', unit: 'rate' },

    { key: 'backlog', area: 'operations', weight: 7, better: 'down', name: 'Open repair and service orders', unit: 'count' },
    { key: 'losses', area: 'operations', weight: 4, better: 'down', name: 'Energy lost in the wires', unit: 'percent' },
    { key: 'fleet', area: 'operations', weight: 4, better: 'down', name: 'Work trucks out of service', unit: 'percent' }
  ]
};
