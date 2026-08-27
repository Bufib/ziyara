import { createPersistentState } from '@/features/storage/persistentState';
import {
  parseTripGuidanceOutbox,
  type PendingTripGuidanceStatus,
} from '@/features/trip-guidance/trip-guidance-state';

export const useTripGuidanceOutbox = createPersistentState<PendingTripGuidanceStatus[]>(
  'ziyara.trip-guidance.outbox',
  [],
  parseTripGuidanceOutbox,
);
