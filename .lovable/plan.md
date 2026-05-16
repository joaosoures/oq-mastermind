## Goal
Eliminate the two high-severity dependency vulnerabilities flagged by the security scanner without breaking the Excel template download or the PDF viewer.

## Findings
- `xlsx@^0.18.5` (SheetJS) has prototype pollution + ReDoS advisories with **no fixed version on the npm registry**. It is only used in `src/pages/GerarOQs.tsx` to generate a template `.xlsx` file (`XLSX.writeFile`).
- `pdfjs-dist@4.4.168` is pinned and has known high-severity advisories. It's a transitive dep of `react-pdf` used in `src/components/MaterialPdfViewer.tsx`.

## Changes

### 1. Replace `xlsx` with `exceljs`
- Remove `xlsx` from `package.json`.
- Add `exceljs` (actively maintained, no current high advisories).
- Rewrite the template generation in `src/pages/GerarOQs.tsx`:
  - Build a workbook with `new ExcelJS.Workbook()`.
  - Create one worksheet, add the header row and example rows (same columns/content as today).
  - Apply the existing column widths.
  - Export with `workbook.xlsx.writeBuffer()` → `Blob` → trigger download via a temporary `<a>` element.
- No UI/UX change; the button still downloads `template_oq_med_v3.xlsx`.

### 2. Update `pdfjs-dist`
- Bump `pdfjs-dist` to `^4.10.38` (latest safe version compatible with the installed `react-pdf`).
- The `MaterialPdfViewer` already uses `pdfjs.version` in the worker URL, so the worker path auto-aligns with the new version.

### 3. Verify
- Run the dependency scanner again to confirm both findings are gone.
- Smoke-test in preview: open "Gerar OQs" → click "Baixar template" → confirm `.xlsx` downloads and opens; open a material PDF and confirm the viewer renders.

## Out of scope
- No changes to Excel **import** logic (already handled by a backend edge function, not by `xlsx` on the client).
- No visual/feature changes.
