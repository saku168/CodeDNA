export interface FileInfo {
  path: string;
  name: string;
  lines: number;
  imports: string[];
}

export interface FileConnection {
  from: string;
  to: string;
}

export interface AnalysisResult {
  files: FileInfo[];
  connections: FileConnection[];
  totalLines: number;
  largeFiles: FileInfo[];
}

const SOURCE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".java", ".go", ".rs", ".php", ".rb",
  ".vue", ".svelte",
]);

const IGNORED_PARTS = new Set([
  "node_modules", "dist", "build", ".git", ".next",
  "coverage", "vendor", "__pycache__",
]);

const MAX_GITHUB_FILES = 300;
const MAX_FILE_BYTES = 300_000;

function extensionOf(path: string): string {
  const name = path.split("/").pop() ?? "";
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot).toLowerCase() : "";
}

function isSourceFile(path: string): boolean {
  const parts = path.split("/");
  return SOURCE_EXTENSIONS.has(extensionOf(path)) &&
    !parts.some((part) => IGNORED_PARTS.has(part));
}

function normalizePath(path: string): string {
  const output: string[] = [];
  for (const part of path.replace(/\\/g, "/").split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") output.pop();
    else output.push(part);
  }
  return output.join("/");
}

function getFilePath(file: File): string {
  const withRelativePath = file as File & { webkitRelativePath?: string };
  return normalizePath(withRelativePath.webkitRelativePath || file.name);
}

function extractImportSpecifiers(source: string): string[] {
  const matches = new Set<string>();
  const patterns = [
    /\bimport\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bexport\s+[\s\S]*?\s+from\s+["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]?.startsWith(".")) matches.add(match[1]);
    }
  }
  return Array.from(matches);
}

function resolveLocalImport(fromPath: string, specifier: string, knownPaths: Set<string>): string | null {
  const base = normalizePath(fromPath.split("/").slice(0, -1).concat(specifier).join("/"));
  const candidates = [
    base,
    ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".vue", ".svelte"].map((ext) => base + ext),
    ...[".ts", ".tsx", ".js", ".jsx"].map((ext) => base + "/index" + ext),
  ];
  return candidates.find((candidate) => knownPaths.has(candidate)) ?? null;
}

export async function analyzeFiles(inputFiles: File[]): Promise<AnalysisResult> {
  const selected = inputFiles.filter((file) => isSourceFile(getFilePath(file)));
  if (selected.length === 0) {
    throw new Error("No supported source files found. Select a project containing files such as .ts, .tsx, .js, .jsx or .py.");
  }

  const records = await Promise.all(selected.map(async (file) => {
    const path = getFilePath(file);
    const source = await file.text();
    return {
      path,
      name: path.split("/").pop() || file.name,
      lines: source.length === 0 ? 0 : source.split(/\r\n|\r|\n/).length,
      specifiers: extractImportSpecifiers(source),
    };
  }));

  const knownPaths = new Set(records.map((record) => record.path));
  const files: FileInfo[] = records.map(({ path, name, lines, specifiers }) => ({
    path,
    name,
    lines,
    imports: specifiers
      .map((specifier) => resolveLocalImport(path, specifier, knownPaths))
      .filter((resolved): resolved is string => resolved !== null),
  }));

  const connections = files.flatMap((file) =>
    file.imports.map((target) => ({ from: file.path, to: target }))
  );

  return {
    files,
    connections,
    totalLines: files.reduce((total, file) => total + file.lines, 0),
    largeFiles: files.filter((file) => file.lines > 300),
  };
}

export async function fetchGitHubFiles(repositoryUrl: string): Promise<File[]> {
  let parsed: URL;
  try {
    parsed = new URL(repositoryUrl.trim());
  } catch {
    throw new Error("Enter a valid public GitHub repository URL.");
  }

  if (parsed.hostname !== "github.com") {
    throw new Error("Only public repositories hosted on github.com are supported.");
  }

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error("Use a repository URL like https://github.com/owner/repository.");
  }

  const [owner, repository] = segments;
  const repoName = repository.replace(/\.git$/i, "");
  const apiBase = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}`;

  const repoResponse = await fetch(apiBase, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!repoResponse.ok) {
    throw new Error(repoResponse.status === 404
      ? "Repository not found or not public."
      : `GitHub could not load this repository (HTTP ${repoResponse.status}).`);
  }

  const repoData = await repoResponse.json() as { default_branch?: string };
  const branch = segments[2] === "tree" && segments[3]
    ? segments[3]
    : repoData.default_branch;

  if (!branch) throw new Error("Could not determine the repository's default branch.");

  const treeResponse = await fetch(
    `${apiBase}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    { headers: { Accept: "application/vnd.github+json" } },
  );
  if (!treeResponse.ok) {
    throw new Error(`Could not read the repository file tree (HTTP ${treeResponse.status}).`);
  }

  const treeData = await treeResponse.json() as {
    truncated?: boolean;
    tree?: Array<{ path: string; type: string; size?: number }>;
  };

  const prefix = segments[2] === "tree" && segments.length > 4
    ? segments.slice(4).join("/") + "/"
    : "";

  const sourceEntries = (treeData.tree ?? []).filter((entry) =>
    entry.type === "blob" &&
    entry.path.startsWith(prefix) &&
    isSourceFile(entry.path) &&
    (entry.size ?? 0) <= MAX_FILE_BYTES
  );

  if (sourceEntries.length === 0) {
    throw new Error("No supported source files were found in this repository or selected folder.");
  }
  if (sourceEntries.length > MAX_GITHUB_FILES) {
    throw new Error(`This repository contains more than ${MAX_GITHUB_FILES} supported files. Please analyze a smaller project or folder.`);
  }
  if (treeData.truncated) {
    throw new Error("GitHub returned an incomplete file list for this repository. Try analyzing a smaller folder.");
  }

  const files: File[] = [];
  for (const entry of sourceEntries) {
    const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/${encodeURIComponent(branch)}/${entry.path.split("/").map(encodeURIComponent).join("/")}`;
    const response = await fetch(rawUrl);
    if (!response.ok) continue;

    const source = await response.text();
    const fileName = entry.path.split("/").pop() || "source";
    const file = new File([source], fileName, { type: "text/plain" });
    Object.defineProperty(file, "webkitRelativePath", { value: entry.path });
    files.push(file);
  }

  if (files.length === 0) {
    throw new Error("The source files could not be downloaded from GitHub.");
  }
  return files;
}
