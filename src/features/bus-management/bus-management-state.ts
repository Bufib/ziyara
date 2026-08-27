import type {
  BusBoardingResponse,
  BusBoardingStatus,
  TripBus,
  TripParticipant,
} from '@/domain/database';

export type BusParticipantState = TripParticipant & {
  bus_name: string | null;
  status: BusBoardingStatus | null;
};

export type BusBoardingSummary = {
  boarded: number;
  notConfirmed: number;
  onWay: number;
  problem: number;
  total: number;
};

export type BusStatusSubmitFailureKind =
  | 'auth'
  | 'closed'
  | 'not_linked'
  | 'offline'
  | 'server';

export function shouldRetryBusStatusAfterSessionRefresh(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error && typeof error.code === 'string' ? error.code : '';
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : '';

  return (
    code === 'PGRST301' ||
    code === 'PGRST302' ||
    /permission denied for function (respond_to_bus_boarding|admin_set_bus_boarding_status)/i.test(
      message,
    )
  );
}

export function getBusStatusSubmitFailureKind(error: unknown): BusStatusSubmitFailureKind {
  if (!error || typeof error !== 'object') return 'server';
  const message =
    'message' in error && typeof error.message === 'string' ? error.message : '';

  if (
    shouldRetryBusStatusAfterSessionRefresh(error) ||
    /admin access required|authentication required|user profile is required/i.test(message)
  ) {
    return 'auth';
  }

  if (/active boarding not found/i.test(message)) return 'closed';
  if (/participant is not linked to the current user/i.test(message)) return 'not_linked';
  if (/failed to fetch|fetch failed|load failed|network/i.test(message)) return 'offline';
  return 'server';
}

export function buildBusParticipantStates(
  participants: TripParticipant[],
  buses: TripBus[],
  responses: BusBoardingResponse[],
): BusParticipantState[] {
  const busNames = new Map(buses.map((bus) => [bus.id, bus.name]));
  const busSortOrders = new Map(buses.map((bus) => [bus.id, bus.sort_order]));
  const responseStatuses = new Map(
    responses.map((response) => [response.participant_id, response.status]),
  );

  return [...participants]
    .sort((left, right) => {
      const leftBus =
        left.bus_id === null
          ? Number.MAX_SAFE_INTEGER
          : (busSortOrders.get(left.bus_id) ?? Number.MAX_SAFE_INTEGER - 1);
      const rightBus =
        right.bus_id === null
          ? Number.MAX_SAFE_INTEGER
          : (busSortOrders.get(right.bus_id) ?? Number.MAX_SAFE_INTEGER - 1);
      return leftBus - rightBus || left.participant_code.localeCompare(right.participant_code);
    })
    .map((participant) => ({
      ...participant,
      bus_name: participant.bus_id === null ? null : (busNames.get(participant.bus_id) ?? null),
      status: responseStatuses.get(participant.id) ?? null,
    }));
}

export function summarizeBusBoarding(
  participants: Pick<BusParticipantState, 'status'>[],
): BusBoardingSummary {
  return participants.reduce<BusBoardingSummary>(
    (summary, participant) => {
      summary.total += 1;

      if (participant.status === 'boarded') {
        summary.boarded += 1;
      } else if (participant.status === 'on_way') {
        summary.onWay += 1;
      } else if (participant.status === 'problem') {
        summary.problem += 1;
      } else {
        summary.notConfirmed += 1;
      }

      return summary;
    },
    { boarded: 0, notConfirmed: 0, onWay: 0, problem: 0, total: 0 },
  );
}
