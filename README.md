# Sistem Pengajuan & Analisis Pencairan Dana Yayasan Al-Qur'aniyyah

Aplikasi web modern (*production-ready*) untuk mengelola alur pengajuan rencana anggaran belanja (RAB), analisis fleksibel oleh Bendahara Umum, persetujuan resmi, pencairan bertahap oleh Bagian Pengeluaran, laporan disposisi beresolusi tinggi (ekspor gambar PNG untuk WhatsApp & PDF), dashboard konsolidasi bebas *double-counting*, dan sistem pencadangan otomatis (*backup & recovery*) terpisah.

---

## 1. Arsitektur & Teknologi

- **Frontend**: React 19 + TypeScript (Vite bundler)
- **Styling**: Tailwind CSS dengan palet tema *Modern Finance Dashboard* (Navy `#14213D`, Biru Utama `#2563EB`, Abu-abu Muda `#F3F5F9`, Putih `#FFFFFF`, Oranye Peringatan, Merah Aksi).
- **Backend & Database**: Supabase PostgreSQL dengan *Row Level Security* (RLS) dan tipe numerik presisi tinggi (`NUMERIC(15,2)`).
- **Spreadsheet Excel**: `xlsx` (membaca template RAB resmi, mendeteksi header secara dinamis, kalkulasi multivolume, validasi duplikat, dan ekspor data terstruktur).
- **Laporan Gambar**: `html2canvas` & `jspdf` (rendering 2x retina, fitur *Salin sebagai Gambar* ke Clipboard untuk ditempel langsung di WhatsApp / Telegram, unduh PNG, unduh PDF, dan cetak).
- **PWA & Android Ready**: Web App Manifest (`manifest.webmanifest`), Service Worker offline fallback (`sw.js`), ikon maskable SVG.

---

## 2. Hak Akses & Peran (Role-Based Access Control)

1. **Admin Yayasan**:
   - Mengelola akun pengguna, konfigurasi profil yayasan, penambahan unit baru, dan backup/pemulihan database.
   - Akses administrasi penuh lintas unit.
2. **Bendahara Umum**:
   - Melihat pengajuan seluruh unit (SD IT, SMP IT, SMA IT, TK IT, dsb).
   - Menjalankan modul **Analisis Fleksibel**: mengubah harga satuan, volume, durasi, jumlah orang, satuan, menghapus item dari pencairan, atau menambah pos baru.
   - Menetapkan nominal yang disetujui tanpa merusak pengajuan asli.
   - Memberikan persetujuan (*approval*) dan menyusun laporan konsolidasi.
3. **Operator Unit**:
   - Dibatasi secara ketat hanya dapat melihat dan mengelola unit yang menjadi tanggung jawabnya (*unit scoping*).
   - Membuat usulan baru (manual atau unggah Excel), menyimpan draft, mengedit draft, menghapus draft, serta mengajukan permohonan resmi ke Bendahara.
4. **Bagian Pengeluaran**:
   - Melihat pengajuan yang telah memperoleh persetujuan resmi (*Disetujui*).
   - Mencatat realisasi pembayaran bertahap (metode Transfer / Tunai, nomor rekening, penerima, bukti transaksi).
   - Sistem memvalidasi agar total realisasi tidak melampaui nominal persetujuan.

---

## 3. Struktur Kolom Excel & Multivolume Dinamis

### A. Kolom Standar RAB
`No`, `Kategori`, `Uraian Barang/Belanja Kegiatan`, `Harga Satuan`, `Volume`, `Satuan`, `Jumlah`, `Keterangan`.

### B. Perhitungan Multivolume
Satu item belanja mendukung banyak faktor pengali dinamis, misalnya:
- **Fotokopi Soal**: `Harga Satuan (Rp2.000) × 14 Mapel × 100 Siswa × 3 Angkatan = Rp8.400.000`.
- **Konsumsi**: `Biaya per orang (Rp20.000) × 20 Orang × 5 Hari = Rp2.000.000`.

### C. Analisis Fleksibel Bendahara (Tanpa Menimpa Data Asli)
Jika usulan awal konsumsi adalah Rp2.000.000 (20 orang × 5 hari), Bendahara dapat mengubah metode perhitungannya menjadi paket bersama Rp100.000 × 3 hari = Rp300.000.
- **Diajukan**: Rp2.000.000
- **Disetujui**: Rp300.000
- **Selisih Efisiensi**: Rp1.700.000 (Pencairan 15%)
Data asli pengajuan tetap utuh di tabel `submission_items`, sedangkan penyesuaian tersimpan di `analysis_items` lengkap dengan riwayat pengguna, waktu, dan alasan perubahan.

---

## 4. Struktur Database & Row Level Security (Supabase PostgreSQL)

| Tabel | Fungsi |
|---|---|
| `units` | Master data unit sekolah (SD IT, SMP IT, SMA IT, TK IT + unit dinamis) |
| `app_users` | Akun pengguna dan pemetaan peran (ADMIN, BENDAHARA, OPERATOR, PENGELUARAN) |
| `fiscal_years` | Master tahun anggaran operasional |
| `submissions` | Berkas pengajuan (nomor unik otomatis `PND/TAHUN/KODE/NO`, status, total) |
| `submission_items` | Rincian asli pengajuan unit beserta faktor perkalian multivolume JSONB |
| `analysis_items` | Rincian hasil review analisis bendahara (KEPT, MODIFIED, ADDED, REMOVED) |
| `disbursements` | Catatan realisasi transaksi pencairan bertahap (Transfer / Tunai) |
| `audit_logs` | Catatan jejak audit komprehensif seluruh aktivitas pengguna |
| `backup_logs` | Log histori backup, ukuran file, jumlah record, dan checksum SHA-256 |
| `fund_app_settings` | Pengaturan profil yayasan dan daftar kategori belanja |

---

## 5. Environment Variables

Untuk menjalankan di lingkungan lokal atau deployment Vercel, buat file `.env` (atau isi di Dashboard Vercel > Settings > Environment Variables):

```env
# URL Supabase Project Yayasan
VITE_SUPABASE_URL=https://[YOUR_SUPABASE_PROJECT_REF].supabase.co

# Supabase Public Anon Key (Client Side Key yang dilindungi RLS)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Catatan Keamanan**: Service Role Key database tidak pernah dimasukkan ke dalam source code frontend.

---

## 6. Prosedur Backup & Pemulihan Darurat

1. **Pencadangan (Backup)**:
   - Klik menu **Backup & Pemulihan** > **Backup Sekarang**.
   - Sistem mengumpulkan seluruh snapshot tabel, menyusun manifest integritas, menghitung hash SHA-256, mencatat entri log di database, dan otomatis mengunduh file `.json` terenkripsi ke penyimpanan terpisah administrator.
2. **Pemulihan (Restore)**:
   - Pilih file cadangan `.json`.
   - Sistem melakukan verifikasi struktur dan kecocokan Checksum SHA-256.
   - Sebelum data dipulihkan, sistem secara otomatis mengambil **Safety Snapshot** kondisi database terkini.
   - Setelah konfirmasi administrator, data dipulihkan secara aman dan tercatat dalam audit log.

---

## 7. Status Pengujian Skenario Wajib (12/12 Lulus)

- [x] **Skenario 1**: Operator SD membuat draft pengajuan dan mengunggah template Excel.
- [x] **Skenario 2**: Draft dapat diedit dan dihapus oleh operator sebelum diajukan resmi.
- [x] **Skenario 3**: Multivolume menghasilkan total yang akurat (Rp20.000 × 20 orang × 5 hari = Rp2.000.000).
- [x] **Skenario 4**: Bendahara menyesuaikan usulan konsumsi Rp2.000.000 menjadi Rp300.000 (3 hari × Rp100.000).
- [x] **Skenario 5**: Data usulan asli tetap utuh di `submission_items`, penyesuaian tercatat di `analysis_items`.
- [x] **Skenario 6**: Laporan disposisi menampilkan Diajukan Rp2.000.000, Disetujui Rp300.000, dan Selisih Rp1.700.000.
- [x] **Skenario 7**: Pencairan bertahap: Disetujui Rp1.000.000, Dicairkan Rp400.000, Sisa Belum Dicairkan Rp600.000.
- [x] **Skenario 8**: Agregasi Dashboard bebas dari *double-counting* multi-revisi / multi-disbursement.
- [x] **Skenario 9**: Pembatasan hak akses unit (Operator SD terisolasi dari berkas unit lain).
- [x] **Skenario 10**: Validasi file Excel mendeteksi baris salah dan menyajikan pratinjau sebelum impor.
- [x] **Skenario 11**: Backup tersimpan dengan manifest dan Checksum SHA-256 di penyimpanan terpisah.
- [x] **Skenario 12**: Data dapat dipulihkan dari backup dengan pre-restore safety snapshot.
- [x] **Skenario 13**: Tampilan responsif optimal di layar HP (navigasi bawah, kartu 2 kolom, tabel kartu).
- [x] **Skenario 14**: Fitur *Salin sebagai Gambar* menghasilkan gambar clipboard (dengan fallback unduh PNG).
- [x] **Skenario 15**: Seluruh perubahan tersimpan di Supabase Cloud dan sinkron antar-perangkat.
