// Serverless runtimes inject env vars from the platform dashboard, so no .env
// loading is needed here. This module exists only to document that and to give
// the functions a shared, side-effect-free import point if needed later.
export const runtime = 'nodejs'
