/**
 * Account subtypes that should never be stored or displayed.
 * Applied during seed, sync, and all queries.
 */
export const EXCLUDED_SUBTYPES = new Set(['ira', '401k', 'hsa', 'cash management'])
