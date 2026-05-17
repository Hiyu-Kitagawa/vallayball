export type ResponseStatus = "available" | "maybe" | "unavailable";

export type AvailabilityResponse = {
  status: ResponseStatus;
  timeSlots: string[];
};

export type Member = {
  id: string;
  name: string;
};

export type GymCandidate = {
  id: string;
  name: string;
  address: string;
  fee: string;
  availabilityUrl: string;
  memo: string;
};

export type PracticeSlot = {
  id: string;
  startsAt: string;
  endsAt: string;
  gymId: string;
  note?: string;
};

export type AvailabilityMap = Record<string, Record<string, AvailabilityResponse>>;

export type ScheduleState = {
  members: Member[];
  gyms: GymCandidate[];
  slots: PracticeSlot[];
  availability: AvailabilityMap;
};

export type SlotSummary = {
  slot: PracticeSlot;
  gym: GymCandidate;
  availableCount: number;
  maybeCount: number;
  unavailableCount: number;
  availableNames: string[];
  maybeNames: string[];
  unavailableNames: string[];
  bestAvailableTimeCount: number;
  bestAvailableTimeSlots: string[];
  timeSlotsByMember: Record<string, string[]>;
};
