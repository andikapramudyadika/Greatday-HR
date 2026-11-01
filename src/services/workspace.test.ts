import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  validateRecord,
  validateDatabase,
  makeReport,
} from "./attendance-engine";
import { seedDatabase, readDatabase, saveDatabase } from "./storage-service";
import { executeScript, ExecutionStopped } from "./execution-engine";
import { inPeriod, moveMonth } from "../utils/date";
const control = () => ({
  signal: new AbortController().signal,
  paused: () => false,
  speed: () => 0,
});
describe("Attendance validation and reporting", () => {
  const record = seedDatabase().records.find(
    (r) => r.attendance_date === "2026-10-05",
  )!;
  it("calculates the reference screenshot duration and overtime", () => {
    expect(makeReport([record])).toMatchObject({
      present: 1,
      working_minutes: 739,
      overtime_minutes: 259,
    });
  });
  it.each([
    { attendance_date: "2026-02-30" },
    { check_in: "24:00" },
    { check_in: "7:36" },
    { check_in: null, check_out: "19:55" },
    { check_in: "20:00", check_out: "07:00" },
    { shift: "unknown" },
    { notes: 0 },
  ])("rejects invalid record %j", (patch) =>
    expect(() => validateRecord({ ...record, ...patch })).toThrow(),
  );
  it("normalizes status instead of trusting imported status", () =>
    expect(validateRecord({ ...record, status: "absent" }).status).toBe(
      "present",
    ));
  it("rejects duplicate dates before any write", () => {
    const db = seedDatabase();
    expect(() =>
      validateDatabase({ ...db, records: [record, record] }),
    ).toThrow("duplikat");
  });
  it("filters periods independently from today and handles year boundaries", () => {
    expect(
      inPeriod(record, { mode: "month", month: "2026-10", start: "", end: "" }),
    ).toBe(true);
    expect(
      inPeriod(record, {
        mode: "custom",
        month: "",
        start: "2026-10-06",
        end: "2026-10-31",
      }),
    ).toBe(false);
    expect(moveMonth("2026-12", 1)).toBe("2027-01");
    expect(moveMonth("2026-01", -1)).toBe("2025-12");
  });
});
describe("Local execution and persistence", () => {
  it("runs a real update, persists in IndexedDB, and reloads the new values", async () => {
    const db = seedDatabase();
    const calls: unknown[] = [];
    await executeScript(
      `const record = await attendanceEditor.update({date:"2026-10-05",checkIn:"08:00",checkOut:"17:00"}); console.log(record.check_in);`,
      {
        attendanceEditor: {
          update: async (patch: any) => {
            const index = db.records.findIndex(
              (r) => r.attendance_date === patch.date,
            );
            db.records[index] = validateRecord({
              ...db.records[index],
              check_in: patch.checkIn,
              check_out: patch.checkOut,
            });
            await saveDatabase(db);
            return db.records[index];
          },
        },
        console: {
          log: (value: unknown) => {
            calls.push(value);
          },
        },
      },
      control(),
    );
    const loaded = await readDatabase();
    expect(
      loaded.records.find((r) => r.attendance_date === "2026-10-05"),
    ).toMatchObject({
      check_in: "08:00",
      check_out: "17:00",
      status: "present",
    });
    expect(calls).toEqual(["08:00"]);
  });
  it("supports loop scope and conditional calculations", async () => {
    const values: number[] = [];
    await executeScript(
      "const records = [1,2,3]; for (const r of records) { const result = r * 2; if (result > 2) { console.log(result); } }",
      { console: { log: (n: number) => values.push(n) } },
      control(),
    );
    expect(values).toEqual([4, 6]);
  });
  it("updates outer let bindings inside loops", async () => {
    const values: number[] = [];
    await executeScript(
      "let total = 0; for (const n of [1,2,3]) { total = total + n; } console.log(total);",
      { console: { log: (n: number) => values.push(n) } },
      control(),
    );
    expect(values).toEqual([6]);
  });
  it("rejects reassignment to const", async () => {
    await expect(
      executeScript("const total = 0; total = 1;", {}, control()),
    ).rejects.toThrow("const");
  });
  it("pauses before invoking an API even during a configured delay", async () => {
    let paused = false,
      writes = 0;
    const job = executeScript(
      "await api.write();",
      { api: { write: () => writes++ } },
      { ...control(), paused: () => paused, speed: () => 60 },
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    paused = true;
    await new Promise((resolve) => setTimeout(resolve, 100));
    const writesDuringPause = writes;
    paused = false;
    await job;
    expect(writesDuringPause).toBe(0);
    expect(writes).toBe(1);
  });
  it.each([
    "window.localStorage.clear()",
    'fetch("https://example.com")',
    'console.log.constructor("return window")()',
    "const x = {}; x.__proto__;",
    "const fn = () => 1;",
  ])("blocks unsafe or unsupported script: %s", async (source) => {
    await expect(
      executeScript(source, { console: { log: () => {} } }, control()),
    ).rejects.toThrow();
  });
  it("stop prevents subsequent mutations", async () => {
    const abort = new AbortController();
    let writes = 0;
    await expect(
      executeScript(
        "await api.stop(); await api.write();",
        { api: { stop: () => abort.abort(), write: () => writes++ } },
        { ...control(), signal: abort.signal },
      ),
    ).rejects.toBeInstanceOf(ExecutionStopped);
    expect(writes).toBe(0);
  });
  it("preserves valid database after a failed replacement", async () => {
    const before = await readDatabase();
    await expect(
      saveDatabase({
        ...before,
        records: [{ ...before.records[0], check_in: "invalid" }],
      }),
    ).rejects.toThrow();
    expect(await readDatabase()).toEqual(before);
  });
});
