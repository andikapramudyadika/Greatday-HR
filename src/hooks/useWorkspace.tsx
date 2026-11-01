import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AttendanceRecord,
  Database,
  Log,
  LogLevel,
  Preferences,
} from "../types";
import { readDatabase, saveDatabase } from "../services/storage-service";
import {
  emptyRecord,
  validateDatabase,
  validateEmployee,
  validateRecord,
} from "../services/attendance-engine";
export const defaults: Preferences = {
  theme: "dark",
  fontSize: 13,
  fontFamily: "Consolas, monospace",
  terminalFontSize: 12,
  speed: 80,
  autoScroll: true,
  layout: "split",
  compact: false,
};
export function validatePreferences(p: unknown): Preferences {
  const value = p as Preferences;
  if (
    !value ||
    !["dark", "monochrome", "rainbow"].includes(value.theme) ||
    !["split", "stacked"].includes(value.layout) ||
    !["Consolas, monospace", "Courier New, monospace", "monospace"].includes(
      value.fontFamily,
    ) ||
    !Number.isFinite(value.fontSize) ||
    value.fontSize < 11 ||
    value.fontSize > 22 ||
    !Number.isFinite(value.terminalFontSize) ||
    value.terminalFontSize < 10 ||
    value.terminalFontSize > 20 ||
    ![0, 80, 250].includes(value.speed) ||
    typeof value.autoScroll !== "boolean" ||
    typeof value.compact !== "boolean"
  )
    throw new Error("Preferensi tidak valid.");
  return { ...defaults, ...value };
}
function loadPreferences() {
  try {
    return validatePreferences(
      JSON.parse(localStorage.getItem("attendance-preferences") || "null"),
    );
  } catch {
    return defaults;
  }
}
function useWorkspaceState() {
  const [db, setDb] = useState<Database | null>(null);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<Log[]>([]);
  const [prefs, setPrefs] = useState(loadPreferences);
  const dataRef = useRef<Database | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const id = useRef(0);
  const log = (level: LogLevel, message: string) =>
    setLogs((prev) => [
      ...prev.slice(-499),
      {
        id: ++id.current,
        level,
        message,
        time: new Date().toLocaleTimeString("en-GB"),
      },
    ]);
  useEffect(() => {
    let cancelled = false;
    readDatabase()
      .then(async (data) => {
        await saveDatabase(data);
        if (!cancelled) {
          dataRef.current = data;
          setDb(data);
          log(
            "success",
            `Workspace ready. Loaded ${data.records.length} records from IndexedDB.`,
          );
        }
      })
      .catch((e) => setError(String(e)));
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    localStorage.setItem("attendance-preferences", JSON.stringify(prefs));
  }, [prefs]);
  const mutate = async (
    change: (current: Database) => Database,
    message: string,
  ) => {
    const job = queue.current.then(async () => {
      if (!dataRef.current) throw new Error("Database belum siap.");
      const next = validateDatabase(change(structuredClone(dataRef.current)));
      await saveDatabase(next);
      dataRef.current = next;
      setDb(next);
      log("success", message);
      return structuredClone(next);
    });
    queue.current = job.catch(() => {});
    return job;
  };
  const update = async (patch: {
    date: string;
    checkIn?: string | null;
    checkOut?: string | null;
    shift?: string;
    notes?: string;
  }) => {
    await mutate((current) => {
      const old =
        current.records.find((r) => r.attendance_date === patch.date) ||
        emptyRecord(current.employee, patch.date);
      const record = validateRecord({
        ...old,
        ...(patch.checkIn !== undefined ? { check_in: patch.checkIn } : {}),
        ...(patch.checkOut !== undefined ? { check_out: patch.checkOut } : {}),
        ...(patch.shift !== undefined ? { shift: patch.shift } : {}),
        ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
      });
      current.records = [
        ...current.records.filter((r) => r.attendance_date !== patch.date),
        record,
      ];
      return current;
    }, `Updated attendance ${patch.date}. Changes saved to IndexedDB.`);
    return structuredClone(
      dataRef.current!.records.find((r) => r.attendance_date === patch.date)!,
    );
  };
  return {
    db,
    error,
    logs,
    prefs,
    setPrefs,
    log,
    clearLogs: () => setLogs([]),
    update,
    mutate,
    getDatabase: () => structuredClone(dataRef.current!),
    saveEmployee: async (employee: Database["employee"]) => {
      const e = validateEmployee(employee);
      await mutate(
        (current) => ({
          ...current,
          employee: e,
          records: current.records.map((r) => ({
            ...r,
            employee_id: e.id,
            employee_name: e.name,
          })),
        }),
        "Employee configuration saved.",
      );
    },
    remove: async (date: string) => {
      await mutate(
        (current) => ({
          ...current,
          records: current.records.filter((r) => r.attendance_date !== date),
        }),
        `Deleted record ${date}.`,
      );
    },
    replace: async (value: unknown) => {
      const data = validateDatabase(value);
      await mutate(() => data, "Imported workspace data.");
    },
    saveRecord: async (record: AttendanceRecord) =>
      update({
        date: record.attendance_date,
        checkIn: record.check_in,
        checkOut: record.check_out,
        shift: record.shift,
        notes: record.notes,
      }),
  };
}
const WorkspaceContext = createContext<ReturnType<
  typeof useWorkspaceState
> | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const state = useWorkspaceState();
  return (
    <WorkspaceContext.Provider value={state}>
      {children}
    </WorkspaceContext.Provider>
  );
}
export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("Workspace context missing");
  return ctx;
}
