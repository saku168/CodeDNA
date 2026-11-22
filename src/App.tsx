
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeMouseHandler,
} from "reactflow";
import "reactflow/dist/style.css";

import { useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  Code2,
  FileCode2,
  Folder,
  GitBranch,
  Network,
  Sparkles,
  Upload,
  LoaderCircle,
  Github,
  LayoutDashboard,
  Search,
  CheckCircle2,
  AlertCircle,
  Files,
  X,
  BarChart3,
  TrendingUp,
  HeartPulse,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";

import {
  analyzeFiles,
  fetchGitHubFiles,
  type AnalysisResult,
  type FileInfo,
} from "./analyzer";

type Page = "Overview" | "File Explorer" | "Dependencies" | "Code Health";

function getFileColor(path: string): string {
  const extension = path.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "tsx": return "#a78bfa";
    case "ts": return "#60a5fa";
    case "jsx": return "#fbbf24";
    case "js": return "#4ade80";
    default: return "#94a3b8";
  }
}

function getFileType(path: string): string {
  return path.split(".").pop()?.toUpperCase() || "FILE";
}

export default function App() {
  const [active, setActive] = useState<Page>("Overview");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);

  async function runAnalysis(files: File[]) {
    setLoading(true);
    setError("");
    setSelectedFile(null);

    try {
      const analysis = await analyzeFiles(files);
      setResult(analysis);
      setActive("Overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  async function scanFolder(files: FileList | null) {
    if (!files || files.length === 0) return;
    await runAnalysis(Array.from(files));
  }

  async function scanGitHub() {
    if (!githubUrl.trim()) {
      setError("Please enter a GitHub repository URL.");
      return;
    }

    setLoading(true);
    setError("");
    setSelectedFile(null);

    try {
      const files = await fetchGitHubFiles(githubUrl);
      const analysis = await analyzeFiles(files);
      setResult(analysis);
      setActive("Overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "GitHub analysis failed.");
    } finally {
      setLoading(false);
    }
  }

  const graph = useMemo(() => {
    if (!result) return { nodes: [] as Node[], edges: [] as Edge[] };

    const folders = Array.from(
      new Set(result.files.map((file) => {
        const parts = file.path.split("/");
        return parts.length > 1 ? parts.slice(0, -1).join("/") : "Root";
      }))
    ).sort();

    const nodes: Node[] = result.files.map((file) => {
      const parts = file.path.split("/");
      const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "Root";
      const folderIndex = folders.indexOf(folder);

      const filesInFolder = result.files.filter((item) => {
        const itemParts = item.path.split("/");
        const itemFolder = itemParts.length > 1
          ? itemParts.slice(0, -1).join("/")
          : "Root";
        return itemFolder === folder;
      });

      const fileIndex = filesInFolder.findIndex((item) => item.path === file.path);
      const color = getFileColor(file.path);
      const isSelected = selectedFile?.path === file.path;

      return {
        id: file.path,
        position: { x: folderIndex * 310, y: fileIndex * 145 },
        data: {
          label: (
            <div className="graph-node">
              <FileCode2 size={18} color={color} />
              <strong>{file.name}</strong>
              <span>{file.lines} lines</span>
            </div>
          ),
        },
        style: {
          background: "#171b35",
          color: "#f4f4fb",
          border: isSelected ? `2px solid ${color}` : `1px solid ${color}`,
          borderRadius: "12px",
          padding: "12px",
          width: 190,
          boxShadow: isSelected ? `0 0 18px ${color}55` : "0 4px 18px rgba(0,0,0,0.2)",
        },
      };
    });

    const edges: Edge[] = result.connections.map((connection, index) => ({
      id: `edge-${index}`,
      source: connection.from,
      target: connection.to,
      animated: true,
      style: { stroke: "#a78bfa", strokeWidth: 2 },
    }));

    return { nodes, edges };
  }, [result, selectedFile]);

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    const file = result?.files.find((item) => item.path === node.id);
    setSelectedFile(file ?? null);
  };

  const filteredFiles = result?.files.filter((file) =>
    file.path.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const fileTypeStats = useMemo(() => {
    if (!result) return [];

    const counts: Record<string, number> = {};

    result.files.forEach((file) => {
      const type = getFileType(file.path);
      counts[type] = (counts[type] || 0) + 1;
    });

    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [result]);

  const mostImportedFiles = useMemo(() => {
    if (!result) return [];

    const counts: Record<string, number> = {};

    result.connections.forEach((connection) => {
      counts[connection.to] = (counts[connection.to] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [result]);

  const health = useMemo(() => {
    if (!result || result.files.length === 0) {
      return {
        score: 0,
        largeFiles: [] as FileInfo[],
        isolatedFiles: [] as FileInfo[],
        recommendations: [] as string[],
      };
    }

    const largeFiles = result.files.filter((file) => file.lines > 300);

    const connectedPaths = new Set(
      result.connections.flatMap((connection) => [
        connection.from,
        connection.to,
      ])
    );

    const isolatedFiles = result.files.filter(
      (file) => !connectedPaths.has(file.path)
    );

    const largeRatio = largeFiles.length / result.files.length;
    const isolatedRatio = isolatedFiles.length / result.files.length;

    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(100 - largeRatio * 35 - isolatedRatio * 20)
      )
    );

    const recommendations: string[] = [];

    if (largeFiles.length > 0) {
      recommendations.push(
        `Review ${largeFiles.length} large file(s). Splitting responsibilities may improve readability.`
      );
    }

    if (isolatedFiles.length > 0) {
      recommendations.push(
        `${isolatedFiles.length} file(s) have no detected local connections. Check whether they are entry points, utilities or unused files.`
      );
    }

    if (result.connections.length === 0) {
      recommendations.push(
        "No local dependencies were detected. Check that your project uses relative imports."
      );
    }

    if (largeFiles.length === 0 && isolatedFiles.length === 0) {
      recommendations.push(
        "No basic structural warnings were detected. Keep your files organized and your imports clear."
      );
    }

    return { score, largeFiles, isolatedFiles, recommendations };
  }, [result]);

  const navigation = [
    { name: "Overview" as Page, icon: LayoutDashboard },
    { name: "File Explorer" as Page, icon: Files },
    { name: "Dependencies" as Page, icon: GitBranch },
    { name: "Code Health" as Page, icon: HeartPulse },
  ];

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Network size={23} /></div>
          <span>Code<span className="brand-accent">DNA</span></span>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <div className="workspace-card">
          <div className="workspace-icon"><Folder size={17} /></div>
          <div>
            <strong>My project</strong>
            <small>{result ? `${result.files.length} files analyzed` : "No project loaded"}</small>
          </div>
        </div>

        <div className="sidebar-label nav-label">NAVIGATION</div>

        <nav className="side-nav">
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-link ${active === item.name ? "active" : ""}`}
              onClick={() => setActive(item.name)}
            >
              <item.icon size={18} />
              <span>{item.name}</span>
              {active === item.name && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-glow"><Sparkles size={17} /></div>
          <div>
            <strong>CodeDNA Engine</strong>
            <small>Understand your code.</small>
          </div>
          <span className="online-dot" />
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            Workspace <span>/</span> <strong>{active}</strong>
          </div>
          <div className="engine-status"><span className="online-dot" /> ENGINE ONLINE</div>
        </header>

        <div className="page-content">
          {active === "Overview" && (
            <>
              <section className="welcome-section">
                <div>
                  <div className="eyebrow"><Sparkles size={14} /> CODEBASE INTELLIGENCE</div>
                  <h1>Understand your code.<br /><span>See the connections.</span></h1>
                  <p>Your entire codebase, visualized in one place. Discover files, imports and project structure.</p>
                </div>
                <div className="welcome-art">
                  <div className="art-ring ring-one" />
                  <div className="art-ring ring-two" />
                  <div className="art-core"><Code2 size={38} /></div>
                  <span className="art-dot dot-one" />
                  <span className="art-dot dot-two" />
                  <span className="art-dot dot-three" />
                  <span className="art-dot dot-four" />
                </div>
              </section>

              <section className="scanner-section">
                <div className="section-title">
                  <div><h2>Start a new analysis</h2><p>Choose where your project is located.</p></div>
                  <span className="section-tag">2 SCAN OPTIONS</span>
                </div>

                <div className="scanner-grid">
                  <label className="scanner-card local-card">
                    <input
                      type="file"
                      multiple
                      // @ts-expect-error Chrome supports webkitdirectory
                      webkitdirectory=""
                      onChange={(event) => scanFolder(event.target.files)}
                    />
                    <div className="scanner-icon purple-icon"><Upload size={23} /></div>
                    <strong>Local project</strong>
                    <p>Analyze a folder directly from your computer.</p>
                    <span className="scanner-action">Choose a folder <ArrowRight size={16} /></span>
                  </label>

                  <div className="scanner-card github-card">
                    <div className="scanner-icon blue-icon"><Github size={23} /></div>
                    <strong>GitHub repository</strong>
                    <p>Analyze a public repository using its URL.</p>
                    <input
                      className="github-input"
                      type="url"
                      placeholder="https://github.com/owner/repository"
                      value={githubUrl}
                      onChange={(event) => setGithubUrl(event.target.value)}
                    />
                    <button className="scanner-action github-action" onClick={scanGitHub} disabled={loading}>
                      Analyze repository <ArrowRight size={16} />
                    </button>
                  </div>
                </div>

                {loading && <div className="notice loading-notice"><LoaderCircle size={18} className="spin" /> Analyzing your project...</div>}
                {error && <div className="notice error-notice"><AlertCircle size={18} /> {error}</div>}
              </section>

              {result && (
                <>
                  <div className="section-title result-title">
                    <div><h2>Project overview</h2><p>Your latest analysis results.</p></div>
                    <span className="success-label"><CheckCircle2 size={15} /> Analysis complete</span>
                  </div>

                  <div className="stats-grid">
                    <div className="metric-card">
                      <div className="metric-top"><span>Source files</span><FileCode2 size={19} /></div>
                      <strong>{result.files.length}</strong><small>Files discovered</small>
                    </div>
                    <div className="metric-card">
                      <div className="metric-top"><span>Connections</span><GitBranch size={19} /></div>
                      <strong>{result.connections.length}</strong><small>Local imports found</small>
                    </div>
                    <div className="metric-card">
                      <div className="metric-top"><span>Lines of code</span><Activity size={19} /></div>
                      <strong>{result.totalLines.toLocaleString()}</strong><small>Total source lines</small>
                    </div>
                    <div className="metric-card">
                      <div className="metric-top"><span>Large files</span><Code2 size={19} /></div>
                      <strong>{result.largeFiles.length}</strong><small>Over 300 lines</small>
                    </div>
                  </div>

                  <div className="section-title">
                    <div><h2>Detailed analytics</h2><p>A closer look at your codebase.</p></div>
                    <span className="section-tag"><BarChart3 size={14} /> CODE INSIGHTS</span>
                  </div>

                  <div className="analytics-grid">
                    <div className="analytics-card">
                      <div className="analytics-heading">
                        <div><BarChart3 size={19} /><strong>File types</strong></div>
                        <span>{fileTypeStats.length} types</span>
                      </div>
                      {fileTypeStats.map(([type, count]) => {
                        const percentage = Math.round((count / result.files.length) * 100);
                        return (
                          <div className="type-stat" key={type}>
                            <div className="type-stat-label">
                              <span>{type}</span><span>{count} files · {percentage}%</span>
                            </div>
                            <div className="stat-track">
                              <div className="stat-fill" style={{ width: `${percentage}%`, background: getFileColor(`file.${type.toLowerCase()}`) }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="analytics-card">
                      <div className="analytics-heading">
                        <div><TrendingUp size={19} /><strong>Most imported files</strong></div>
                        <span>TOP 5</span>
                      </div>
                      {mostImportedFiles.length > 0 ? mostImportedFiles.map(([path, count], index) => (
                        <div className="popular-file" key={path}>
                          <span className="popular-rank">{index + 1}</span>
                          <div className="popular-file-info">
                            <strong title={path}>{path.split("/").pop()}</strong>
                            <small>{path}</small>
                          </div>
                          <span className="import-count">{count} imports</span>
                        </div>
                      )) : <div className="analytics-empty"><GitBranch size={22} /><p>No imported files detected yet.</p></div>}
                    </div>
                  </div>

                  <div className="section-title">
                    <div><h2>Quick access</h2><p>Explore your analysis in more detail.</p></div>
                  </div>

                  <div className="quick-grid">
                    <button className="quick-card" onClick={() => setActive("File Explorer")}>
                      <Files size={22} /><strong>Explore files</strong><span>Browse all analyzed source files</span><ArrowRight size={17} />
                    </button>
                    <button className="quick-card" onClick={() => setActive("Dependencies")}>
                      <GitBranch size={22} /><strong>View dependencies</strong><span>Visualize how files connect</span><ArrowRight size={17} />
                    </button>
                    <button className="quick-card" onClick={() => setActive("Code Health")}>
                      <HeartPulse size={22} /><strong>Code Health</strong><span>Review your project structure</span><ArrowRight size={17} />
                    </button>
                  </div>
                </>
              )}

              {!result && (
                <div className="empty-overview">
                  <div className="empty-icon"><Network size={25} /></div>
                  <div><strong>Your workspace is ready</strong><p>Choose a scanner above to discover your codebase.</p></div>
                </div>
              )}
            </>
          )}

          {active === "Code Health" && (
            <section className="page-section">
              <div className="page-heading">
                <div className="eyebrow"><HeartPulse size={14} /> PROJECT QUALITY</div>
                <h1>Code Health</h1>
                <p>Understand the structure of your project and find areas to review.</p>
              </div>

              {result ? (
                <>
                  <div className="health-score-card">
                    <div className="health-score-icon"><ShieldCheck size={30} /></div>
                    <div>
                      <span className="health-caption">STRUCTURAL HEALTH SCORE</span>
                      <div className="health-number">{health.score}<span>/100</span></div>
                      <p>This is an indicative score based on file size and detected local connections, not a full code quality test.</p>
                    </div>
                    <div className="health-score-ring">
                      <span>{health.score}%</span>
                    </div>
                  </div>

                  <div className="stats-grid health-stats">
                    <div className="metric-card">
                      <div className="metric-top"><span>Large files</span><AlertTriangle size={19} /></div>
                      <strong>{health.largeFiles.length}</strong>
                      <small>Over 300 lines</small>
                    </div>
                    <div className="metric-card">
                      <div className="metric-top"><span>Isolated files</span><Network size={19} /></div>
                      <strong>{health.isolatedFiles.length}</strong>
                      <small>No detected connections</small>
                    </div>
                    <div className="metric-card">
                      <div className="metric-top"><span>Dependencies</span><GitBranch size={19} /></div>
                      <strong>{result.connections.length}</strong>
                      <small>Local connections</small>
                    </div>
                    <div className="metric-card">
                      <div className="metric-top"><span>Project files</span><Files size={19} /></div>
                      <strong>{result.files.length}</strong>
                      <small>Analyzed files</small>
                    </div>
                  </div>

                  <div className="section-title">
                    <div><h2>Recommendations</h2><p>Suggestions based on the detected project structure.</p></div>
                  </div>

                  <div className="health-recommendations">
                    {health.recommendations.map((recommendation, index) => (
                      <div className="health-recommendation" key={index}>
                        <div className="recommendation-icon"><Lightbulb size={20} /></div>
                        <p>{recommendation}</p>
                      </div>
                    ))}
                  </div>

                  <div className="section-title">
                    <div><h2>Files to review</h2><p>Files that may deserve a closer look.</p></div>
                  </div>

                  <div className="analytics-grid">
                    <div className="analytics-card">
                      <div className="analytics-heading">
                        <div><AlertTriangle size={19} /><strong>Large files</strong></div>
                        <span>{health.largeFiles.length} FOUND</span>
                      </div>
                      {health.largeFiles.length > 0 ? health.largeFiles.map((file) => (
                        <div className="popular-file" key={file.path}>
                          <span className="popular-rank"><FileCode2 size={16} /></span>
                          <div className="popular-file-info">
                            <strong>{file.name}</strong>
                            <small>{file.path}</small>
                          </div>
                          <span className="import-count">{file.lines} lines</span>
                        </div>
                      )) : (
                        <div className="analytics-empty"><CheckCircle2 size={22} /><p>No files over 300 lines.</p></div>
                      )}
                    </div>

                    <div className="analytics-card">
                      <div className="analytics-heading">
                        <div><Network size={19} /><strong>Isolated files</strong></div>
                        <span>{health.isolatedFiles.length} FOUND</span>
                      </div>
                      {health.isolatedFiles.length > 0 ? health.isolatedFiles.slice(0, 10).map((file) => (
                        <div className="popular-file" key={file.path}>
                          <span className="popular-rank"><FileCode2 size={16} /></span>
                          <div className="popular-file-info">
                            <strong>{file.name}</strong>
                            <small>{file.path}</small>
                          </div>
                          <span className="import-count">{file.lines} lines</span>
                        </div>
                      )) : (
                        <div className="analytics-empty"><CheckCircle2 size={22} /><p>No isolated files detected.</p></div>
                      )}
                    </div>
                  </div>

                  <div className="notice">
                    <AlertCircle size={18} />
                    A file without detected connections is not necessarily unused. It may be an application entry point, a standalone utility or a file loaded in another way.
                  </div>
                </>
              ) : (
                <div className="empty-state large-empty">
                  <HeartPulse size={34} />
                  <h3>No project analyzed yet</h3>
                  <p>Analyze a project first to see its structural health.</p>
                  <button className="primary-button" onClick={() => setActive("Overview")}>Go to Overview <ArrowRight size={16} /></button>
                </div>
              )}
            </section>
          )}

          {active === "File Explorer" && (
            <section className="page-section">
              <div className="page-heading">
                <div className="eyebrow"><Files size={14} /> CODEBASE BROWSER</div>
                <h1>File Explorer</h1>
                <p>Browse and search through your analyzed source files.</p>
              </div>

              {result ? (
                <>
                  <div className="explorer-toolbar">
                    <div className="search-box">
                      <Search size={17} />
                      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search files..." />
                    </div>
                    <span>{filteredFiles.length} / {result.files.length} files</span>
                  </div>

                  <div className="file-table">
                    <div className="file-table-head"><span>FILE PATH</span><span>LINES</span><span>IMPORTS</span></div>
                    {filteredFiles.map((file) => (
                      <button className="file-table-row" key={file.path} onClick={() => setSelectedFile(file)} style={{
                        width: "100%",
                        textAlign: "left",
                        cursor: "pointer",
                        color: "inherit",
                        background: selectedFile?.path === file.path ? "rgba(128,103,237,0.15)" : "transparent",
                      }}>
                        <div className="file-path"><FileCode2 size={17} color={getFileColor(file.path)} /><span>{file.path}</span></div>
                        <span>{file.lines}</span><span>{file.imports.length}</span>
                      </button>
                    ))}
                    {filteredFiles.length === 0 && <div className="empty-state">No files match your search.</div>}
                  </div>

                  {selectedFile && (
                    <div className="insight-panel">
                      <div className="insight-icon"><FileCode2 size={19} /></div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong>{selectedFile.name}</strong><p>{selectedFile.path}</p>
                        <p>{selectedFile.lines} lines · {selectedFile.imports.length} imports</p>
                      </div>
                      <button onClick={() => setSelectedFile(null)} aria-label="Close file details"><X size={18} /></button>
                    </div>
                  )}

                  <div className="insight-panel">
                    <div className="insight-icon"><Sparkles size={19} /></div>
                    <div>
                      <strong>Code insights</strong>
                      <p>{result.largeFiles.length === 0 ? "No files over 300 lines were detected." : `${result.largeFiles.length} files contain more than 300 lines.`}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="empty-state large-empty">
                  <Files size={34} /><h3>No project analyzed yet</h3>
                  <p>Go to Overview to scan a local folder or GitHub repository.</p>
                  <button className="primary-button" onClick={() => setActive("Overview")}>Go to Overview <ArrowRight size={16} /></button>
                </div>
              )}
            </section>
          )}

          {active === "Dependencies" && (
            <section className="page-section">
              <div className="page-heading">
                <div className="eyebrow"><GitBranch size={14} /> PROJECT ARCHITECTURE</div>
                <h1>Dependency Graph</h1>
                <p>Explore the relationships between files in your project.</p>
              </div>

              {result ? (
                <>
                  <div className="graph-toolbar">
                    <div><strong>{result.files.length} nodes</strong><span>{result.connections.length} connections</span></div>
                    <span className="graph-hint">Drag to move · Scroll to zoom</span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", marginBottom: "16px", fontSize: "12px", color: "#c4c6dc" }}>
                    {[
                      { label: "TSX", color: "#a78bfa" },
                      { label: "TS", color: "#60a5fa" },
                      { label: "JSX", color: "#fbbf24" },
                      { label: "JS", color: "#4ade80" },
                      { label: "Other", color: "#94a3b8" },
                    ].map((item) => (
                      <span key={item.label} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "9px", height: "9px", borderRadius: "50%", background: item.color }} />
                        {item.label}
                      </span>
                    ))}
                  </div>

                  <div className="dependency-graph">
                    <ReactFlow nodes={graph.nodes} edges={graph.edges} onNodeClick={handleNodeClick} fitView fitViewOptions={{ padding: 0.2 }}>
                      <Background color="#343854" gap={22} />
                      <Controls />
                      <MiniMap
                        nodeColor={(node) => {
                          const file = result.files.find((item) => item.path === node.id);
                          return file ? getFileColor(file.path) : "#8067ed";
                        }}
                        maskColor="rgba(8, 11, 22, 0.75)"
                      />
                    </ReactFlow>
                  </div>

                  {selectedFile && (
                    <div style={{ marginTop: "18px", padding: "20px", borderRadius: "14px", border: `1px solid ${getFileColor(selectedFile.path)}`, background: "#171b35", color: "#f4f4fb" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <FileCode2 color={getFileColor(selectedFile.path)} />
                          <strong>{selectedFile.name}</strong>
                        </div>
                        <button onClick={() => setSelectedFile(null)} aria-label="Close file details" style={{ background: "transparent", border: 0, color: "#f4f4fb", cursor: "pointer" }}><X size={19} /></button>
                      </div>
                      <p style={{ color: "#aaaecb", fontSize: "13px" }}>{selectedFile.path}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", marginTop: "12px", fontSize: "13px" }}>
                        <span>{selectedFile.lines} lines</span>
                        <span>{selectedFile.imports.length} imports</span>
                        <span>{getFileType(selectedFile.path)}</span>
                      </div>
                      <div style={{ marginTop: "14px" }}>
                        <strong style={{ fontSize: "13px" }}>Imported files</strong>
                        {selectedFile.imports.length > 0 ? (
                          <ul style={{ color: "#c4c6dc" }}>{selectedFile.imports.map((path) => <li key={path}>{path}</li>)}</ul>
                        ) : (
                          <p style={{ color: "#aaaecb", fontSize: "13px" }}>No local imports found.</p>
                        )}
                      </div>
                    </div>
                  )}

                  {result.connections.length === 0 && <div className="notice">No local imports were detected, so there are no connection lines yet.</div>}
                </>
              ) : (
                <div className="empty-state large-empty">
                  <GitBranch size={34} /><h3>Your graph is waiting</h3>
                  <p>Analyze a project first to generate its dependency graph.</p>
                  <button className="primary-button" onClick={() => setActive("Overview")}>Scan a project <ArrowRight size={16} /></button>
                </div>
              )}
            </section>
          )}

          <footer className="app-footer"><span>CodeDNA</span> · BUILT TO MAKE CODE MAKE SENSE</footer>
        </div>
      </section>
    </main>
  );
}
