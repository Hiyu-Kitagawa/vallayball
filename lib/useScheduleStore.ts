"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  deleteSlotResponse as deleteSlotResponseFromRepository,
  getInitialScheduleState,
  saveSlotResponse as saveSlotResponseToRepository,
} from "@/lib/repository";
import type { AvailabilityResponse, PracticeSlot, ScheduleState } from "@/lib/types";

const MEMBER_KEY = "volley-practice-scheduler:selected-member";

const emptyScheduleState: ScheduleState = {
  members: [],
  gyms: [],
  slots: [],
  availability: {},
};

export function useScheduleStore() {
  const [state, setState] = useState<ScheduleState>(emptyScheduleState);
  const [selectedMemberId, setSelectedMemberIdState] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      try {
        const initialState = await getInitialScheduleState();
        const storedMemberId = window.localStorage.getItem(MEMBER_KEY) ?? "";

        if (cancelled) return;
        setState(initialState);
        setSelectedMemberIdState(storedMemberId);
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setErrorMessage("Supabaseからデータを読み込めませんでした。");
        }
      } finally {
        if (!cancelled) setHydrated(true);
      }
    }

    loadState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (selectedMemberId) {
      window.localStorage.setItem(MEMBER_KEY, selectedMemberId);
    } else {
      window.localStorage.removeItem(MEMBER_KEY);
    }
  }, [hydrated, selectedMemberId]);

  const selectedMember = useMemo(
    () => state.members.find((member) => member.id === selectedMemberId),
    [selectedMemberId, state.members],
  );

  const setSelectedMemberId = useCallback((memberId: string) => {
    setSelectedMemberIdState(memberId);
  }, []);

  const clearSelectedMember = useCallback(() => {
    setSelectedMemberIdState("");
  }, []);

  const saveSlotResponse = useCallback(
    (memberId: string, slot: PracticeSlot, response: AvailabilityResponse) => {
      setErrorMessage("");
      setState((current) => applySlotResponse(current, memberId, slot, response));

      saveSlotResponseToRepository(memberId, slot, response).catch((error) => {
        console.error(error);
        setErrorMessage("Supabaseへの保存に失敗しました。もう一度試してください。");
      });
    },
    [],
  );

  const saveMemberAvailability = useCallback(
    (memberId: string, responses: Record<string, AvailabilityResponse>) => {
      setErrorMessage("");
      Object.entries(responses).forEach(([slotId, response]) => {
        const slot = state.slots.find((currentSlot) => currentSlot.id === slotId);
        if (slot) saveSlotResponse(memberId, slot, response);
      });
    },
    [saveSlotResponse, state.slots],
  );

  const deleteSlotResponse = useCallback((memberId: string, slotId: string) => {
    setErrorMessage("");
    setState((current) => removeSlotResponse(current, memberId, slotId));

    deleteSlotResponseFromRepository(memberId, slotId).catch((error) => {
      console.error(error);
      setErrorMessage("Supabaseから削除できませんでした。もう一度試してください。");
    });
  }, []);

  return {
    clearSelectedMember,
    deleteSlotResponse,
    errorMessage,
    hydrated,
    saveMemberAvailability,
    saveSlotResponse,
    selectedMember,
    selectedMemberId,
    setSelectedMemberId,
    state,
  };
}

function applySlotResponse(
  current: ScheduleState,
  memberId: string,
  slot: PracticeSlot,
  response: AvailabilityResponse,
): ScheduleState {
  return {
    ...current,
    slots: current.slots.some((currentSlot) => currentSlot.id === slot.id)
      ? current.slots
      : [...current.slots, slot],
    availability: {
      ...current.availability,
      [memberId]: {
        ...(current.availability[memberId] ?? {}),
        [slot.id]: response,
      },
    },
  };
}

function removeSlotResponse(current: ScheduleState, memberId: string, slotId: string): ScheduleState {
  const memberResponses = { ...(current.availability[memberId] ?? {}) };
  delete memberResponses[slotId];

  return {
    ...current,
    availability: {
      ...current.availability,
      [memberId]: memberResponses,
    },
  };
}
