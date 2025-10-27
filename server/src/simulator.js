import { query } from './db.js';
import { BASE_ATTENDANCE, MULTIPLIERS, OPERATING_HOURS, RIDE_CONFIGS } from './rides_config.js';

// --- Utility Functions ---

/**
 * Returns a random date (in the past 30 days) for simulation.
 * In a real cron job, this would be new Date().
 * @returns {Date} A simulated date for insertion.
 */
function getSimulatedDate() {
    const today = new Date();
    // Simulate a date in the past 30 days for initial data population
    const daysAgo = Math.floor(Math.random() * 30);
    today.setDate(today.getDate() - daysAgo);
    return today;
}

/**
 * Determines the seasonal multiplier based on the month.
 * @param {Date} date
 * @returns {number} The appropriate multiplier.
 */
function getSeasonMultiplier(date) {
    const month = date.getMonth() + 1; // 1-12
    if (month >= 7 && month <= 8) return MULTIPLIERS.seasonal.peak_summer;
    if (month >= 4 && month <= 6 || month >= 9 && month <= 10) return MULTIPLIERS.seasonal.shoulder;
    return MULTIPLIERS.seasonal.off_peak;
}

/**
 * Determines the day of week multiplier.
 * @param {Date} date
 * @returns {number} The appropriate multiplier.
 */
function getDayMultiplier(date) {
    const day = date.getDay(); // 0 (Sun) - 6 (Sat)
    if (day === 6) return MULTIPLIERS.day_of_week.weekend_sat;
    if (day === 0) return MULTIPLIERS.day_of_week.weekend_sun;
    return MULTIPLIERS.day_of_week.weekday;
}

/**
 * Simulates the hourly customer count using the Foot Traffic Formula.
 * @param {Date} date - The date being simulated.
 * @param {number} hourIndex - The current hour of operation (0 to 11).
 * @returns {number} The calculated number of visitors for that hour.
 */
function simulateHourlyTraffic(date, hourIndex) {
    const seasonFactor = getSeasonMultiplier(date);
    const dayFactor = getDayMultiplier(date);
    const timeFactor = MULTIPLIERS.hourly_distribution[hourIndex];

    // Total calculated attendance for the day
    const totalDailyAttendance = BASE_ATTENDANCE * seasonFactor * dayFactor;

    // Hourly_Visitors = (Total_Daily * Time_Distribution) +/- Random_Noise
    const randomNoise = (Math.random() * 0.10) - 0.05; // Random variation between -5% and +5%

    const baseHourly = totalDailyAttendance * timeFactor;
    const finalHourly = baseHourly * (1 + randomNoise);

    return Math.max(0, Math.round(finalHourly));
}

/**
 * Runs the breakdown probability check for all rides.
 * If the check passes, logs a maintenance entry.
 * @param {Date} date - The date for the breakdown log.
 */
async function runBreakdownCheck(date) {
    console.log(`\n--- Running Daily Maintenance Check for ${date.toISOString().split('T')[0]} ---`);
    const dateString = date.toISOString().split('T')[0];
    let breakdownsLogged = 0;

    for (const ride of RIDE_CONFIGS) {
        // Breakdown_Check = RANDOM() < RIDE_FAILURE_RATE
        if (Math.random() < ride.failure_rate) {
            // Logs a maintenance entry with minimal detail, requiring manual update later
            const sql = `
                INSERT INTO maintenance_log (log_date, ride_id, reason, status, severity, notes)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            const params = [
                dateString,
                ride.id,
                'Mechanical Fault Check',
                'Reported',
                'Major',
                `Automated check detected high-probability failure (${(ride.failure_rate * 100).toFixed(1)}%). Requires inspection.`
            ];
            await query(sql, params);
            breakdownsLogged++;
        }
    }
    console.log(`Maintenance Check Complete. ${breakdownsLogged} ride(s) logged for maintenance.`);
}

/**
 * Runs the main daily simulation loop.
 * @param {Date} date - The date to simulate.
 */
async function runDailySimulation(date) {
    const dateString = date.toISOString().split('T')[0];
    console.log(`\n======================================================`);
    console.log(`STARTING SIMULATION FOR: ${dateString}`);
    console.log(`======================================================`);

    const footTrafficEntries = [];
    const rideUsageEntries = [];

    let totalDailyAttendance = 0;

    // --- 1. FOOT TRAFFIC & RIDE USAGE LOOP (Hourly) ---
    for (let h = 0; h < OPERATING_HOURS; h++) {
        // Calculate the simulated customer count for this hour
        const hourlyVisitors = simulateHourlyTraffic(date, h);
        totalDailyAttendance += hourlyVisitors;

        // Create the DATETIME object for the log entry
        const logTimestamp = new Date(date);
        logTimestamp.setHours(10 + h, 0, 0, 0); // Park opens at 10:00

        // 1. Log Foot Traffic
        footTrafficEntries.push([
            logTimestamp,
            dateString,
            hourlyVisitors,
            'Simulated Hourly Gate'
        ]);

        // 2. Log Ride Usage (Iterate through all 12 rides)
        for (const ride of RIDE_CONFIGS) {
            // Ride_Boardings = Hourly_Visitors * Ride_Attraction_Rate * Capacity_Cap
            const calculatedBoardings = hourlyVisitors * ride.attraction_rate;

            // Cap the boardings at the theoretical maximum capacity
            const boardings = Math.min(
                Math.round(calculatedBoardings),
                ride.capacity_cap
            );

            rideUsageEntries.push([
                logTimestamp,
                dateString,
                ride.id,
                boardings
            ]);
        }
    }

    // --- DATABASE INSERTION ---
    try {
        // 1. Insert Foot Traffic Data
        const trafficSql = 'INSERT INTO foot_traffic_log (log_timestamp, daily_date, customer_count, source_system) VALUES ?';
        await query(trafficSql, [footTrafficEntries]);
        console.log(`[SUCCESS] Inserted ${footTrafficEntries.length} foot traffic entries.`);
        
        // 2. Insert Ride Usage Data
        const usageSql = 'INSERT INTO ride_usage_log (log_timestamp, log_date, ride_id, hourly_boardings) VALUES ?';
        await query(usageSql, [rideUsageEntries]);
        console.log(`[SUCCESS] Inserted ${rideUsageEntries.length} ride usage entries.`);

        console.log(`\nDAILY STATS: Total Visitors Simulated: ${totalDailyAttendance}`);

        // 3. Run Maintenance Check
        await runBreakdownCheck(date);

    } catch (error) {
        console.error("Simulation failed to insert data:", error.message);
    }
}

// --- EXECUTION (Simulate one day) ---
// In a real application, you would schedule this function to run every day.
runDailySimulation(getSimulatedDate());
