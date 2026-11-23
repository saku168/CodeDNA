# CodeDNA

**Visualize your codebase. Understand your architecture.**

CodeDNA is a browser-based codebase explorer. Select a local project folder or enter a public GitHub repository URL to inspect its source files, explore detected dependencies, and get a lightweight structural overview.

> **Status:** Early development. The current analyzer is intentionally lightweight; see [Limitations](#limitations) before relying on its results.

## What works today

- **Local project scan** — select a folder from your device and analyze supported source files in the browser.
- **Public GitHub scan** — enter a repository URL (or a folder URL on a branch) to fetch and analyze its source files.
- **Project overview** — view file counts, total lines, file-type distribution, and frequently imported files.
- **File explorer** — search analyzed files by path and inspect their detected local imports.
- **Dependency graph** — explore the relationships detected between files.
- **Code health overview** — see simple structural indicators such as large files and files without detected connections.

## Quick start

### Requirements

- Node.js 20 or newer
- npm

### Run locally

```bash
git clone https://github.com/saku168/CodeDNA.git
cd CodeDNA
npm install
npm run dev
```

Open the local URL printed by Vite in your browser.

### Production build

```bash
npm run build
npm run preview
```

The build runs the TypeScript project checks before creating the Vite production bundle.

## How to use it

1. Start CodeDNA with `npm run dev`.
2. Choose **Scan local folder** and select a project folder, or enter a **public GitHub repository URL**.
3. Open **Overview** for project metrics.
4. Use **File Explorer** to search files, **Dependencies** to inspect the graph, and **Code Health** for structural hints.

For GitHub scans, repositories must be public and hosted on `github.com`.

## Supported files and current limits

The scanner currently includes files with these extensions:

`.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.py`, `.java`, `.go`, `.rs`, `.php`, `.rb`, `.vue`, and `.svelte`.

The current dependency resolver recognizes **relative JavaScript/TypeScript-style imports** (including `import`, `export ... from`, dynamic `import()`, and `require()`). Other listed file types can appear in file and line-count statistics, but their language-specific import syntax is not yet resolved. Package aliases, workspace configuration, and non-relative/module-package imports are not mapped.

GitHub scans are currently limited to 300 supported files, with a maximum individual file size of 300 KB. Generated and dependency directories such as `node_modules`, `dist`, `build`, `.git`, `.next`, `coverage`, and `vendor` are excluded.

The Code Health score is a simple heuristic based on file size and detected connections. It is **not** a measure of security, correctness, maintainability, or overall software quality. A file with no detected connection may simply be an entry point or use imports the current analyzer does not understand.

## Privacy

Local folder analysis happens in your browser; the selected source files are not sent to a CodeDNA server. When you use the GitHub option, your browser requests repository metadata and source files from GitHub's public API and raw file hosting. Do not select or analyze source code you are not authorized to access.

## Roadmap

- [ ] Add automated tests for file discovery and dependency resolution.
- [ ] Improve language-aware dependency detection.
- [ ] Handle branch names and repository subfolders more robustly.
- [ ] Improve graph layout and large-project performance.
- [ ] Add a real example project and verified screenshots.
- [ ] Publish a first stable release.

## Contributing

Bug reports and focused pull requests are welcome.

1. Check [existing issues](https://github.com/saku168/CodeDNA/issues) before starting substantial work.
2. Include clear reproduction steps for bug reports.
3. Explain what changed and how you tested it in pull requests.

Never include credentials, private source code, or other sensitive project data in public issues.

## License

No license has been added yet. Until a license is published, do not assume that the code may be reused, redistributed, or modified under an open-source license.
