"use client";

import { useState } from "react";
import availabilityData from "@/public/data/nagaoka-availability.json";
import { formatAvailabilityRanges, formatSlotDate, formatTimeRanges } from "@/lib/format";
import { getSlotSummaries } from "@/lib/schedule";
import type { SlotSummary } from "@/lib/types";
import { useScheduleStore } from "@/lib/useScheduleStore";

type AvailabilityStatus = "1日空き" | "一部空き" | "空きなし" | "休館日" | "不明";

type AvailabilityDay = {
  date: string;
  status: AvailabilityStatus;
  sourceUrl: string;
  timeSlots?: string[];
};

type AvailabilityCourt = {
  name: string;
  availability: AvailabilityDay[];
};

type AvailabilityFacility = {
  name: string;
  courts: AvailabilityCourt[];
};

type AvailabilitySnapshot = {
  checkedAt: string;
  status: "ok" | "partial" | "failed";
  message: string;
  finalUrl?: string;
  fallbackUrl: string;
  weeksChecked?: number;
  facilities: AvailabilityFacility[];
};

type MatchedGymAvailability = {
  facilityName: string;
  courtName: string;
  status: AvailabilityStatus;
  sourceUrl: string;
  timeSlots?: string[];
};

const snapshot = availabilityData as AvailabilitySnapshot;
const officialFacilityUrl = "https://www.city.nagaoka.niigata.jp/shisei/cate08/jyouhouka/e_shisetu.html";

export default function GymsPage() {
  const { state } = useScheduleStore();
  const topSummaries = getSlotSummaries(state)
    .filter((summary) => summary.availableCount > 0)
    .filter((summary) => new Date(summary.slot.startsAt).getTime() > Date.now())
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-white/80 bg-white p-4 shadow-soft">
        <p className="text-xs font-bold text-court-green">体育館の空き確認</p>
        <h1 className="mt-1 text-xl font-black leading-tight text-court-navy">集まりやすい候補トップ5</h1>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          集計で参加可能人数が多い日程から順に、長岡市施設予約サイトで取得した体育館の空き状況を表示します。
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] font-semibold text-slate-500">最終確認: {formatCheckedAt(snapshot.checkedAt)}</p>
          <a
            href={officialFacilityUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex justify-center rounded-md bg-court-green px-3 py-2 text-xs font-black text-white"
          >
            公式サイトで確認
          </a>
        </div>
      </section>

      <section className="space-y-3">
        {topSummaries.length > 0 ? (
          topSummaries.map((summary, index) => (
            <TopCandidateCard key={summary.slot.id} rank={index + 1} summary={summary} />
          ))
        ) : (
          <div className="rounded-lg border border-white/80 bg-white p-5 text-sm font-semibold text-slate-600 shadow-soft">
            まだ予定が入力されていません。カレンダーで候補日を選んでから確認してください。
          </div>
        )}
      </section>
    </div>
  );
}

function TopCandidateCard({ rank, summary }: { rank: number; summary: SlotSummary }) {
  const date = summary.slot.startsAt.slice(0, 10);
  const matchedAvailability = sortAvailabilityForSummary(findAvailabilityByDate(date), summary);
  const bestTime = getBestOverlappingTime(summary);
  const [expandedAvailabilityKey, setExpandedAvailabilityKey] = useState<string | null>(null);
  const [showAllAvailability, setShowAllAvailability] = useState(false);
  const visibleAvailability = showAllAvailability ? matchedAvailability : matchedAvailability.slice(0, 5);

  return (
    <article className="rounded-lg border border-white/80 bg-white p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black text-court-green">第{rank}候補</p>
          <h2 className="mt-1 text-lg font-black text-court-navy">{formatSlotDate(summary.slot.startsAt)}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {summary.availableCount}人参加可能 / 未定 {summary.maybeCount}人
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-court-sky px-3 py-1 text-xs font-black text-court-green">
          {bestTime.label}
        </span>
      </div>

      <div className="mt-4 rounded-md bg-slate-50 p-3">
        <p className="text-xs font-black text-slate-500">一番集まりやすい時間帯</p>
        <p className="mt-1 text-sm font-bold text-court-navy">{bestTime.detail}</p>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-black text-slate-700">この日に使える体育館</p>
          <span className="text-xs font-bold text-slate-500">{matchedAvailability.length}件</span>
        </div>

        {matchedAvailability.length > 0 ? (
          <div className="mt-3 space-y-2">
            {visibleAvailability.map((item) => {
              const itemKey = `${item.facilityName}-${item.courtName}-${item.sourceUrl}`;
              const expanded = expandedAvailabilityKey === itemKey;

              return (
                <div key={itemKey} className="rounded-md border border-slate-100 bg-slate-50 transition hover:border-court-green hover:bg-white">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setExpandedAvailabilityKey(expanded ? null : itemKey)}
                    className="w-full px-3 py-3 text-left"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-sm font-black leading-5 text-court-navy">{item.facilityName}</span>
                        <span className="mt-1 block text-xs font-semibold leading-4 text-slate-500">{item.courtName}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <StatusBadge status={item.status} />
                        <span className="text-xs font-black text-slate-400">{expanded ? "閉じる" : "詳細"}</span>
                      </span>
                    </span>
                  </button>
                  {expanded ? (
                    <div className="border-t border-slate-100 px-3 pb-3 pt-2">
                      <p className="text-xs font-black text-slate-500">空いている時間</p>
                      <p className="mt-1 text-sm font-bold text-court-navy">{availableTimeText(item)}</p>
                      <a
                        href={officialFacilityUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex rounded-md bg-white px-3 py-2 text-xs font-black text-court-green ring-1 ring-court-sky"
                      >
                        公式サイトで時間帯を見る
                      </a>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {matchedAvailability.length > 5 ? (
              <button
                type="button"
                onClick={() => {
                  setShowAllAvailability((current) => !current);
                  setExpandedAvailabilityKey(null);
                }}
                className="w-full rounded-md border border-court-sky bg-white px-3 py-3 text-sm font-black text-court-green"
              >
                {showAllAvailability ? "閉じる" : `さらに${matchedAvailability.length - 5}件表示`}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-semibold leading-6 text-slate-600">
            この日付の空き状況は、まだ取得データにありません。更新コマンドを実行するか、公式サイトで確認してください。
          </div>
        )}
      </div>
    </article>
  );
}

function availableTimeText(item: MatchedGymAvailability) {
  const timeText = formatAvailabilityRanges(item.timeSlots ?? []);
  if (timeText) return timeText;
  if (item.status === "1日空き") return "終日空きあり";
  if (item.status === "一部空き") return "空き時間を取得できませんでした";
  if (item.status === "不明") return "空き時間を取得できませんでした";
  return item.status;
}

function findAvailabilityByDate(date: string): MatchedGymAvailability[] {
  return snapshot.facilities.flatMap((facility) =>
    facility.courts.flatMap((court) =>
      court.availability
        .filter((day) => day.date === date && day.status !== "空きなし" && day.status !== "休館日")
        .map((day) => ({
          facilityName: facility.name,
          courtName: court.name,
          status: day.status,
          sourceUrl: day.sourceUrl,
          timeSlots: day.timeSlots,
        })),
    ),
  );
}

function sortAvailabilityForSummary(items: MatchedGymAvailability[], summary: SlotSummary) {
  return [...items].sort((a, b) => {
    const aAllDay = a.status === "1日空き";
    const bAllDay = b.status === "1日空き";
    if (aAllDay !== bAllDay) return aAllDay ? -1 : 1;

    const aOverlaps = overlapsBestTime(a, summary);
    const bOverlaps = overlapsBestTime(b, summary);
    if (aOverlaps !== bOverlaps) return aOverlaps ? -1 : 1;

    const durationDiff = availableMinutes(b) - availableMinutes(a);
    if (durationDiff !== 0) return durationDiff;

    return `${a.facilityName}${a.courtName}`.localeCompare(`${b.facilityName}${b.courtName}`, "ja");
  });
}

function overlapsBestTime(item: MatchedGymAvailability, summary: SlotSummary) {
  if (item.status === "1日空き") return true;
  const ranges = (item.timeSlots ?? []).map(parseAvailabilityRange).filter((range): range is TimeRange => Boolean(range));
  if (ranges.length === 0 || summary.bestAvailableTimeSlots.length === 0) return false;

  return summary.bestAvailableTimeSlots.some((timeSlot) => {
    const target = parseHourSlot(timeSlot);
    return target ? ranges.some((range) => rangesOverlap(range, target)) : false;
  });
}

function availableMinutes(item: MatchedGymAvailability) {
  if (item.status === "1日空き" && (!item.timeSlots || item.timeSlots.length === 0)) return Number.MAX_SAFE_INTEGER;

  return (item.timeSlots ?? []).reduce((total, timeSlot) => {
    const range = parseAvailabilityRange(timeSlot);
    return range ? total + range.end - range.start : total;
  }, 0);
}

type TimeRange = {
  start: number;
  end: number;
};

function parseAvailabilityRange(value: string): TimeRange | undefined {
  const match = value.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;

  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = Number(match[3]) * 60 + Number(match[4]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return undefined;
  return { start, end };
}

function parseHourSlot(value: string): TimeRange | undefined {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return undefined;

  const start = Number(match[1]) * 60 + Number(match[2]);
  if (!Number.isFinite(start)) return undefined;
  return { start, end: start + 60 };
}

function rangesOverlap(a: TimeRange, b: TimeRange) {
  return a.start < b.end && b.start < a.end;
}

function getBestOverlappingTime(summary: SlotSummary) {
  if (summary.bestAvailableTimeSlots.length === 0) {
    return {
      label: "時間未入力",
      detail: "参加可能な時間帯がまだ入力されていません。",
    };
  }

  return {
    label: `${summary.bestAvailableTimeCount}人`,
    detail: `${formatTimeRanges(summary.bestAvailableTimeSlots)} に ${summary.bestAvailableTimeCount}人が参加可能`,
  };
}

function StatusBadge({ status }: { status: AvailabilityStatus }) {
  const className =
    status === "1日空き"
      ? "bg-emerald-100 text-emerald-700"
      : status === "一部空き"
        ? "bg-court-sky text-court-green"
        : "bg-slate-200 text-slate-600";

  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${className}`}>{status}</span>;
}

function formatCheckedAt(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}
