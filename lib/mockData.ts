import type { AvailabilityMap, GymCandidate, Member, PracticeSlot, ScheduleState } from "@/lib/types";

export const members: Member[] = [
  { id: "m-hara", name: "はら" },
  { id: "m-haruka", name: "はるか" },
  { id: "m-sona", name: "そな" },
  { id: "m-risa", name: "りさ" },
  { id: "m-rei", name: "れい" },
  { id: "m-hiyu", name: "ひゆう" },
];

export const gymCandidates: GymCandidate[] = [
  {
    id: "g-central",
    name: "中央区スポーツセンター",
    address: "東京都中央区日本橋浜町2-59-1",
    fee: "2時間 3,200円",
    availabilityUrl: "https://www.city.nagaoka.niigata.jp/shisei/cate08/jyouhouka/e_shisetu.html",
    memo: "土曜夜は埋まりやすい。前月20日以降にキャンセルが出ることあり。",
  },
  {
    id: "g-minato",
    name: "港区総合体育館",
    address: "東京都港区芝浦1-16-1",
    fee: "2時間 4,000円",
    availabilityUrl: "https://www.city.nagaoka.niigata.jp/shisei/cate08/jyouhouka/e_shisetu.html",
    memo: "駅から近く集まりやすい。全面利用だと少し高め。",
  },
  {
    id: "g-shinagawa",
    name: "品川区立総合体育館",
    address: "東京都品川区東五反田2-11-2",
    fee: "2時間 3,600円",
    availabilityUrl: "https://www.city.nagaoka.niigata.jp/shisei/cate08/jyouhouka/e_shisetu.html",
    memo: "日曜午前の空きが比較的見つかりやすい。",
  },
];

const gymRotation = ["g-central", "g-minato", "g-shinagawa"];

export const practiceSlots: PracticeSlot[] = Array.from({ length: 31 }, (_, index) => {
  const day = index + 1;
  const date = String(day).padStart(2, "0");

  return {
    id: `s-2026-05-${date}`,
    startsAt: `2026-05-${date}T18:00:00+09:00`,
    endsAt: `2026-05-${date}T20:00:00+09:00`,
    gymId: gymRotation[index % gymRotation.length],
    note: day === 23 ? "軽めの基礎練とゲーム形式" : undefined,
  };
});

export const timeOptions = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
];

export const defaultAvailability: AvailabilityMap = {
  "m-hara": {
    "s-2026-05-23": { status: "available", timeSlots: ["17:00", "18:00", "19:00"] },
    "s-2026-05-24": { status: "maybe", timeSlots: [] },
  },
  "m-haruka": {
    "s-2026-05-23": { status: "available", timeSlots: ["19:00", "20:00"] },
    "s-2026-05-30": { status: "maybe", timeSlots: [] },
  },
  "m-sona": {
    "s-2026-05-24": { status: "available", timeSlots: ["09:00", "10:00", "11:00"] },
    "s-2026-05-31": { status: "maybe", timeSlots: [] },
  },
  "m-risa": {
    "s-2026-05-23": { status: "available", timeSlots: ["17:00", "18:00"] },
    "s-2026-05-30": { status: "available", timeSlots: ["17:00", "18:00", "19:00"] },
  },
  "m-rei": {
    "s-2026-05-24": { status: "available", timeSlots: ["09:00", "10:00"] },
    "s-2026-05-31": { status: "available", timeSlots: ["13:00", "14:00", "15:00"] },
  },
  "m-hiyu": {
    "s-2026-05-23": { status: "maybe", timeSlots: [] },
    "s-2026-05-06": { status: "available", timeSlots: ["17:00"] },
  },
};

export const initialScheduleState: ScheduleState = {
  members,
  gyms: gymCandidates,
  slots: practiceSlots,
  availability: defaultAvailability,
};
