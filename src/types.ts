// Import node-fetch types directly
// This avoids conflicts with DOM types
import type { Response as NodeFetchResponse } from 'node-fetch';

// Export the Response type for use elsewhere
export type { NodeFetchResponse as Response };
