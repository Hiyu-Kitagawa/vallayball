import Link from "next/link";

export default function AvailabilityPage() {
  return (
    <section className="rounded-lg border border-white/80 bg-white p-5 shadow-soft">
      <p className="text-sm font-bold text-court-green">予定入力</p>
      <h1 className="mt-2 text-2xl font-black text-court-navy">入力はカレンダーからできます</h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        スマホで使いやすいように、名前選択と日付ごとの入力をトップ画面にまとめています。
      </p>
      <Link
        href="/"
        className="mt-5 inline-flex w-full justify-center rounded-lg bg-court-green px-4 py-4 text-base font-black text-white"
      >
        カレンダーを開く
      </Link>
    </section>
  );
}
