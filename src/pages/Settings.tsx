import { useRef, useState } from "react";
import {
  UserRound,
  Palette,
  Code2,
  Database,
  Download,
  Upload,
  RotateCcw,
  Save,
  Check,
  HardDrive,
  ShieldCheck,
} from "lucide-react";
import {
  defaults,
  useWorkspace,
  validatePreferences,
} from "../hooks/useWorkspace";
import { validateDatabase } from "../services/attendance-engine";
import { Confirm, download } from "../components/shared";
export function Settings() {
  const { db, prefs, setPrefs, saveEmployee, replace, mutate, log } =
    useWorkspace();
  const [employee, setEmployee] = useState({ ...db!.employee }),
    [saved, setSaved] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState<{
      title: string;
      message: string;
      action: () => Promise<void>;
    } | null>(null),
    [saving, setSaving] = useState(false);
  const importInput = useRef<HTMLInputElement>(null),
    restoreInput = useRef<HTMLInputElement>(null);
  const importFile = async (file: File | undefined, backup: boolean) => {
    if (!file) return;
    setError("");
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error("File maksimal 10 MB.");
      const parsed = JSON.parse(await file.text());
      const data = validateDatabase(
        backup
          ? parsed.database
          : Array.isArray(parsed)
            ? { employee: db!.employee, records: parsed }
            : parsed,
      );
      const importedPrefs = backup
        ? validatePreferences(parsed.preferences)
        : null;
      setPending({
        title: backup ? "Restore backup?" : "Import attendance data?",
        message: `Ini akan mengganti seluruh ${db!.records.length} record lokal dengan ${data.records.length} record dari file.`,
        action: async () => {
          await replace(data);
          if (importedPrefs) setPrefs(importedPrefs);
          setEmployee(data.employee);
        },
      });
    } catch (e) {
      setError((e as Error).message);
      log("error", `Import failed: ${(e as Error).message}`);
    }
  };
  return (
    <section className="settings-page">
      <header className="page-heading">
        <div>
          <span className="eyebrow">WORKSPACE CONFIGURATION</span>
          <h2>Settings</h2>
          <p>Make this workspace yours.</p>
        </div>
        <span className="saved">
          <HardDrive size={14} />
          Preferences saved automatically
        </span>
      </header>
      <div className="settings-content">
        <section className="settings-section">
          <div className="settings-section-title">
            <UserRound size={17} />
            <div>
              <h3>Employee identity</h3>
              <p>Applied to your dashboard and all attendance records.</p>
            </div>
          </div>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setError("");
              setSaving(true);
              try {
                await saveEmployee(employee);
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <div className="form-grid">
              <label>
                Employee name
                <input
                  required
                  maxLength={100}
                  value={employee.name}
                  onChange={(e) =>
                    setEmployee({ ...employee, name: e.target.value })
                  }
                />
              </label>
              <label>
                Employee ID
                <input
                  required
                  maxLength={100}
                  value={employee.id}
                  onChange={(e) =>
                    setEmployee({ ...employee, id: e.target.value })
                  }
                />
              </label>
              <label>
                Job position
                <input
                  required
                  maxLength={100}
                  value={employee.position}
                  onChange={(e) =>
                    setEmployee({ ...employee, position: e.target.value })
                  }
                />
              </label>
              <label>
                Branch
                <input
                  required
                  maxLength={100}
                  value={employee.branch}
                  onChange={(e) =>
                    setEmployee({ ...employee, branch: e.target.value })
                  }
                />
              </label>
            </div>
            <button className="primary" disabled={saving}>
              {saved ? <Check size={14} /> : <Save size={14} />}{" "}
              {saved ? "Saved" : "Save identity"}
            </button>
          </form>
        </section>
        <section className="settings-section">
          <div className="settings-section-title">
            <Palette size={17} />
            <div>
              <h3>Appearance</h3>
              <p>One theme across your entire workspace.</p>
            </div>
          </div>
          <div className="theme-options">
            {[
              {
                id: "dark",
                name: "VS Code Dark",
                colors: ["#1e1e1e", "#007acc", "#c586c0", "#ce9178"],
              },
              {
                id: "monochrome",
                name: "Monochrome",
                colors: ["#090909", "#f5f5f5", "#777", "#bbb"],
              },
              {
                id: "rainbow",
                name: "Rainbow Code",
                colors: ["#111321", "#60d5de", "#d9a0ff", "#ff9e64"],
              },
            ].map((t) => (
              <button
                key={t.id}
                aria-pressed={prefs.theme === t.id}
                className={`theme-option ${prefs.theme === t.id ? "selected" : ""}`}
                onClick={() =>
                  setPrefs({ ...prefs, theme: t.id as typeof prefs.theme })
                }
              >
                <span
                  className="theme-preview"
                  style={{ background: t.colors[0] }}
                >
                  {t.colors.slice(1).map((c, i) => (
                    <i
                      key={c}
                      style={{ background: c, width: `${70 - i * 15}%` }}
                    />
                  ))}
                </span>
                <span>
                  {t.name}
                  {prefs.theme === t.id && <Check size={14} />}
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="settings-section">
          <div className="settings-section-title">
            <Code2 size={17} />
            <div>
              <h3>Developer preferences</h3>
              <p>Editor, terminal, and panel behavior.</p>
            </div>
          </div>
          <div className="form-grid">
            <label>
              Editor font size
              <select
                value={prefs.fontSize}
                onChange={(e) =>
                  setPrefs({ ...prefs, fontSize: Number(e.target.value) })
                }
              >
                {[11, 12, 13, 14, 15, 16, 18, 20, 22].map((n) => (
                  <option key={n} value={n}>
                    {n}px
                  </option>
                ))}
              </select>
            </label>
            <label>
              Editor font family
              <select
                value={prefs.fontFamily}
                onChange={(e) =>
                  setPrefs({ ...prefs, fontFamily: e.target.value })
                }
              >
                <option value="Consolas, monospace">Consolas</option>
                <option value="Courier New, monospace">Courier New</option>
                <option value="monospace">System monospace</option>
              </select>
            </label>
            <label>
              Terminal font size
              <select
                value={prefs.terminalFontSize}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    terminalFontSize: Number(e.target.value),
                  })
                }
              >
                {[10, 11, 12, 13, 14, 16, 18, 20].map((n) => (
                  <option key={n} value={n}>
                    {n}px
                  </option>
                ))}
              </select>
            </label>
            <label>
              Execution speed
              <select
                value={prefs.speed}
                onChange={(e) =>
                  setPrefs({ ...prefs, speed: Number(e.target.value) })
                }
              >
                <option value={0}>Fast · no delay</option>
                <option value={80}>Normal · 80ms</option>
                <option value={250}>Slow · 250ms</option>
              </select>
            </label>
            <label>
              Panel layout
              <select
                value={prefs.layout}
                onChange={(e) =>
                  setPrefs({
                    ...prefs,
                    layout: e.target.value as typeof prefs.layout,
                  })
                }
              >
                <option value="split">Editor + inspector side by side</option>
                <option value="stacked">Editor + inspector stacked</option>
              </select>
            </label>
            <div className="toggle-settings">
              <label>
                <input
                  type="checkbox"
                  checked={prefs.autoScroll}
                  onChange={(e) =>
                    setPrefs({ ...prefs, autoScroll: e.target.checked })
                  }
                />
                Auto scroll terminal
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={prefs.compact}
                  onChange={(e) =>
                    setPrefs({ ...prefs, compact: e.target.checked })
                  }
                />
                Compact mode
              </label>
            </div>
          </div>
        </section>
        <section className="settings-section">
          <div className="settings-section-title">
            <Database size={17} />
            <div>
              <h3>Data management</h3>
              <p>{db!.records.length} records stored in this browser.</p>
            </div>
          </div>
          <div className="data-actions">
            <button
              onClick={() => download("attendance-data.json", db!.records)}
            >
              <Download size={14} />
              Export attendance JSON
            </button>
            <button onClick={() => importInput.current?.click()}>
              <Upload size={14} />
              Import attendance JSON
            </button>
            <button
              onClick={() =>
                download(
                  `attendance-backup-${new Date().toISOString().slice(0, 10)}.json`,
                  { version: 1, database: db, preferences: prefs },
                )
              }
            >
              <Download size={14} />
              Backup workspace
            </button>
            <button onClick={() => restoreInput.current?.click()}>
              <Upload size={14} />
              Restore backup
            </button>
            <button
              className="danger-outline"
              onClick={() =>
                setPending({
                  title: "Reset local records?",
                  message:
                    "Seluruh record absensi akan dihapus. Identitas karyawan dan preferensi tetap tersimpan. Unduh backup sebelum melanjutkan jika diperlukan.",
                  action: async () => {
                    await mutate(
                      (current) => ({ ...current, records: [] }),
                      "All local attendance records cleared.",
                    );
                  },
                })
              }
            >
              <RotateCcw size={14} />
              Reset local records
            </button>
            <button onClick={() => setPrefs(defaults)}>
              Reset preferences
            </button>
          </div>
          <input
            type="file"
            accept="application/json,.json"
            hidden
            ref={importInput}
            onChange={(e) => {
              void importFile(e.target.files?.[0], false);
              e.target.value = "";
            }}
          />
          <input
            type="file"
            accept="application/json,.json"
            hidden
            ref={restoreInput}
            onChange={(e) => {
              void importFile(e.target.files?.[0], true);
              e.target.value = "";
            }}
          />
          <div className="local-info">
            <ShieldCheck size={18} />
            <p>
              <strong>Independent, browser-local workspace.</strong> Data
              absensi disimpan di IndexedDB, preferensi dan script di
              LocalStorage. Tidak terhubung ke server GreatDay atau perusahaan.
              Menghapus data browser juga menghapus workspace ini.
            </p>
          </div>
        </section>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
      {pending && (
        <Confirm
          title={pending.title}
          message={pending.message}
          onClose={() => setPending(null)}
          onConfirm={pending.action}
        />
      )}
    </section>
  );
}
