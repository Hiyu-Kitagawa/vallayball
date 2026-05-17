import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium, type Page } from "playwright";

const USER_URL = "https://www.task-asp.net/cu/ykr152021/app/ykr00000/ykr00001.aspx";
const ENTRY_URL = "https://www.task-asp.net/cu/eg/ykr152021.task";
const OFFICIAL_TOP_URL = USER_URL;
const PUBLIC_DATA_PATH = path.resolve(process.cwd(), "public", "data", "nagaoka-availability.json");
const DEFAULT_WEEKS = 6;

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

type AvailabilityResult = {
  checkedAt: string;
  sourceUrl: string;
  finalUrl?: string;
  pageTitle?: string;
  purpose: "バレーボール";
  weeksChecked: number;
  status: "ok" | "partial" | "failed";
  message: string;
  facilities: AvailabilityFacility[];
  fallbackUrl: string;
  artifacts: {
    screenshot?: string;
    html?: string;
    json?: string;
  };
};

type PublicAvailabilityResult = Omit<AvailabilityResult, "artifacts">;

type ParsedCode = {
  date?: string;
  facilityCode?: string;
  roomCode?: string;
  areaCode?: string;
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const sourceUrl = options.url ?? process.env.AVAILABILITY_URL ?? USER_URL;
  const weeks = options.weeks ?? Number(process.env.AVAILABILITY_WEEKS ?? DEFAULT_WEEKS);
  const headless = process.env.HEADLESS !== "false";
  const outDir = path.resolve(process.cwd(), "tmp", "availability-check");

  await mkdir(outDir, { recursive: true });
  await mkdir(path.dirname(PUBLIC_DATA_PATH), { recursive: true });

  const result: AvailabilityResult = {
    checkedAt: new Date().toISOString(),
    sourceUrl,
    purpose: "バレーボール",
    weeksChecked: weeks,
    status: "failed",
    message: "公式サイトから空き状況を取得できませんでした。",
    facilities: [],
    fallbackUrl: OFFICIAL_TOP_URL,
    artifacts: {},
  };

  const browser = await chromium.launch({ headless });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

  try {
    await openTopPage(page, sourceUrl);
    await navigateToVolleyballAvailability(page);

    result.pageTitle = await page.title();
    result.finalUrl = page.url();

    const weeklyResults: AvailabilityFacility[][] = [];
    for (let weekIndex = 0; weekIndex < weeks; weekIndex += 1) {
      weeklyResults.push(await extractAvailability(page));

      if (weekIndex < weeks - 1) {
        const moved = await goNextWeek(page);
        if (!moved) break;
      }
    }

    result.facilities = mergeFacilities(weeklyResults.flat());
    await preserveKnownTimeSlots(result.facilities);

    const availableCount = result.facilities.reduce(
      (sum, facility) =>
        sum +
        facility.courts.reduce(
          (courtSum, court) => courtSum + court.availability.filter((day) => day.status !== "空きなし").length,
          0,
        ),
      0,
    );

    if (result.facilities.length > 0) {
      result.status = "ok";
      result.message = `${result.weeksChecked}週間分、${result.facilities.length}施設、${availableCount}件の空き状況を取得しました。`;
    } else {
      result.status = "partial";
      result.message = "公式サイトは開けましたが、空き状況の一覧を特定できませんでした。";
    }
  } catch (error) {
    result.message = error instanceof Error ? error.message : String(error);
  } finally {
    const timestamp = compactTimestamp();
    const screenshotPath = path.join(outDir, `nagaoka-availability-${timestamp}.png`);
    const htmlPath = path.join(outDir, `nagaoka-availability-${timestamp}.html`);
    const jsonPath = path.join(outDir, `nagaoka-availability-${timestamp}.json`);

    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
    await writeFile(htmlPath, await page.content(), "utf-8").catch(() => undefined);

    result.artifacts = {
      screenshot: screenshotPath,
      html: htmlPath,
      json: jsonPath,
    };
    result.finalUrl = page.url();

    await writeFile(jsonPath, JSON.stringify(result, null, 2), "utf-8");
    await writeFile(PUBLIC_DATA_PATH, JSON.stringify(toPublicResult(result), null, 2), "utf-8");
    await browser.close();
  }

  console.log(JSON.stringify(result, null, 2));

  if (result.status === "failed") {
    process.exitCode = 1;
  }
}

function toPublicResult(result: AvailabilityResult): PublicAvailabilityResult {
  const { artifacts: _artifacts, ...publicResult } = result;
  return publicResult;
}

function parseArgs(args: string[]) {
  const parsed: { url?: string; weeks?: number } = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--url") parsed.url = args[index + 1];
    if (arg === "--weeks") parsed.weeks = Number(args[index + 1]);
  }

  return parsed;
}

function compactTimestamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "");
}

async function openTopPage(page: Page, requestedUrl: string) {
  const urls = Array.from(new Set([requestedUrl, ENTRY_URL, USER_URL]));
  let lastError: unknown;

  for (const url of urls) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);

      const bodyText = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
      if (!/404|Not Found|見つかりません/i.test(bodyText)) return;
      lastError = new Error(`公式サイトを開けませんでした: ${url}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function navigateToVolleyballAvailability(page: Page) {
  await clickFirstVisible(page, ["#YkrHeaderButton1", 'a[href*="ykr30000"]', 'input[alt*="施設案内"]']);
  await clickFirstVisible(page, ["#ykr30001c_MokutekiImgButton", 'input[alt*="利用目的"]']);
  await clickFirstVisible(page, ['a[href*="NCMD:0:1"]']);
  await clickFirstVisible(page, ['a[href*="NCMD:0:1:201"]']);

  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);

  const bodyText = await page.locator("body").innerText({ timeout: 5_000 }).catch(() => "");
  if (!bodyText.includes("バレーボール") && !page.url().includes("ykr31101")) {
    throw new Error("バレーボールの空き状況ページまで移動できませんでした。");
  }
}

async function clickFirstVisible(page: Page, selectors: string[]) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if ((await locator.count()) === 0) continue;
    if (!(await locator.isVisible().catch(() => false))) continue;

    await locator.click({ timeout: 10_000, force: true });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
    return;
  }

  throw new Error(`公式サイト上で必要なボタンが見つかりませんでした: ${selectors.join(", ")}`);
}

async function goNextWeek(page: Page) {
  const nextWeekButton = page.locator("#WeeklyAkiListCtrl_NextWeekImgBtn").first();
  if ((await nextWeekButton.count()) === 0) return false;
  if (!(await nextWeekButton.isVisible().catch(() => false))) return false;

  await nextWeekButton.click({ timeout: 10_000, force: true });
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => undefined);
  return true;
}

async function extractAvailability(page: Page): Promise<AvailabilityFacility[]> {
  const rows = await page.locator("tr").evaluateAll((rowElements) =>
    rowElements.map((row, rowIndex) => ({
      rowIndex,
      text: (row.textContent ?? "").replace(/\s+/g, " ").trim(),
      links: Array.from(row.querySelectorAll("a")).map((link) => ({
        text: (link.textContent ?? "").replace(/\s+/g, " ").trim(),
        href: link.href,
        imgAlt: link.querySelector("img")?.getAttribute("alt") ?? "",
      })),
    })),
  );

  const courtByKey = new Map<string, { facilityName: string; courtName: string }>();

  for (const row of rows) {
    for (const link of row.links) {
      if (!link.href.includes("PSPARAM=Ks")) continue;
      const code = parseCode(link.href);
      const key = makeKey(code);
      if (!key) continue;

      courtByKey.set(key, {
        facilityName: findFacilityName(rows, row.rowIndex),
        courtName: link.text || row.text || "コート",
      });
    }
  }

  const facilities = new Map<string, Map<string, AvailabilityDay[]>>();

  for (const row of rows) {
    for (const link of row.links) {
      if (!link.href.includes("PSPARAM=Ic")) continue;

      const code = parseCode(link.href);
      const key = makeKey(code);
      if (!key || !code.date) continue;

      const court = courtByKey.get(key);
      const facilityName = court?.facilityName ?? findFacilityName(rows, row.rowIndex);
      const courtName = court?.courtName ?? "コート";
      const status = statusFromAlt(link.imgAlt);

      if (!facilities.has(facilityName)) facilities.set(facilityName, new Map());
      const courtMap = facilities.get(facilityName)!;
      if (!courtMap.has(courtName)) courtMap.set(courtName, []);
      courtMap.get(courtName)!.push({
        date: code.date,
        status,
        sourceUrl: link.href,
      });
    }
  }

  return Array.from(facilities.entries()).map(([name, courtMap]) => ({
    name,
    courts: Array.from(courtMap.entries()).map(([courtName, availability]) => ({
      name: courtName,
      availability: availability.sort((a, b) => a.date.localeCompare(b.date)),
    })),
  }));
}

function mergeFacilities(facilities: AvailabilityFacility[]) {
  const merged = new Map<string, Map<string, Map<string, AvailabilityDay>>>();

  facilities.forEach((facility) => {
    if (!merged.has(facility.name)) merged.set(facility.name, new Map());
    const courtMap = merged.get(facility.name)!;

    facility.courts.forEach((court) => {
      if (!courtMap.has(court.name)) courtMap.set(court.name, new Map());
      const dayMap = courtMap.get(court.name)!;

      court.availability.forEach((day) => {
        dayMap.set(`${day.date}-${day.status}-${day.sourceUrl}`, day);
      });
    });
  });

  return Array.from(merged.entries())
    .map(([facilityName, courtMap]) => ({
      name: facilityName,
      courts: Array.from(courtMap.entries())
        .map(([courtName, dayMap]) => ({
          name: courtName,
          availability: Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name, "ja")),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ja"));
}

async function preserveKnownTimeSlots(facilities: AvailabilityFacility[]) {
  const previousData = await readFile(PUBLIC_DATA_PATH, "utf-8")
    .then((content) => JSON.parse(content) as Partial<AvailabilityResult>)
    .catch(() => undefined);

  if (!previousData?.facilities) return;

  const timeSlotsByKey = new Map<string, string[]>();
  previousData.facilities.forEach((facility) => {
    facility.courts.forEach((court) => {
      court.availability.forEach((day) => {
        const key = makeAvailabilityKey(day.sourceUrl);
        if (key && day.timeSlots && day.timeSlots.length > 0) {
          timeSlotsByKey.set(key, day.timeSlots);
        }
      });
    });
  });

  facilities.forEach((facility) => {
    facility.courts.forEach((court) => {
      court.availability.forEach((day) => {
        const key = makeAvailabilityKey(day.sourceUrl);
        const timeSlots = key ? timeSlotsByKey.get(key) : undefined;
        if (timeSlots) day.timeSlots = timeSlots;
      });
    });
  });
}

function makeAvailabilityKey(sourceUrl: string) {
  const code = parseCode(sourceUrl);
  if (!code.date || !code.facilityCode || !code.roomCode || !code.areaCode) return undefined;
  return `${code.date}:${code.facilityCode}:${code.roomCode}:${code.areaCode}`;
}

function parseCode(href: string): ParsedCode {
  const decoded = decodeURIComponent(href);
  const psparam = decoded.match(/[?&]PSPARAM=([^&]+)/)?.[1] ?? decoded;
  const parts = psparam.split(":");
  const dates = parts.filter((part) => /^\d{8}$/.test(part));
  const searchDate = dates[0];
  const availabilityDate = dates[dates.length - 1];

  if (!searchDate || !availabilityDate) return {};

  const dateIndex = parts.indexOf(searchDate);
  const facilityCode = parts[dateIndex + 2];
  const roomCode = parts[dateIndex + 3];
  const areaCode = parts[dateIndex + 4];

  return {
    date: `${availabilityDate.slice(0, 4)}-${availabilityDate.slice(4, 6)}-${availabilityDate.slice(6, 8)}`,
    facilityCode,
    roomCode,
    areaCode,
  };
}

function makeKey(code: ParsedCode) {
  if (!code.facilityCode || !code.roomCode || !code.areaCode) return undefined;
  return `${code.facilityCode}:${code.roomCode}:${code.areaCode}`;
}

function findFacilityName(rows: Array<{ rowIndex: number; text: string }>, startIndex: number) {
  for (let index = startIndex; index >= Math.max(0, startIndex - 12); index -= 1) {
    const text = rows[index]?.text ?? "";
    const match = text.match(/長岡市[^ ]*(体育館|センター|運動広場|スポーツ広場|武道館)[^ ]*/);
    if (match) return match[0];
  }

  return "長岡市公共施設";
}

function statusFromAlt(alt: string): AvailabilityStatus {
  if (alt.includes("1日空き")) return "1日空き";
  if (alt.includes("一部空き")) return "一部空き";
  if (alt.includes("休館")) return "休館日";
  if (alt.includes("空き無し") || alt.includes("空きなし") || alt.includes("満")) return "空きなし";
  return "不明";
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
