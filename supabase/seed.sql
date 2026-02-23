-- =============================================
-- SEED DATA: 4 Layanan Selam Kawasan Lembeh
-- Jalankan di Supabase SQL Editor
-- =============================================

INSERT INTO services (name, type, price, dive_site_category, description, image_url)
VALUES
  (
    'Private Macro Photography Boat',
    'boat',
    1500000,
    'Muck',
    'Kapal khusus fotografer makro dengan ruang kamera luas, meja charging baterai, dan rasio guide 2:1. Dilengkapi tangga masuk air yang lebar untuk kenyamanan entry/exit dengan housing kamera besar. Rute eksklusif ke spot-spot Hairball, TK, dan Jahir.',
    'https://picsum.photos/seed/boat/800/600'
  ),
  (
    'Master Guide - Nudibranch Specialist',
    'instructor',
    750000,
    'Muck',
    'Guide lokal legendaris dengan pengalaman 15+ tahun di Selat Lembeh. Spesialisasi menemukan nudibranch langka, blue-ring octopus, dan hairy frogfish. Termasuk sesi review foto harian dan tips teknik pencahayaan underwater untuk hasil makro terbaik.',
    'https://picsum.photos/seed/guide/800/600'
  ),
  (
    'Mawali Wreck Dive Trip',
    'boat',
    1200000,
    'Wreck',
    'Eksplorasi bangkai kapal Jepang era Perang Dunia II di kedalaman 18-30 meter. Kapal karam ini kini menjadi reef buatan yang dihuni ribuan ikan dan soft coral warna-warni. Cocok untuk penyelam bersertifikat Advanced Open Water ke atas.',
    'https://picsum.photos/seed/wreck/800/600'
  ),
  (
    'Professional Macro Lens Rental',
    'gear',
    350000,
    'Muck',
    'Sewa lensa makro Canon 100mm f/2.8L IS USM lengkap dengan port dan adaptor housing Nauticam. Hasil tajam maksimal untuk subjek sekecil 5mm. Tersedia juga diopter tambahan +10 untuk super macro. Harga per hari, minimal sewa 2 hari.',
    'https://picsum.photos/seed/camera/800/600'
  );
