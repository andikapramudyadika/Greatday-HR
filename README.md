# Attendance Developer Workspace

Workspace absensi lokal berbasis React, TypeScript, Vite, Tailwind CSS, CodeMirror 6, dan IndexedDB. Referensi susunan informasi berasal dari dua screenshot GreatDay; aplikasi ini independen dan tidak terhubung ke sistem perusahaan.

## Menjalankan

Gunakan Node.js 22.12+ atau 24 dan pnpm 11.

```sh
pnpm install
pnpm dev
```

Buka URL lokal yang dicetak Vite (default `http://127.0.0.1:5173`).

```sh
pnpm test       # Validasi, interpreter, perhitungan, dan persistensi IndexedDB
pnpm build      # Pemeriksaan TypeScript + build produksi ke dist/
pnpm verify:build # Memastikan HTML produksi memuat bundle JS/CSS yang tersedia
pnpm preview    # Preview build produksi
```

## Mengedit absensi

1. Buka `attendance-editor.js` di Workspace.
2. Sesuaikan tanggal, jam masuk, jam keluar, shift, dan keterangan.
3. Tekan **Run script** atau **Ctrl+Enter** saat editor aktif.

```js
const updated = await attendanceEditor.update({
  date: "2026-11-01",
  checkIn: "07:36",
  checkOut: "19:55",
  shift: "Regular Cabang Office Hour",
  notes: "PRS · HK · EAI"
});
console.success("Saved", updated);
```

Dashboard selalu menampilkan tanggal perangkat hari ini, sedangkan riwayat, inspector, dan laporan mengikuti periode pilihan. Edit tanggal lampau dengan memilih periodenya. Data contoh 4 dan 5 Oktober serta 31 Oktober 2026 diambil dari screenshot; identitas awal menggunakan employee ID demo.

Alternatif: klik ikon pensil di Dashboard atau **Edit** pada record. **Rekam Waktu** mencatat waktu perangkat saat itu. Satu karyawan memiliki satu record per tanggal. Duplikasi membuka editor dengan tanggal kosong berikutnya dan baru disimpan setelah menekan Save.

## API script

| API | Hasil |
| --- | --- |
| `await attendance.load()` | Record periode pilihan |
| `await attendance.all()` | Seluruh record |
| `await attendance.get(date)` | Record tanggal tertentu atau null |
| `await attendance.validate(records)` | `{ valid, errors }` |
| `await attendance.calculate(record)` | `{ working_minutes, overtime_minutes }` |
| `await attendance.report()` | Ringkasan periode pilihan |
| `await attendanceEditor.update(patch)` | Record tersimpan, tervalidasi, semua panel tersinkron |
| `await employeeService.get()` | Identitas karyawan |
| `await employeeService.update(employee)` | Mengubah identitas dan seluruh record |
| `console.log/info/success/warn/error/debug(...)` | Output terminal dengan timestamp |

Interpreter Acorn menjalankan subset JavaScript: `await`, `const`/`let`, literal, objek, array, akses properti, perhitungan, kondisi, template string, `if`, dan `for…of`. `JSON.parse` dan `JSON.stringify` tersedia. Tidak menggunakan `eval` atau `Function`; tidak mengekspos DOM, jaringan, prototype, atau browser globals. Function declaration, arrow function, `while`, dan method JavaScript arbitrer tidak tersedia. Maksimal 50.000 langkah per eksekusi. Pause/Stop diperiksa antar langkah; perubahan yang sudah tersimpan tidak dibatalkan. API Reference di aplikasi berisi panduan yang sama.

`attendance-data.json` adalah tampilan read-only dari sumber data utama agar tetap sinkron. Gunakan script, editor visual, atau impor JSON untuk mengubah record.

Jam menggunakan format 24 jam `HH:MM` atau `null`; tanggal `YYYY-MM-DD`. Jam keluar harus sama atau lebih akhir dari jam masuk pada tanggal yang sama. Shift lintas tengah malam belum didukung. Lembur laporan adalah durasi di atas 8 jam per hari, bukan perhitungan payroll atau ketentuan lembur perusahaan.

## Penyimpanan dan backup

- Identitas dan record: IndexedDB, database `attendance-developer-workspace`.
- Preferensi dan script: LocalStorage.
- Penyimpanan dibedakan per origin/browser. Menghapus data browser menghapus data aplikasi.
- Settings menyediakan ekspor/impor JSON, backup data dan preferensi, restore, serta reset record. Impor, restore, reset, dan delete meminta konfirmasi. Validasi selesai sebelum data lama diganti. Backup workspace mencakup record, identitas, dan preferensi; salin script kustom melalui Copy Code bila diperlukan.
- Tidak ada backend, kredensial perusahaan, telemetry, external fonts, CDN, atau panggilan jaringan aplikasi setelah aset dimuat.

## Layout

Desktop: Dashboard 29%, konsol 71%. Drag pemisah editor/inspector atau terminal untuk mengubah ukuran; pemisah juga mendukung tombol panah saat fokus. Tablet mempertahankan konsol sebagai pusat. Ponsel memakai header absensi ringkas dan tab Editor/Inspector/Terminal. Tema VS Code Dark, Monochrome, dan Rainbow Code berlaku pada seluruh aplikasi.

## GitHub Pages

Seluruh navigasi internal memakai state React sehingga tidak memerlukan server route fallback. Workflow `.github/workflows/pages.yml` otomatis menguji, membangun, memverifikasi bundle, dan menerbitkan isi `dist/` pada setiap push ke `main`. Workflow juga dapat dijalankan manual. Pengaturan **Settings → Pages → Source** harus menggunakan **GitHub Actions**.

Workflow membaca path Pages dari `actions/configure-pages` dan meneruskannya melalui `VITE_BASE_PATH`, sehingga URL aset produksi menggunakan subpath repository yang benar (misalnya `/Greatday-HR/assets/…`). Build lokal tetap menggunakan aset relatif `./` saat variabel ini tidak diisi. Jangan menerbitkan root source repository melalui Jekyll: file `index.html` sumber menunjuk ke `src/main.tsx` yang perlu dikompilasi oleh Vite.

Untuk hosting statis lain, unggah isi `dist/`. Gunakan HTTP/HTTPS; jangan membuka `index.html` langsung melalui `file://`.

## Struktur

`src/components/`: Dashboard, CodeEditor, DeveloperConsole, Terminal, DataInspector, attendance controls.

`src/pages/`: Workspace, AttendanceRecords, Settings.

`src/hooks/useWorkspace.tsx`: centralized React context, antrean mutasi, commit atomik ke IndexedDB sebelum update UI.

`src/services/`: validasi/perhitungan, storage, interpreter, dan template script.

`src/utils/date.ts`: tanggal/waktu lokal perangkat dan filter periode.
