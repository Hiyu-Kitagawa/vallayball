"use client";

import { useMemo, useState } from "react";
import { StatusControl } from "@/components/StatusControl";
import { timeOptions } from "@/lib/constants";
import { formatSlotDate, formatTimeRanges } from "@/lib/format";
import { createSlotForDate, getResponse, getSlotSummaries, hasAnyResponse } from "@/lib/schedule";
import { useScheduleStore } from "@/lib/useScheduleStore";
import type { PracticeSlot, ResponseStatus } from "@/lib/types";

const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

export default function HomePage() {
  const {
    clearSelectedMember,
    deleteSlotResponse,
    hydrated,
    saveSlotResponse,
    selectedMember,
    selectedMemberId,
    setSelectedMemberId,
    state,
  } = useScheduleStore();
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(5);
  const [selectedDay, setSelectedDay] = useState(1);
  const [detailMode, setDetailMode] = useState<"edit" | "review">("edit");
  const [savedMessage, setSavedMessage] = useState("");

  const candidateSlotByDate = useMemo(() => {
    return new Map(state.slots.map((slot) => [toDateKeyFromIso(slot.startsAt), slot]));
  }, [state.slots]);
  const selectedDateKey = toDateKey(selectedYear, selectedMonth, selectedDay);
  const selectedSlot =
    candidateSlotByDate.get(selectedDateKey) ??
    createSlotForDate(selectedYear, selectedMonth, selectedDay, state.gyms);
  const ownResponse = selectedMember ? state.availability[selectedMember.id]?.[selectedSlot.id] : undefined;
  const hasOwnResponse = Boolean(ownResponse);
  const response = selectedMember
    ? ownResponse ?? { status: "available" as ResponseStatus, timeSlots: [] }
    : { status: "available" as ResponseStatus, timeSlots: [] };
  const summaries = getSlotSummaries(state);
  const currentSummary = summaries.find((summary) => summary.slot.id === selectedSlot.id);
  const hasDateResponse = hasAnyResponse(state.availability, selectedSlot.id);
  const years = [2025, 2026, 2027, 2028];

  function handleStatusChange(status: ResponseStatus) {
    if (!selectedMember) return;
    saveSlotResponse(selectedMember.id, selectedSlot, {
      status,
      timeSlots: status === "available" ? response.timeSlots : [],
    });
    setSavedMessage("");
  }

  function toggleTimeSlot(timeSlot: string) {
    if (!selectedMember || response.status !== "available") return;
    const exists = response.timeSlots.includes(timeSlot);
    saveSlotResponse(selectedMember.id, selectedSlot, {
      status: response.status,
      timeSlots: exists
        ? sortTimeSlots(response.timeSlots.filter((value) => value !== timeSlot))
        : sortTimeSlots([...response.timeSlots, timeSlot]),
    });
    setSavedMessage("");
  }

  function handleSave() {
    setSavedMessage("保存しました");
    setDetailMode("review");
    window.setTimeout(() => setSavedMessage(""), 1800);
  }

  function handleDelete() {
    if (!selectedMember) return;
    deleteSlotResponse(selectedMember.id, selectedSlot.id);
    setDetailMode("edit");
    setSavedMessage("削除しました");
    window.setTimeout(() => setSavedMessage(""), 1800);
  }

  function selectDay(day: number) {
    const dateKey = toDateKey(selectedYear, selectedMonth, day);
    const slot = candidateSlotByDate.get(dateKey) ?? createSlotForDate(selectedYear, selectedMonth, day, state.gyms);
    const dateHasResponse = hasAnyResponse(state.availability, slot.id);

    setSelectedDay(day);
    setDetailMode(dateHasResponse ? "review" : "edit");
    setSavedMessage("");
  }

  if (!hydrated) {
    return <div className="rounded-lg bg-white p-6 text-sm font-semibold text-slate-500 shadow-soft">読み込み中...</div>;
  }

  if (!selectedMemberId || !selectedMember) {
    return (
      <section className="flex min-h-[70vh] flex-col justify-center">
        <div className="rounded-lg border border-white/80 bg-white p-5 shadow-soft">
          <p className="text-sm font-bold text-court-green">バレー練習の予定調整</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-court-navy">あなたはだれですか</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">自分の名前を選ぶと、練習日のカレンダーが開きます。</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {state.members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => setSelectedMemberId(member.id)}
                className="min-h-16 rounded-lg border border-court-sky bg-court-sky/50 px-3 py-4 text-lg font-black text-court-navy transition active:scale-[0.98]"
              >
                {member.name}
              </button>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-white/80 bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-court-green">こんにちは</p>
            <h1 className="mt-1 text-2xl font-black text-court-navy">{selectedMember.name}さんの予定</h1>
          </div>
          <button
            type="button"
            onClick={clearSelectedMember}
            className="rounded-md bg-slate-100 px-3 py-2 text-xs font-bold text-slate-600"
          >
            名前変更
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-white/80 bg-white p-4 shadow-soft">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold text-court-green">カレンダー</p>
            <h2 className="text-xl font-black text-court-navy">
              {selectedYear}年{selectedMonth}月
            </h2>
          </div>
          <p className="text-xs font-semibold text-slate-500">日にちをタップ</p>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs font-bold text-slate-500">
            年
            <select
              value={selectedYear}
              onChange={(event) => {
                setSelectedYear(Number(event.target.value));
                setSelectedDay(1);
                setDetailMode("edit");
                setSavedMessage("");
              }}
              className="min-h-11 rounded-md border border-slate-200 bg-slate-50 px-3 text-base font-black text-court-navy outline-none focus:border-court-green"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}年
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-bold text-slate-500">
            月
            <select
              value={selectedMonth}
              onChange={(event) => {
                setSelectedMonth(Number(event.target.value));
                setSelectedDay(1);
                setDetailMode("edit");
                setSavedMessage("");
              }}
              className="min-h-11 rounded-md border border-slate-200 bg-slate-50 px-3 text-base font-black text-court-navy outline-none focus:border-court-green"
            >
              {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                <option key={month} value={month}>
                  {month}月
                </option>
              ))}
            </select>
          </label>
        </div>
        <CalendarGrid
          candidateSlotByDate={candidateSlotByDate}
          hasResponseForSlot={(slotId) => hasAnyResponse(state.availability, slotId)}
          month={selectedMonth}
          selectedDay={selectedDay}
          year={selectedYear}
          onSelect={selectDay}
        />
      </section>

      <section className="rounded-lg border border-white/80 bg-white p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-court-green">選択中の日にち</p>
            <h2 className="mt-1 text-xl font-black text-court-navy">{formatSlotDate(selectedSlot.startsAt)}</h2>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              最も参加人数の多い時間帯：{formatTimeRanges(currentSummary?.bestAvailableTimeSlots ?? []) || "-"}
            </p>
          </div>
          <span className="rounded-full bg-court-sky px-3 py-1 text-sm font-black text-court-green">
            {currentSummary?.availableCount ?? 0}人OK
          </span>
        </div>

        {hasDateResponse && detailMode === "review" ? (
          <div className="mt-5 rounded-lg bg-slate-50 p-4">
            <p className="text-xs font-black text-court-green">登録済みの予定</p>
            <div className="mt-3 grid gap-3 text-sm">
              <ScheduleNames label="参加可能" names={currentSummary?.availableNames ?? []} />
              <ScheduleNames label="未定" names={currentSummary?.maybeNames ?? []} />
              <ScheduleNames label="不可" names={currentSummary?.unavailableNames ?? []} />
              {currentSummary && Object.keys(currentSummary.timeSlotsByMember).length > 0 ? (
                <div>
                  <p className="font-bold text-slate-500">可能な時間帯</p>
                  <div className="mt-1 space-y-1 text-court-navy">
                    {Object.entries(currentSummary.timeSlotsByMember).map(([name, timeSlots]) => (
                      <p key={name}>
                        <span className="font-black">{name}</span>: {formatTimeRanges(timeSlots)}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className={`mt-5 grid gap-2 ${hasOwnResponse ? "grid-cols-2" : "grid-cols-1"}`}>
              <button
                type="button"
                onClick={() => {
                  setDetailMode("edit");
                  setSavedMessage("");
                }}
                className="rounded-lg bg-court-green px-4 py-4 text-base font-black text-white active:scale-[0.99]"
              >
                {hasOwnResponse ? "予定を変更" : "自分の予定を追加"}
              </button>
              {hasOwnResponse ? (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-lg bg-slate-700 px-4 py-4 text-base font-black text-white active:scale-[0.99]"
                >
                  削除する
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5">
              <p className="mb-2 text-sm font-bold text-slate-700">参加できますか</p>
              <StatusControl value={response.status} onChange={handleStatusChange} />
            </div>

            <div className="mt-5">
              <p className="mb-2 text-sm font-bold text-slate-700">可能な時間帯</p>
              <div className="grid grid-cols-2 gap-2">
                {timeOptions.map((timeSlot) => {
                  const active = response.timeSlots.includes(timeSlot);
                  const disabled = response.status !== "available";
                  return (
                    <button
                      key={timeSlot}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleTimeSlot(timeSlot)}
                      className={`rounded-md border px-3 py-3 text-sm font-black transition ${
                        active
                          ? "border-court-green bg-court-green text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      } ${disabled ? "opacity-40" : "active:scale-[0.98]"}`}
                    >
                      {timeSlot}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="mt-5 w-full rounded-lg bg-court-green px-4 py-4 text-base font-black text-white shadow-sm active:scale-[0.99]"
            >
              保存
            </button>
          </>
        )}
        <p className="mt-3 min-h-5 text-center text-sm font-bold text-court-green">{savedMessage}</p>
      </section>
    </div>
  );
}

function CalendarGrid({
  candidateSlotByDate,
  hasResponseForSlot,
  month,
  selectedDay,
  year,
  onSelect,
}: {
  candidateSlotByDate: Map<string, PracticeSlot>;
  hasResponseForSlot: (slotId: string) => boolean;
  month: number;
  selectedDay: number;
  year: number;
  onSelect: (day: number) => void;
}) {
  const days = buildCalendarDays(year, month - 1);

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400">
        {weekDays.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className="aspect-square rounded-md bg-slate-50" />;
          }
          const dateKey = toDateKey(year, month, day.getDate());
          const slot = candidateSlotByDate.get(dateKey);
          const slotId = slot?.id ?? createSlotId(year, month, day.getDate());
          const active = day.getDate() === selectedDay;
          const hasDot = hasResponseForSlot(slotId);
          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelect(day.getDate())}
              className={`aspect-square rounded-md text-sm font-black transition ${
                active
                  ? "bg-court-green text-white"
                  : "bg-court-sky text-court-navy active:scale-95"
              }`}
            >
              {day.getDate()}
              {hasDot ? <span className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-current" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleNames({ label, names }: { label: string; names: string[] }) {
  return (
    <div>
      <p className="font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-base font-black text-court-navy">{names.length > 0 ? names.join("、") : "-"}</p>
    </div>
  );
}

function buildCalendarDays(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDate = new Date(year, monthIndex + 1, 0).getDate();
  const leadingEmpty = firstDay.getDay();
  const days: Array<Date | null> = Array.from({ length: leadingEmpty }, () => null);

  for (let day = 1; day <= lastDate; day += 1) {
    days.push(new Date(year, monthIndex, day));
  }

  return days;
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toDateKeyFromIso(value: string) {
  return value.slice(0, 10);
}

function createSlotId(year: number, month: number, day: number) {
  return `s-${toDateKey(year, month, day)}`;
}

function sortTimeSlots(timeSlots: string[]) {
  return timeSlots.sort((a, b) => Number(a.split(":")[0]) - Number(b.split(":")[0]));
}
