import { supabase } from "@/lib/supabase";
import type {
  AvailabilityMap,
  AvailabilityResponse,
  GymCandidate,
  Member,
  PracticeSlot,
  ResponseStatus,
  ScheduleState,
} from "@/lib/types";

const unassignedGym: GymCandidate = {
  id: "gym-unassigned",
  name: "体育館未定",
  address: "",
  fee: "",
  availabilityUrl: "",
  memo: "候補日を先に登録し、体育館はあとで決めます。",
};

type MemberRow = {
  id: string;
  name: string;
};

type GymRow = {
  id: string;
  name: string;
  address: string | null;
  fee: string | null;
  availability_url: string | null;
  memo: string | null;
};

type PracticeSlotRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  gym_id: string | null;
  note: string | null;
};

type AvailabilityResponseRow = {
  member_id: string;
  slot_id: string;
  status: ResponseStatus;
  time_slots: string[] | null;
};

export async function getInitialScheduleState(): Promise<ScheduleState> {
  const [members, gyms, slots, responses] = await Promise.all([
    getMembers(),
    getGyms(),
    getPracticeSlots(),
    getAvailabilityResponses(),
  ]);

  return {
    members,
    gyms: gyms.length > 0 ? gyms : [unassignedGym],
    slots,
    availability: responses,
  };
}

export async function saveSlotResponse(
  memberId: string,
  slot: PracticeSlot,
  response: AvailabilityResponse,
): Promise<void> {
  await upsertPracticeSlot(slot);

  const { error } = await supabase.from("availability_responses").upsert({
    member_id: memberId,
    slot_id: slot.id,
    status: response.status,
    time_slots: response.timeSlots,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function deleteSlotResponse(memberId: string, slotId: string): Promise<void> {
  const { error } = await supabase
    .from("availability_responses")
    .delete()
    .eq("member_id", memberId)
    .eq("slot_id", slotId);

  if (error) throw error;
}

async function getMembers(): Promise<Member[]> {
  const { data, error } = await supabase.from("members").select("id, name").order("created_at");
  if (error) throw error;

  return ((data ?? []) as MemberRow[]).map((row) => ({
    id: row.id,
    name: row.name,
  }));
}

async function getGyms(): Promise<GymCandidate[]> {
  const { data, error } = await supabase
    .from("gyms")
    .select("id, name, address, fee, availability_url, memo")
    .order("created_at");
  if (error) throw error;

  return ((data ?? []) as GymRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    address: row.address ?? "",
    fee: row.fee ?? "",
    availabilityUrl: row.availability_url ?? "",
    memo: row.memo ?? "",
  }));
}

async function getPracticeSlots(): Promise<PracticeSlot[]> {
  const { data, error } = await supabase
    .from("practice_slots")
    .select("id, starts_at, ends_at, gym_id, note")
    .order("starts_at");
  if (error) throw error;

  return ((data ?? []) as PracticeSlotRow[]).map((row) => ({
    id: row.id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    gymId: row.gym_id ?? unassignedGym.id,
    note: row.note ?? undefined,
  }));
}

async function getAvailabilityResponses(): Promise<AvailabilityMap> {
  const { data, error } = await supabase
    .from("availability_responses")
    .select("member_id, slot_id, status, time_slots");
  if (error) throw error;

  return ((data ?? []) as AvailabilityResponseRow[]).reduce<AvailabilityMap>((map, row) => {
    map[row.member_id] = {
      ...(map[row.member_id] ?? {}),
      [row.slot_id]: {
        status: row.status,
        timeSlots: row.time_slots ?? [],
      },
    };
    return map;
  }, {});
}

async function upsertPracticeSlot(slot: PracticeSlot): Promise<void> {
  const { error } = await supabase.from("practice_slots").upsert({
    id: slot.id,
    starts_at: slot.startsAt,
    ends_at: slot.endsAt,
    gym_id: slot.gymId === unassignedGym.id ? null : slot.gymId,
    note: slot.note ?? null,
  });

  if (error) throw error;
}
