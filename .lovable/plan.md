I will improve the "Aulas" tab in the `AdminGerarAulas` page to be more organized, visually consistent with the rest of the app, and better highlight generation statistics.

### Technical Details
- **Data Model**: Update the `Aula` type to include the `tier` field from the `materiais` table.
- **Sorting Logic**: Implement a sorting function for the aulas list:
  1. Extract leading numbers (e.g., "01.", "1.") and sort numerically.
  2. Treat names without leading numbers as "Extras" and sort them alphabetically at the end.
- **UI Refactoring**:
  - Replace the simple list in the "Aulas" tab with a card-based layout.
  - Apply tier-specific styling (colors, backgrounds, icons) matching the `Materiais.tsx` page.
  - Add highly visible colored badges/chips for each OQ type:
    - **ABCDE**: Blue/Indigo
    - **LACUNA**: Amber/Orange
    - **OQ Falta**: Rose/Red
    - **Total**: Emerald/Green
  - Enhance the "Selecionar" button with active states and the "Link" button with a clear "PDF" label.
  - Reorganize the "Estatísticas" tab if necessary to keep it clean, but focus on the "Aulas" tab for primary selection.

### User Interface Design
- **Tier 1 (High Incidence)**: Red border/accent.
- **Tier 2 (Medium)**: Amber border/accent.
- **Tier 3 (Low)**: Blue border/accent.
- **Stats**: Each aula card will display a row of colored chips showing how many OQs of each type currently exist.
