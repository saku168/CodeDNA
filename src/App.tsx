
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Code2,
  FileCode2,
  Folder,
  GitBranch,
  Network,
  Search,
  Sparkles,
} from "lucide-react";

const files = [
  { name: "src", type: "folder", detail: "Dossier principal" },
  { name: "App.tsx", type: "file", detail: "Composant principal" },
  { name: "main.tsx", type: "file", detail: "Point d'entrée" },
  { name: "style.css", type: "file", detail: "Styles de l'application" },
  { name: "package.json", type: "file", detail: "Dépendances du projet" },
];

export default function App() {
  const [active, setActive] = useState("Overview");

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon"><Network size={21} /></div>
          <span>Code<span className="accent">DNA</span></span>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <div className="project-name"><Folder size={16} /> My project</div>

        <nav>
          {[
            { name: "Overview", icon: Activity },
            { name: "File Explorer", icon: FileCode2 },
            { name: "Dependencies", icon: GitBranch },
          ].map((item) => (
            <button
              key={item.name}
              className={active === item.name ? "nav-item selected" : "nav-item"}
              onClick={() => setActive(item.name)}
            >
              <item.icon size={17} />
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <Sparkles size={16} />
          <span>Understand your code.</span>
        </div>
      </aside>

      <section className="main">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> My project</div>
          <div className="status"><span /> DEMO PROJECT</div>
        </header>

        <div className="content">
          <div className="hero">
            <div>
              <div className="eyebrow">CODEBASE INTELLIGENCE PLATFORM</div>
              <h1>See the DNA of<br /><span>your code.</span></h1>
              <p>Explore your project's structure, understand its connections, and discover what makes it tick.</p>
            </div>
            <div className="hero-art">
              <div className="orbit orbit-one" />
              <div className="orbit orbit-two" />
              <div className="core"><Code2 size={34} /></div>
              <div className="node node-one" />
              <div className="node node-two" />
              <div className="node node-three" />
              <div className="node node-four" />
            </div>
          </div>

          <div className="section-heading">
            <div>
              <h2>{active}</h2>
              <p>Your project at a glance</p>
            </div>
            <button className="scan-button" onClick={() => setActive("File Explorer")}>
              Explore files <ArrowRight size={16} />
            </button>
          </div>

          <div className="stats">
            <div className="stat-card">
              <div className="stat-icon purple"><FileCode2 size={18} /></div>
              <span>FILES</span>
              <strong>4</strong>
              <small>Project files</small>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue"><GitBranch size={18} /></div>
              <span>DEPENDENCIES</span>
              <strong>0</strong>
              <small>Connections detected</small>
            </div>
            <div className="stat-card">
              <div className="stat-icon green"><Activity size={18} /></div>
              <span>HEALTH SCORE</span>
              <strong>—</strong>
              <small>Awaiting analysis</small>
            </div>
          </div>

          <div className="section-heading files-heading">
            <div>
              <h2>Project structure</h2>
              <p>Files in your workspace</p>
            </div>
            <div className="search"><Search size={15} /> <span>Local preview</span></div>
          </div>

          <div className="file-list">
            {files.map((file) => (
              <div className="file-row" key={file.name}>
                {file.type === "folder" ? <Folder size={17} /> : <FileCode2 size={17} />}
                <span className="file-name">{file.name}</span>
                <span className="file-detail">{file.detail}</span>
                <span className="file-arrow">↗</span>
              </div>
            ))}
          </div>

          <footer>CODEDNA <span>•</span> BUILT TO MAKE CODE MAKE SENSE</footer>
        </div>
      </section>
    </main>
  );
}
