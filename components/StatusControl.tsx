import type { ResponseStatus } from "@/lib/types";

const options: { value: ResponseStatus; label: string; className: string }[] = [
  {
    value: "available",
    label: "参加可能",
    className: "data-[active=true]:bg-court-green data-[active=true]:text-white",
  },
  {
    value: "maybe",
    label: "未定",
    className: "data-[active=true]:bg-amber-500 data-[active=true]:text-white",
  },
  {
    value: "unavailable",
    label: "不可",
    className: "data-[active=true]:bg-slate-600 data-[active=true]:text-white",
  },
];

export function StatusControl({
  value,
  onChange,
}: {
  value: ResponseStatus;
  onChange: (value: ResponseStatus) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-100 p-1">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-active={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-11 rounded-md px-2 py-2 text-sm font-black text-slate-600 transition hover:bg-white ${option.className}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
