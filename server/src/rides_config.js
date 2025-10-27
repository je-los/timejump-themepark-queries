/**
 * Static configuration variables for the Time Jump theme park simulation.
 * These are the values used in the formulas.
 */

// --- Park Operational Parameters ---
export const BASE_ATTENDANCE = 10000; // Expected visitors on a standard weekday
export const OPERATING_HOURS = 12;    // 10:00 to 22:00

// --- Simulation Multipliers ---
export const MULTIPLIERS = {
    // Multiplier for overall daily attendance based on time of year
    seasonal: {
        peak_summer: 1.8,  // July/August
        shoulder: 1.3,     // April-June, Sept-Oct
        off_peak: 0.7      // Nov-Mar
    },
    // Multiplier for overall daily attendance based on day of week
    day_of_week: {
        weekend_sat: 1.4,
        weekend_sun: 1.2,
        weekday: 1.0
    },
    // Hourly distribution curve (must sum to 1.0)
    hourly_distribution: [
        0.08, // Hour 1 (10:00) - Initial rush
        0.10, // Hour 2
        0.12, // Hour 3
        0.15, // Hour 4 (Lunch Peak starts)
        0.17, // Hour 5 (2:00 PM Peak)
        0.13, // Hour 6
        0.10, // Hour 7 (Dinner lull)
        0.08, // Hour 8
        0.05, // Hour 9
        0.02, // Hour 10 (closing)
    ]
};

const slugify = (str='') =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const THEME_DESCRIPTIONS = {
    'Jurassic Zone': 'Primeval jungles, thunderous coasters, and aquatic escapades inspired by Earth’s fearless past.',
    'Medieval Fantasy Zone': 'Soaring dragons, enchanted quests, and live-action tournaments straight from the realm of legend.',
    'Wild West Zone': 'Dusty canyons, runaway trains, and stunt shows that bring frontier folklore to life.',
    'Nova-Crest (Futuristic Zone)': 'Gravity-defying coasters, immersive simulators, and nighttime spectacles from the future of thrills.'
};

// --- Ride-Specific Configuration ---
// These define the variables for the Ride Usage and Breakdown Formulas.
const rawRides = [
    // --- JURASSIC ZONE ---
    { id: 1, theme: "Jurassic Zone", name: "Pterodactyl Plunge", type: "Coaster",
        attraction_rate: 0.045, // High thrill
        capacity_cap: 1400, // riders/hr
        failure_rate: 0.05 // 5% daily chance of breakdown
    },
    { id: 2, theme: "Jurassic Zone", name: "Cretaceous Crossing", type: "Dark Ride",
        attraction_rate: 0.035,
        capacity_cap: 1800, // High capacity dark ride
        failure_rate: 0.03
    },
    { id: 3, theme: "Jurassic Zone", name: "Raptor Rapids", type: "Water Ride",
        attraction_rate: 0.025,
        capacity_cap: 1000,
        failure_rate: 0.03
    },
    { id: 4, theme: "Jurassic Zone", name: "The Extinction Event", type: "Show",
        attraction_rate: 0.015,
        capacity_cap: 800,
        failure_rate: 0.01 // Low chance of mechanical failure
    },
    // --- MEDIEVAL FANTASY ZONE ---
    { id: 5, theme: "Medieval Fantasy Zone", name: "Dragon Rider's Fury", type: "Coaster",
        attraction_rate: 0.048, // Top-tier attraction
        capacity_cap: 1200,
        failure_rate: 0.06 // High-tech coaster = higher failure rate
    },
    { id: 6, theme: "Medieval Fantasy Zone", name: "Quest of the Crystal King", type: "Interactive Dark Ride",
        attraction_rate: 0.038,
        capacity_cap: 1600,
        failure_rate: 0.04
    },
    { id: 7, theme: "Medieval Fantasy Zone", name: "The Royal Tournament", type: "Flat Ride",
        attraction_rate: 0.020,
        capacity_cap: 850,
        failure_rate: 0.02
    },
    { id: 13, theme: "Medieval Fantasy Zone", name: "The Sword in the Stone", type: "Show",
        attraction_rate: 0.018, // Good draw due to live stunts
        capacity_cap: 1500, // Large arena capacity
        failure_rate: 0.02
    },
    // --- WILD WEST ZONE ---
    { id: 8, theme: "Wild West Zone", name: "Runaway Gold Mine", type: "Wooden Coaster",
        attraction_rate: 0.040,
        capacity_cap: 1100,
        failure_rate: 0.05
    },
    { id: 9, theme: "Wild West Zone", name: "The Rattlesnake Robbery", type: "Shooting Gallery",
        attraction_rate: 0.030,
        capacity_cap: 1500,
        failure_rate: 0.02
    },
    { id: 10, theme: "Wild West Zone", name: "Oil Derrick Drop", type: "Drop Tower",
        attraction_rate: 0.035,
        capacity_cap: 750,
        failure_rate: 0.03
    },
    { id: 14, theme: "Wild West Zone", name: "The High Noon Shootout", type: "Show",
        attraction_rate: 0.012, // Street performance, slightly lower capacity
        capacity_cap: 600,
        failure_rate: 0.01
    },
    // --- FUTURISTIC ZONE (NOVA-CREST) ---
    { id: 11, theme: "Nova-Crest (Futuristic Zone)", name: "Cosmic Collapse: Wormhole Jump", type: "Indoor Coaster",
        attraction_rate: 0.043,
        capacity_cap: 1300,
        failure_rate: 0.05
    },
    { id: 12, theme: "Nova-Crest (Futuristic Zone)", name: "The Zero-G Skyway", type: "Motion Simulator",
        attraction_rate: 0.033,
        capacity_cap: 1900,
        failure_rate: 0.04
    },
    { id: 15, theme: "Nova-Crest (Futuristic Zone)", name: "Symphony of the Nexus", type: "Show",
        attraction_rate: 0.022, // High draw as a nighttime spectacular
        capacity_cap: 2200, // Massive outdoor viewing area capacity
        failure_rate: 0.03
    }
];

export const RIDE_CONFIGS = rawRides.map(ride => ({
    ...ride,
    slug: slugify(ride.name)
}));

const themeMap = {};
for (const ride of RIDE_CONFIGS) {
    if (!themeMap[ride.theme]) {
        themeMap[ride.theme] = {
            name: ride.theme,
            slug: slugify(ride.theme),
            description: THEME_DESCRIPTIONS[ride.theme] || '',
            rides: []
        };
    }
    themeMap[ride.theme].rides.push({
        id: ride.id,
        name: ride.name,
        slug: ride.slug,
        type: ride.type,
        attraction_rate: ride.attraction_rate,
        capacity_cap: ride.capacity_cap,
        failure_rate: ride.failure_rate
    });
}

export const THEMES = Object.values(themeMap);
