# Wanderling Project Standards & Guardrails

Every contributor and subagent MUST obey these standards without exception:

1. **Strictly Relative Subpath Asset Discipline (`base: './'`):**
   - Vite builds with `base: './'`.
   - Never use root-relative `/assets/...`, `/icons/...`, `/manifest.json`, or `/sw.js` URLs anywhere in `index.html`, `public/manifest.json`, `public/sw.js`, or `src/**`. Always use `./...`.
2. **100% Offline Self-Contained Bundle:**
   - Zero external image, audio, icon, or Google Font CDN hotlinks (`https://...`) in runtime application code. Everything renders from local React/SVG components, Web Audio synthesis, and bundled assets.
3. **Zero Unicode Country Flag Emojis (`U+1F1E6`–`U+1F1FF`):**
   - Never write country flag emojis anywhere in `src/`, `public/`, `index.html`, `tests/`, or `README.md`. Use `FlagIcon` (`src/art/FlagIcon.tsx`).
4. **Kid-Safe, Encouraging Pedagogical Tone:**
   - Warm, enthusiastic, non-punitive feedback everywhere. Zero harsh red error buzzers or adult alcohol/bar references in dialogue.
   - Zero `"Coming Soon"`, `"Placeholder"`, `"TODO"`, or dead/unwired UI controls.
5. **Strict Exclusive File Ownership:**
   - Only edit files within your assigned directory ownership. Never alter `src/types/contracts.ts` from a Phase 2 worker branch—escalate to Coordinator if a shared type needs extension.
6. **Windows Environment & Worktree Junction Rules:**
   - Prepend `$env:PATH = "C:\Users\alexg\AppData\Local\Programs\nodejs;$env:PATH"` before invoking `node`, `npm`, or `npx` in PowerShell.
   - In `workspace: "share"` worktrees, link `node_modules` via `if (-not (Test-Path .\node_modules)) { cmd /c mklink /J node_modules C:\learning_languages\node_modules }` before running `npx tsc --noEmit` or `vitest`.
7. **Model-Agnostic Configuration Rule:**
   - Never hardcode model version numbers or release names in `.agents/**`, source comments, configs, or swarm briefs.
