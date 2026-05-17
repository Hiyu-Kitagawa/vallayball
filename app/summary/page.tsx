"use client";

import { useScheduleStore } from "@/lib/useScheduleStore";
import { getSlotSummaries } from "@/lib/schedule";
import { formatSlotDate, formatTimeRanges } from "@/lib/format";

export default function SummaryPage() {
  const { state } = useScheduleStore();
  const summaries = getSlotSummaries(state).filter((summary) => summary.availableCount > 0);

  return (
    <div className="space-y-3">
      <section className="rounded-lg border border-white/80 bg-white p-4 shadow-soft">
        <p className="text-sm font-bold text-court-green">集計</p>
        <h1 className="mt-2 text-2xl font-black text-court-navy">参加可能人数が多い順</h1>
      </section>

      <section className="space-y-2.5">
        {summaries.map((summary) => (
          <article key={summary.slot.id} className="rounded-lg border border-white/80 bg-white p-3 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-court-navy">{formatSlotDate(summary.slot.startsAt)}</h2>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  最も参加人数の多い時間帯：{formatTimeRanges(summary.bestAvailableTimeSlots) || "-"}
                </p>
              </div>
              <span className="rounded-full bg-court-sky px-3 py-1 text-sm font-black text-court-green">
                {summary.availableCount}人OK
              </span>
            </div>

            <div className="mt-3 grid gap-2 text-sm">
              <NameList label="参加可能" names={summary.availableNames} accent />
              <NameList label="未定" names={summary.maybeNames} />
              <NameList label="不可" names={summary.unavailableNames} />
            </div>

            {Object.keys(summary.timeSlotsByMember).length > 0 ? (
              <div className="mt-3 rounded-md bg-slate-50 p-2.5">
                <p className="text-xs font-bold text-slate-500">可能な時間帯</p>
                <div className="mt-1.5 space-y-0.5 text-sm text-slate-700">
                  {Object.entries(summary.timeSlotsByMember).map(([name, timeSlots]) => (
                    <p key={name}>
                      <span className="font-bold">{name}</span>: {formatTimeRanges(timeSlots)}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}

function NameList({ label, names, accent = false }: { label: string; names: string[]; accent?: boolean }) {
  return (
    <div className="rounded-md bg-slate-50 p-2.5">
      <p className={`text-xs font-black ${accent ? "text-court-green" : "text-slate-500"}`}>{label}</p>
      <p className="mt-1 text-slate-700">{names.length > 0 ? names.join("、") : "-"}</p>
    </div>
  );
}
