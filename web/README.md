# RockTune Web — Loadout Builder for Windows Gaming

A modern, interactive web application that generates personalized PowerShell scripts to optimize Windows for gaming. Built with Node, Vite, Svelte 5, and TypeScript.

## 🎯 Project Goals

**RockTune** helps gamers create custom Windows optimization scripts by:

- **Hardware-aware optimization** — Detects CPU (AMD X3D, AMD, Intel) and GPU (NVIDIA, AMD, Intel) to apply relevant tweaks
- **Software installation** — Integrates with `winget` to install gaming essentials (Steam, Discord, OBS, etc.)
- **Performance tuning** — Applies registry tweaks, power plans, timer resolution, and other gaming-focused optimizations
- **Gaming compatibility check** — Finds and restores Xbox services, Game Bar and Store parts that a cleanup tool turned off
- **Clean Windows first** — General cleanup (preinstalled apps, telemetry, ads) is handed to [WinUtil](https://github.com/ChrisTitusTech/winutil) and [Win11Debloat](https://github.com/Raphire/Win11Debloat). The site shows both commands; run one, then RockTune
- **Rig Check** — A read-only one-liner (`irm https://rocktune.pedroferrari.com/check.ps1 | iex`) scores the PC's setup: RAM below rated speed, monitor below max refresh, display cable in the motherboard, old GPU driver, games on a hard drive. The site shows it as step 1
- **Anti-cheat badges** — Options that stop Vanguard, FACEIT and other kernel anti-cheats from starting carry a badge on their card, and the Forge step warns when the loadout contains any
- **User-friendly interface** — Visual card-based selection with loadouts (Pro Gamer, Gamer, Streamer, Benchmarker)
- **Transparency & review** — Preflight checks, audit panel, and diff/preview before export

## 🛠️ Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) 26 with [pnpm](https://pnpm.io/)
- **Build Tool**: [Vite](https://vitejs.dev/) — Fast development and production builds
- **UI**: [Svelte 5](https://svelte.dev/) — Component-based UI with runes
- **Language**: TypeScript — Type-safe code with strict mode
- **Schema validation**: [Zod](https://zod.dev/) — Runtime validation for catalog/profile data
- **Linting/Formatting**: [Biome](https://biomejs.dev/) — Fast formatter and linter
- **Tooling**: Knip (dead code), PurgeCSS (style audits)
- **Key npm deps**:
  - `diff` (npm) — For code diff visualization in audit panel

## 🌐 Browser Support

- Current Chrome, Edge, Firefox and Safari. The hardware help panel uses CSS anchor positioning where available and falls back to a fixed position elsewhere.

## 📁 Project Structure

```
web/
├── src/
│   ├── main.ts              # Entry point, initializes app
│   ├── RootApp.svelte       # App shell + layout
│   ├── lib/                 # State, data, script generation
│   │   ├── state.svelte.ts  # Svelte runes store
│   │   ├── optimizations.ts # Optimization data
│   │   ├── presets.ts       # Preset logic
│   │   └── types.ts         # Shared types
│   ├── components/          # Svelte UI + scoped styles
│   ├── styles/              # Tokens, layout, utilities
│   ├── schemas.ts           # Zod schemas
│   └── utils/               # Download, checksum, helpers
├── scripts/                 # Build + audit scripts (purgecss, catalog audit)
├── public/                  # catalog + icons
├── index.html               # Main HTML entry point
├── style.css                # Global styles + layer imports
├── package.json             # Dependencies & scripts
├── vite.config.ts           # Vite build configuration
├── biome.json               # Biome linter/formatter config
└── knip.json                # Dead-code detection config
```

## 🚀 Getting Started

### Prerequisites

- **Node.js 26+** (the version is in `.node-version`)
- **pnpm 12+**

### Development

1. **Start the dev server**:
   ```bash
   cd web
   pnpm install
   pnpm dev
   ```

2. **Open in browser**: http://localhost:9010/

3. **Make changes** — Vite will hot-reload automatically

### Available Tasks

```bash
# Development server
pnpm dev

# Typecheck + Svelte diagnostics
pnpm check

# Lint / format
pnpm lint
pnpm format

# Dead-code + unused exports
pnpm knip

# CSS audit (unused selectors)
pnpm purge:report

# Full validation (lint + check + knip + test + build)
pnpm validate

# Production build / preview
pnpm build
pnpm preview

# Tests
pnpm test
```

## 🧰 Tooling Notes

- Tests use Node's built-in test runner. `tsx` runs the TypeScript test files and the audit scripts.

## 🏗️ Build & Deployment

### Local Build

```bash
pnpm build
```

Output goes to `web/dist/` — static files ready for deployment.

### Netlify Deployment

The project is configured for Netlify in `netlify.toml` at the project root:

- **Base directory**: `web`
- **Build command**: `pnpm check && pnpm build`
- **Publish directory**: `web/dist`
- **Node version**: 26 (`NODE_VERSION`), pnpm version from `PNPM_VERSION`

Netlify installs the dependencies with pnpm, runs the build, and deploys the `dist` folder.

## 🎨 Features

### Software Selection

- **Card-based UI** — Hover to see description and action
- **Category filtering** — Filter by launcher, gaming, streaming, utility, etc.
- **Search** — Real-time search across names, descriptions, categories
- **Grid/List view** — Toggle between card grid and compact list
- **Presets** — Quick-load configurations:
  - **Pro Gamer** — Maximum FPS, all performance opts
  - **Streaming** — Balanced for gaming + OBS
  - **Balanced** — Safe defaults for most users
  - **Minimal** — Essential only

### Script Generation

- **Hardware-aware** — Adapts optimizations based on CPU/GPU selection
- **Live preview** — See generated PowerShell script in real-time
- **Diff view** — Compare script changes as you modify selections
- **Preflight checks** — Warns about missing drivers/settings before download
- **Download** — Export as `.ps1` file ready to run

### Profile Management

- **Save profiles** — Export your configuration as JSON
- **Load profiles** — Import saved configurations
- **Version tracking** — Profiles include version metadata

### Transparency & Trust

- **Audit panel** — Live diff view of the script as you toggle options
- **Checksum** — SHA256 hash for verifying downloads
- **No tracking** — Client-only generation with explicit transparency cues

## 🔧 Architecture Decisions

### Why Vite?

- **Fast HMR** — Instant hot module replacement
- **Optimized builds** — Tree-shaking, code splitting, minification
- **TypeScript support** — Native TS compilation without extra config

### Why Svelte 5?

- **Component clarity** — Keeps UI structure close to styles and behavior
- **Reactivity** — Runes-based state (`$state`, `$derived`) for predictable updates
- **Lean runtime** — Small runtime overhead with fast renders

### Why TypeScript?

- **Type safety** — Catches errors at compile time
- **Better DX** — Autocomplete, refactoring, documentation
- **Maintainability** — Self-documenting code with types

## 🐛 Troubleshooting

### Port Already in Use

If port 9010 is taken, Vite will automatically use the next available port.

### Build Errors

1. **Check Node version**: `node --version` (should be 26+)
2. **Reinstall dependencies**: `rm -rf node_modules && pnpm install`

## 📝 Code Style

- **Formatting**: Biome (2 spaces, single quotes, semicolons as needed)
- **Linting**: Biome recommended rules
- **TypeScript**: Strict mode enabled
- **Naming**: PascalCase for types/interfaces, camelCase for functions/variables

Run `pnpm format` before committing.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `pnpm validate`
5. Test locally with `pnpm dev`
6. Submit a pull request

## 📄 License

See [LICENSE](../LICENSE) in the project root.

## 🔗 Links

- **Repository**: https://github.com/thepedroferrari/rocktune
- **Main Script**: See `gaming-pc-setup.ps1` in project root
- **Documentation**: See `README.md` in project root

---

**Built with ❤️ for the gaming community**
