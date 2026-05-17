import { formatSlotDate, formatTimeRanges } from "@/lib/format";
import type { SlotSummary } from "@/lib/types";

export function CandidateList({
  summaries,
  title,
}: {
  summaries: SlotSummary[];
  title: string;
}) {
  return (
    <section className="rounded-lg border border-white/80 bg-white shadow-soft">
      <div className="border-b border-slate-100 px-4 py-4">
        <h2 className="text-lg font-black text-court-navy">{title}</h2>
      </div>
      <div className="grid divide-y divide-slate-100">
        {summaries.map((summary) => (
          <article key={summary.slot.id} className="grid gap-4 p-4">
            <div>
              <p className="font-black text-court-navy">{formatSlotDate(summary.slot.startsAt)}</p>
              <p className="mt-1 text-sm text-slate-600">
                最も参加人数の多い時間帯：{formatTimeRanges(summary.bestAvailableTimeSlots) || "-"}
              </p>
              {summary.slot.note ? <p className="mt-2 text-sm text-slate-500">{summary.slot.note}</p> : null}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <SmallCount label="参加可能" value={summary.availableCount} tone="available" />
              <SmallCount label="未定" value={summary.maybeCount} tone="maybe" />
              <SmallCount label="不可" value={summary.unavailableCount} tone="unavailable" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function SmallCount({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "available" | "maybe" | "unavailable";
}) {
  const toneClass = {
    available: "bg-court-sky text-court-green",
    maybe: "bg-amber-100 text-amber-700",
    unavailable: "bg-slate-100 text-slate-500",
  }[tone];

  return (
    <div className={`min-w-0 rounded-md px-2 py-2 ${toneClass}`}>
      <p className="text-lg font-black leading-5">{value}</p>
      <p className="mt-1 text-[11px] font-bold">{label}</p>
    </div>
  );
}
