# Figma design notes — ERPx PSAK 109 statements

File key: `VsY9EnwjV3IlDdmkf8YX1e` (file "ERPx")

| Node | Frame |
| --- | --- |
| `925-986` | Laporan Perubahan Dana **Infak & Sedekah** - PSAK 109 |
| `925-2110` | Laporan Perubahan Dana **Zakat** - PSAK 109 |

Workflow: read `skill://figma/figma-design-to-code/SKILL.md` first, then
`get_design_context({fileKey, nodeId, clientLanguages: "javascript,html,css",
clientFrameworks: "unknown", skillNames: "resource:figma-design-to-code"})`.
The response includes the design screenshot, which is visible in context — use it as the
visual target. The response body is ~160 KB of Tailwind-ish JSX; read it in slices, don't
dump it.

## Layout top-to-bottom (from the Zakat frame)

1. **Page crumbs**: Accounting › Laporan Keuangan Syariah › Perubahan Dana Zakat (Bulanan)
2. **Title block**: `Laporan Perubahan Dana Zakat - PSAK 109`, navy `#11213b`, 24px, with a
   navy pill badge `INTERIM BULANAN MTD`; below it a green pill `PSAK 109 Terverifikasi`
   (`#ecfdf5` bg / `#a7f3d0` border / `#047857` text) with a 6px `#10b981` dot; subtitle in
   `#64748b` 12px.
3. **Actions, right side**: segmented fund switcher `Dana Zakat` (active, navy, white text) /
   `Dana Infak/Sedekah` / `Dana Amil` inside `#f1f5f9` + `#e2e8f0` border pill container,
   plus an outlined `Export Excel` button.
4. **Custom filter bar**: `Entitas / Kantor Cabang`, `Periode Akuntansi (Bulanan)`, date
   range `05 September 2026 - 30 September 2026`, `Tampilan Dana: Terikat + Tidak Terikat`,
   dark `Tampilkan Filter` button, and a `Cetak PDF` button. Below: chips
   `Entitas: -AA / Agen Amil`, `Standar: PSAK 109 & COA Agen Amil ZI…`,
   `Status Bukti: Final MTD Terkunci`, and a right-aligned `Buku Besar Terkunci: 30 Sep 2026,
   23:59:59 WIB` chip.
5. **4 KPI cards** (`SALDO AWAL DANA ZAKAT` (+ date, default sub-line "Saldo Bawaan …"),
   `TOTAL PENERIMAAN ZAKAT` with a green `+81,81% MoM`, `TOTAL PENYALURAN` with
   `efisiensi -9,36%`, `SALDO AKHIR DANA ZAKAT` with `Pertuda MTD +38,31%` and
   `Surplus IDR 26.150.000,00`). Mock values: opening 124.500.000, receipts 68.250.000,
   distributions (42.100.000), closing 150.650.000.
6. **Entity card**: `AGEN AMIL ZAKAT : A01 - LEMBAGA PENGELOLA ZISWAF` with a `COA: 41.1.5.AC.100`
   badge and green reconciliation lines (`Rekonsiliasi Bank: 100% Klop`, `Audit Trail COA-AA valid & Hash Match`).
7. **Letterhead**: `LAPORAN PERUBAHAN DANA ZAKAT BULANAN (INTERIM MTD)`, period line
   `Untuk Periode: 05 September 2026 s.d. 30 September 2026 (Dinyatakan Dalam Rupiah, Disajikan Secara Ringkas)`,
   and a blue pill `DANA ZAKAT (BS)`.
8. **Table** (~4 design columns, we ship 5): header
   `KODE & URAIAN REFERENSI (COA AGEN ZAKAT)` / `DANA ZAKAT TERIKAT (MUQAYYAD)` /
   `DANA ZAKAT TIDAK TERIKAT (MUTLAQ)` / `TOTAL DANA ZAKAT (MTD)`. Rows show the COA code as
   a mono pill then the account name; amounts right-aligned; negatives in parentheses.
   - `A. PENERIMAAN DANA ZAKAT (INFLOWS) — COA KELOMPOK 4100`
   - `B. PENYALURAN / PENGGUNAAN DANA ZAKAT (OUTFLOWS) — COA KELOMPOK 5100`, with a green
     pill `Beban Amil 12,5%` on the "Zakat Untuk Amil" row
   - `C. REKONSILIASI DANA (FUND RECONCILIATION) — COA AKUN EKUITAS DANA 3101`
   - `Surplus (Defisit) Dana Zakat Periode Berjalan (A - B)`
   - `3101 Saldo Awal Dana Zakat Per 01 September 2026 / Saldo Bawaan Agustus 2026 - AA`
   - `SALDO AKHIR DANA ZAKAT (Akun 3101 = Saldo Dana Zakat - AA)` + green pill
     `MATCH ✓ (Tie-Out: 3101 = 31.001.a)`
9. **3 operational cards**: `Kunci Mutasi Buku Besar Bulanan` (LOCKED, `Week-End Month-End Close: 30 Sep 2026, 23:59:59 WIB`),
   `Kepatuhan Hak Amil Bulanan` (green `12,5% Patuh ✓`, rows `Kaidah Amil Maks. 12,5% (PMK 68/2025)`,
   `Jumlah Hak Amil (MTD): 8.531.250 (12,48% Penerimaan)`), `Integrasi SIMBA BAZNAS v4.2`
   (Synced, `SIMBA-JKT-202609-2091`, `Hash: 9c8b4d21_f92`).
10. **Footer**: `© 2026 Agen Amil ZISWAF - Terafiliasi & Tersertifikasi SIMBA BAZNAS RI,
    Standar PSAK 109 & Pedoman Akuntansi Syariah.` + links `Panduan PSAK 109`,
    `Integrasi API SIMBA`, `Hubungi Helpdesk`.

## Mapping design → implementation

| Design | Implementation |
| --- | --- |
| fund switcher | `.infak-seg` buttons, 3 funds, writes the `fund` filter |
| KPI cards | `_inf_kpi_html` `.infak-kpi`/`.infak-card` (opening/receipts/distributions/closing) |
| MoM + efektivitas + surplus | computed in `_inf_render` from the previous month's run |
| entity card / letterhead | `_inf_letterhead_html` `.infak-letterhead` + `.infak-tag` |
| `Beban Amil 12,5%` pill | `.inf-badge`, appended by `_inf_cell_desc` on amil expense rows |
| `MATCH ✓ (Tie-Out …)` pill | **not implemented** (see SKILL.md §7) |
| 3 operational cards | `_inf_ctl_html` `.infak-ctl-box` (lock / amil compliance / external integration) |
| footer | `_inf_foot_html` `.infak-foot` |

## Colour / typography tokens used by the skin

Navy `#11213b`; slate text `#0f172a` / `#334155` / `#64748b`; borders `#e9eef4`, `#e2e8f0`,
`#cbd5e1`; section band `#f1f5f9`; closing band `#eef2f7`; green `#047857` on `#ecfdf5`
(border `#a7f3d0`); red for negatives `#b91c1c`; muted zero `#c3ccd8`; mono for COA codes
(`ui-monospace, SFMono-Regular, Menlo, monospace`). Inter is the design font; the desk keeps
its own font stack (`font-family: inherit`).

## Design text vs what we render (deliberate differences)

- Design says `DANA ZAKAT TERIKAT (MUQAYYAD)`; we render `Dana Zakat Terikat (Muqayyad)` and
  let CSS `text-transform: uppercase` do the shouting.
- Design shows `COA KELOMPOK 4100`; we print the **actual** COA prefix from the profile
  (`41`), because prod's chart uses 2-digit group codes, not `4100`.
- Design merges the code and the description under one header; our report keeps a separate
  `Kode COA` column (5 columns), which the user already accepted.
- Design's page subtitle mentions "periode bulanan"; our `T.pageSub` is a fund-neutral
  PSAK 109 sentence.
