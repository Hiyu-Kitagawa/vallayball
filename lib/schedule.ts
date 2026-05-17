import type { AvailabilityMap, AvailabilityResponse, GymCandidate, PracticeSlot, ResponseStatus, ScheduleState, SlotSummary } from "@/lib/types";

export const defaultResponse: AvailabilityResponse = {
  status: "maybe",
  timeSlots: [],
};

export function getResponse(
  availability: AvailabilityMap,
  memberId: string,
  slotId: string,
): AvailabilityResponse {
  return availability[memberId]?.[slotId] ?? defaultResponse;
}

function getStatus(availability: AvailabilityMap, memberId: string, slotId: string): ResponseStatus {
  return getResponse(availability, memberId, slotId).status;
}

export function getSlotSummaries(state: ScheduleState): SlotSummary[] {
  return state.slots
    .map((slot) => {
      const gym =
        state.gyms.find((candidate) => candidate.id === slot.gymId) ??
        state.gyms.find((candidate) => candidate.id === "gym-unassigned") ??
        {
          id: "gym-unassigned",
          name: "体育館未定",
          address: "",
          fee: "",
          availabilityUrl: "",
          memo: "",
        };

      const availableNames: string[] = [];
      const maybeNames: string[] = [];
      const unavailableNames: string[] = [];
      const timeSlotsByMember: Record<string, string[]> = {};
      const availableTimeCounts = new Map<string, number>();

      state.members.forEach((member) => {
        const response = getResponse(state.availability, member.id, slot.id);
        const status = getStatus(state.availability, member.id, slot.id);
        if (status === "available") {
          availableNames.push(member.name);
          response.timeSlots.forEach((timeSlot) => {
            availableTimeCounts.set(timeSlot, (availableTimeCounts.get(timeSlot) ?? 0) + 1);
          });
        }
        if (status === "maybe") maybeNames.push(member.name);
        if (status === "unavailable") unavailableNames.push(member.name);
        if (status === "available" && response.timeSlots.length > 0) timeSlotsByMember[member.name] = response.timeSlots;
      });
      const bestAvailableTimeCount =
        availableTimeCounts.size > 0 ? Math.max(...Array.from(availableTimeCounts.values())) : 0;
      const bestAvailableTimeSlots = Array.from(availableTimeCounts.entries())
        .filter(([, count]) => count === bestAvailableTimeCount)
        .map(([timeSlot]) => timeSlot)
        .sort();

      return {
        slot,
        gym,
        availableCount: availableNames.length,
        maybeCount: maybeNames.length,
        unavailableCount: unavailableNames.length,
        availableNames,
        maybeNames,
        unavailableNames,
        bestAvailableTimeCount,
        bestAvailableTimeSlots,
        timeSlotsByMember,
      };
    })
    .sort((a, b) => {
      if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount;
      if (b.maybeCount !== a.maybeCount) return b.maybeCount - a.maybeCount;
      return new Date(a.slot.startsAt).getTime() - new Date(b.slot.startsAt).getTime();
    });
}

export function getBestSlot(state: ScheduleState): SlotSummary {
  return getSlotSummaries(state)[0];
}

export function createSlotForDate(year: number, month: number, day: number, gyms: GymCandidate[]): PracticeSlot {
  const monthText = String(month).padStart(2, "0");
  const dayText = String(day).padStart(2, "0");
  const gym = gyms[(day - 1) % gyms.length] ?? { id: "gym-unassigned" };

  return {
    id: `s-${year}-${monthText}-${dayText}`,
    startsAt: `${year}-${monthText}-${dayText}T18:00:00+09:00`,
    endsAt: `${year}-${monthText}-${dayText}T20:00:00+09:00`,
    gymId: gym.id,
  };
}

export function hasAnyResponse(availability: AvailabilityMap, slotId: string): boolean {
  return Object.values(availability).some((responses) => responses[slotId] !== undefined);
}
