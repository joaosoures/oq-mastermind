I will implement a customization system for the OQ study console, allowing users to reorder controls (Scroll, Hint, Confirm) and choose between different visual styles.

### User Interface Changes
- **Settings Page**: Add a new "Painel de Comando" section in `src/pages/Configuracoes.tsx`.
- **Command Panel Modal**: Create a new component `src/components/console/ConsoleCustomizer.tsx` that opens when the user clicks "Configurar Painel de Comando".
- **Drag-and-Drop Interface**: The modal will feature a preview of the console where users can drag and drop components to Left, Center, and Right slots.
- **Visual Variations**: Provide 4 styles for each component (Scroll, Hint, Confirm), including "Standard", "Minimalist", "High-Contrast", and "Industrial".
- **Touch-to-Scroll Option**: Add a toggle to disable the ScrollWheel in favor of direct screen touch interaction.

### State & Logic Changes
- **Settings Context**: Update `src/contexts/SettingsContext.tsx` to store:
  - `consoleLayout`: An array specifying which component goes to which slot (e.g., `['scroll', 'hint', 'confirm']`).
  - `scrollStyle`, `hintStyle`, `confirmStyle`: String IDs for the chosen visual variations.
  - `useNativeScroll`: Boolean to toggle the ScrollWheel visibility.
- **Study Page**: Update `src/pages/Estudo.tsx` to dynamically render the console based on the user's `consoleLayout` and style preferences.

### Technical Details
- Use `dnd-kit` or a simpler drag-and-drop solution (like native `onDragOver`/`onDrop`) for the layout configuration.
- Add new visual variants as props to `ScrollWheel`, `NeonHintLamp`, and `TactileButton` components.
- Ensure responsive design, especially for mobile users who might prefer "left-handed" (Scroll on the right) or "one-thumb" layouts.

### Plan Summary
Add a "Painel de Comando" customization area in Settings, allowing users to drag and drop console elements to different positions, choose from 4 visual styles per button, and toggle touch-based scrolling.
