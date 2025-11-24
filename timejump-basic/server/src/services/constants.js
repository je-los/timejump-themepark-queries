export const CANCELLATION_REASON_FALLBACK = [
  // Weather-specific reasons
  { code: 'light-rain', label: 'Light Rain', reason: 'Light Rain' },
  { code: 'heavy-rain', label: 'Heavy Rain', reason: 'Heavy Rain' },
  { code: 'snow', label: 'Snow', reason: 'Snow' },
  { code: 'hail', label: 'Hail', reason: 'Hail' },
  { code: 'lightning', label: 'Lightning', reason: 'Lightning' },
  { code: 'lightning-advisory', label: 'Lightning Advisory', reason: 'Lightning Advisory' },
  { code: 'thunderstorm', label: 'Thunderstorm', reason: 'Thunderstorm' },
  { code: 'tornado', label: 'Tornado', reason: 'Tornado' },
  { code: 'hurricane', label: 'Hurricane', reason: 'Hurricane' },
  // General buckets
  { code: 'weather', label: 'Weather (Other)', reason: 'Weather' },
  { code: 'maintenance', label: 'Maintenance', reason: 'Maintenance' },
  { code: 'operations', label: 'Operations', reason: 'Operations' },
];
