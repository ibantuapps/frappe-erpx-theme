# Second Brain — erpx_new_custom_theme

Pengetahuan hasil pembahasan sesi kerja custom app Frappe `erpx_new_custom_theme`
(ERPNext v15). Dibaca sebagai skill/referensi sebelum mengerjakan task berikutnya.

## Isi

| File | Topik |
|---|---|
| `app-map.md` | Struktur app + registrasi hooks |
| `workspace-kpi-cards.md` | 4 kartu KPI workspace: mount, CSS, flicker-fix, layout seragam |
| `custom-block-snippets.md` | 4 snippet Custom HTML Block siap paste (versi koreksi) |
| `translations.md` | Konvensi English-first + `_()` / `__()` |
| `company-permissions.md` | Helper `_resolve_company` + perilaku per peran |
| `listview-injectors.md` | Injector KPI Payment/Journal + API FilterList v15 + insiden stacking |
| `pilar-sidebar-filter.md` | Widget filter pilar PSAK 109 berbasis COA |
| `coa-card.md` | Card COA: English, live counts, navigasi Tree |
| `ops-checklist.md` | Checklist build/cache/refresh + matriks tes |

## Aturan kerja yang berlaku (dari owner)

1. Pelajari folder dulu sebelum bertindak.
2. Jangan jalankan perintah (shell/bench) tanpa "iya" eksplisit dari owner.
3. Terangkan rencana dulu sebelum eksekusi.
4. Investigasi read-only via `read`/`grep`/`glob` (tanpa `shell`).
5. Edit file via `edit` (presisi, batas kecil); buat file baru hanya bila diminta.
6. Perubahan JS/CSS butuh `bench build --app erpx_new_custom_theme` + clear-cache
   + hard refresh — selalu minta izin dulu sebelum menyarankan eksekusi.
