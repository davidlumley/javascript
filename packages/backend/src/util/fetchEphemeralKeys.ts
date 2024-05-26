import type { EphemeralKeys } from '@clerk/types';

import runtime from '../runtime';

export function fetchEphemeralKeys(): Promise<EphemeralKeys> {
  return runtime.fetchEphemeralKeys();
}
