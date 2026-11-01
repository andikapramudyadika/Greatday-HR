import { openDB } from "idb";
import type { AttendanceRecord, Database } from "../types";
import { emptyRecord, validateDatabase } from "./attendance-engine";
import { localDate } from "../utils/date";
const connection = () =>
  openDB("attendance-developer-workspace", 1, {
    upgrade(db) {
      db.createObjectStore("workspace");
    },
  });
export function seedDatabase(): Database {
  const employee = {
    id: "DEMO-001",
    name: "ANDIKA PRAMUDYA",
    position: "ACCOUNT RECEIVABLE OFFICER",
    branch: "Mandiri Utama Finance",
  };
  const examples = [
    {
      date: "2026-10-05",
      check_in: "07:36",
      check_out: "19:55",
      notes: "PRS · HK · EAI",
    },
    { date: "2026-10-04", check_in: null, check_out: null, notes: "OFF" },
    {
      date: "2026-10-31",
      check_in: "07:50",
      check_out: "20:08",
      notes: "Telah diproses",
    },
  ];
  const records: AttendanceRecord[] = examples.map((e) => ({
    ...emptyRecord(employee, e.date),
    check_in: e.check_in,
    check_out: e.check_out,
    notes: e.notes,
    status: e.check_in ? ("present" as const) : ("off" as const),
  }));
  if (!records.some((r) => r.attendance_date === localDate()))
    records.push(emptyRecord(employee));
  return validateDatabase({ employee, records });
}
export async function readDatabase() {
  const db = await connection();
  try {
    const saved = await db.get("workspace", "data");
    return saved ? validateDatabase(saved) : seedDatabase();
  } finally {
    db.close();
  }
}
export async function saveDatabase(value: Database) {
  const db = await connection();
  try {
    await db.put("workspace", validateDatabase(value), "data");
  } finally {
    db.close();
  }
}
