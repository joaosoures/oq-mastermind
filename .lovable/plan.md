I will refine the AI generation prompts and the validation logic to strictly align with the "perfect" OQ examples you provided.

### Prompt Refinements (ia_prompts)
- **Modo LACUNA**:
    - Remove the strict requirement for the `[___]` marker. The system will now allow direct clinical statements or questions ending in a colon `:`, matching your "perfect" example.
    - Update the instruction to focus on "Memorização Direta" of clinical terms.
- **Modo OQ FALTA**:
    - Remove the instruction to append "(identifique o que falta)" to the command. The UI already handles the visual indication of the missing item.
    - Ensure the command follows the pattern "List/Criteria Name:".
- **Modo ABCDE**:
    - Lower the minimum character limit for scenarios to allow for the concise clinical cases you prefer (e.g., 100 characters instead of 250).
    - Maintain the focus on semiology and diagnostic/conduct reasoning.

### Edge Function Updates (gerar-oqs-aula)
- **Validation**: Update the `validLacuna` function to no longer reject questions without the `[___]` marker.
- **Formatting**: Ensure that all generated questions preserve the clinical tone and ending punctuation (colons) seen in your examples.

### Data Mapping
- I will verify that the mapping from the AI's JSON output to the `cards` table columns (`comando`, `info_1..5`, `var_1..5`, `alternativas`) remains consistent with the database structure of your perfect examples.

Technical Details:
- Files to modify: `supabase/functions/gerar-oqs-aula/index.ts`.
- Database updates: A migration to update the `prompt` column in the `ia_prompts` table for the keys `gerar_lacuna`, `gerar_oq_falta`, and `gerar_abcde`.
