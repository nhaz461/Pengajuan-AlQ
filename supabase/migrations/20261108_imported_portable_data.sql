-- ==============================================================================
-- MIGRATION: DATA MASTER SSH & PENGAJUAN DARI SISTEM KEUANGAN PORTABLE
-- ==============================================================================

-- 1. INSERT MASTER SSH (33 ITEMS RESMI YAYASAN 2026)
INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-ATK-001', 'ATK', 'Kertas HVS A4 75 gram', 'Rim', 65000, '2026', 'Standar kertas administrasi madrasah')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-ATK-002', 'ATK', 'Kertas HVS F4 75 gram', 'Rim', 70000, '2026', 'Kertas folio ujian & persuratan')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-ATK-003', 'ATK', 'Spidol Whiteboard Snowman Hitam/Biru', 'Lusin', 110000, '2026', 'Spidol ruang kelas isi 12 pcs')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-ATK-004', 'ATK', 'Isi Ulang Tinta Spidol Whiteboard', 'Botol', 25000, '2026', 'Refill botol tinta spidol')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-ATK-005', 'ATK', 'Tinta Printer Epson Original', 'Botol', 100000, '2026', 'Tinta asli Epson L-series (B/C/M/Y)')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-ATK-006', 'ATK', 'Map Folio Plastik Kancing (Bening)', 'Lusin', 45000, '2026', 'Map arsip berkas santri')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-ATK-007', 'ATK', 'Buku Tulis Santri Sinar Dunia 58 lembar', 'Pak', 42000, '2026', '1 pak isi 10 buku')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-ATK-008', 'ATK', 'Pulpen Standard AE7 Hitam', 'Kotak', 35000, '2026', '1 kotak isi 12 pcs')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-ATK-009', 'ATK', 'Klip Kertas Paper Clip No. 3', 'Kotak', 5000, '2026', 'Kotak kecil penjepit kertas')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-ATK-010', 'ATK', 'Stapler Joyko HD-10', 'Buah', 18000, '2026', 'Alat hecter stapler')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-ATK-011', 'ATK', 'Stopmap Kertas Folio', 'Pak', 35000, '2026', '1 pak isi 50 lembar stopmap')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-ATK-012', 'ATK', 'Penggandaan Soal / Fotokopi Naskah Ujian', 'Lembar', 250, '2026', 'Standar fotokopi/penggandaan naskah ujian STS/SAS')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-HON-001', 'Honorarium', 'Honor Pengawas Ujian per Sesi', 'Orang/Sesi', 30000, '2026', 'Maksimal 2 sesi pengawas per hari')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-HON-002', 'Honorarium', 'Honor Pembuat Naskah Soal Ujian', 'Mata Pelajaran', 75000, '2026', 'Termasuk master soal & kunci jawaban')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-HON-003', 'Honorarium', 'Honor Korektor Soal Ujian', 'Siswa/MP', 1000, '2026', 'Honor koreksi naskah jawaban siswa')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-HON-004', 'Honorarium', 'Honor Guru Piket Harian', 'Hari', 35000, '2026', 'Petugas piket harian madrasah')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-HON-005', 'Honorarium', 'Honor Penceramah / Mubaligh Kajian Akbar', 'Kegiatan', 1000000, '2026', 'Kajian bulanan/PHBI Yayasan')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-HON-006', 'Kepanitiaan', 'Honor Panitia Ujian (Ketua)', 'Kegiatan', 500000, '2026', 'Penanggung jawab panitia ujian')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-HON-007', 'Kepanitiaan', 'Honor Panitia Ujian (Sekretaris/Bendahara)', 'Kegiatan', 400000, '2026', 'Pengelola administrasi ujian')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-HON-008', 'Kepanitiaan', 'Honor Panitia Ujian (Anggota)', 'Kegiatan', 300000, '2026', 'Anggota pelaksana teknis ujian')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-HON-009', 'Upah', 'Upah Lembur Panitia', 'Hari', 50000, '2026', 'Uang lembur petugas persiapan ujian')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-KNS-001', 'Konsumsi', 'Snack Rapat / Pertemuan (3 Kue + Air Cup)', 'Kotak', 15000, '2026', 'Kue basah / jajanan pasar rapat')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-KNS-002', 'Konsumsi', 'Nasi Kotak Makan Siang Standar (Ayam/Ikan + Sayur)', 'Kotak', 25000, '2026', 'Makan siang panitia ujian & pengawas')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-KNS-003', 'Konsumsi', 'Nasi Kotak Tamu Khusus / VIP', 'Kotak', 35000, '2026', 'Lauk daging/ayam komplit VIP')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-KNS-004', 'Konsumsi', 'Air Mineral Galon (Isi Ulang Aqua)', 'Galon', 20000, '2026', 'Galon kantor & ruang ujian')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-KNS-005', 'Konsumsi', 'Air Mineral Gelas 220ml (1 Dus 48 Cup)', 'Dus', 28000, '2026', 'Dus air cup kegiatan santri')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-KNS-006', 'Konsumsi', 'Air Mineral Botol 600ml (1 Dus 24 Botol)', 'Dus', 48000, '2026', 'Botol sedang meja pengawas/sidang')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-KNS-007', 'Konsumsi', 'Konsumsi Lembur Panitia', 'Orang/Hari', 20000, '2026', 'Konsumsi makan malam lembur')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-KBR-001', 'Kebersihan', 'Sapu Lantai Nilon Super', 'Buah', 25000, '2026', 'Sapu kelas dan asrama')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-KBR-002', 'Kebersihan', 'Cairan Pembersih Lantai Wipol/SuperPell 750ml', 'Pouch', 16000, '2026', 'Pouch isi ulang pembersih lantai')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-MNT-001', 'Pemeliharaan', 'Lampu LED Philips 12 Watt Putih', 'Buah', 45000, '2026', 'Hemat energi penerangan ruang kelas')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-OPS-001', 'Operasional', 'Biaya Langganan Internet IndiHome Madrasah', 'Bulan', 450000, '2026', 'Paket internet fiber madrasah')
ON CONFLICT DO NOTHING;

INSERT INTO public.master_ssh (kode_ssh, kategori, nama_barang, satuan, harga_standar, tahun_berlaku, keterangan)
VALUES ('SSH-OPS-002', 'Operasional', 'Fotokopi Naskah / Dokumen Administrasi', 'Lembar', 300, '2026', 'Hitam putih A4/F4')
ON CONFLICT DO NOTHING;

