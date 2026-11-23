import { useMemo, useState } from "react";
import { Activity, Copy, FileText, Gauge, Download, SearchCheck } from "lucide-react";
import type { AnalysisResult } from "./analyzer";
import "./tools.css";
type Props = { result: AnalysisResult | null };
type ToolKey = "complexity" | "duplicates" | "docs" | "report";
type Metrics = { complexity: {path:string;score:number;lines:number}[]; duplicates: {text:string;files:string[]}[]; docs: {exported:number;documented:number} };
function score(source: string): number {
 const branches=(source.match(/\b(if|else\s+if|for|while|case|catch|switch)\b|&&|\|\|/g)??[]).length;
 return Math.min(100,branches*4+Math.max(0,(source.split(/\r?\n/).length-80)/8));
}
export function ToolsPanel({result}:Props){
 const [active,setActive]=useState<ToolKey>("complexity");
 const metrics=useMemo<Metrics>(()=>{
  if(!result)return {complexity:[],duplicates:[],docs:{exported:0,documented:0}};
  const complexity=result.files.map(f=>({path:f.path,score:score(f.source),lines:f.lines})).sort((a,b)=>b.score-a.score);
  const blocks=new Map<string,Set<string>>();
  for(const file of result.files){const lines=file.source.split(/\r?\n/).map(x=>x.trim()).filter(x=>x.length>=24&&!x.startsWith("//")&&!x.startsWith("*")&&!x.startsWith("import "));const seen=new Set<string>();for(let i=0;i<=lines.length-5;i++){const block=lines.slice(i,i+5).join("\n");if(seen.has(block))continue;seen.add(block);const set=blocks.get(block)??new Set<string>();set.add(file.path);blocks.set(block,set);}}
  const duplicates=Array.from(blocks.entries()).filter(([,f])=>f.size>1).map(([text,f])=>({text,files:Array.from(f)})).slice(0,30);
  let exported=0,documented=0;
  for(const file of result.files){const lines=file.source.split(/\r?\n/);lines.forEach((line,i)=>{if(/\bexport\s+(?:async\s+)?(?:function|class|const|let|interface|type)\b/.test(line)){exported++;if(/\/\*\*|^\s*\/\//m.test(lines.slice(Math.max(0,i-3),i).join("\n")))documented++;}});}
  return {complexity,duplicates,docs:{exported,documented}};
 },[result]);
 function exportReport(){if(!result)return;const data={generatedAt:new Date().toISOString(),summary:{files:result.files.length,lines:result.totalLines,connections:result.connections.length},tools:metrics};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download="codedna-report.json";a.click();URL.revokeObjectURL(url);}
 const tabs=[{id:"complexity" as const,label:"Complexity",icon:Gauge},{id:"duplicates" as const,label:"Duplicates",icon:Copy},{id:"docs" as const,label:"Documentation",icon:FileText},{id:"report" as const,label:"Report",icon:Download}];
 return <section className="page-section tools-page"><div className="page-heading"><div className="eyebrow"><SearchCheck size={14}/> DEVELOPER TOOLKIT</div><h1>Code tools</h1><p>Run additional checks on the latest scan.</p></div><div className="tool-tabs">{tabs.map(t=><button key={t.id} className={active===t.id?"tool-tab active":"tool-tab"} onClick={()=>setActive(t.id)}><t.icon size={17}/>{t.label}</button>)}</div>
 {!result?<div className="tool-empty"><Activity size={30}/><h3>Scan a project to unlock the tools</h3><p>Start from Overview.</p></div>:<div className="tool-card"><div className="tool-card-heading"><h2>{tabs.find(t=>t.id===active)?.label}</h2><span>{result.files.length} files</span></div>
 {active==="complexity"&&<><div className="tool-summary"><strong>{metrics.complexity.filter(x=>x.score>=35).length}</strong><span>files with elevated heuristic indicators</span></div>{metrics.complexity.map(f=><div className="tool-row" key={f.path}><span>{f.path}</span><small>{f.lines} lines</small><b className={f.score>=35?"risk":"calm"}>{Math.round(f.score)}/100</b></div>)}</>}
 {active==="duplicates"&&<><div className="tool-summary"><strong>{metrics.duplicates.length}</strong><span>repeated five-line blocks</span></div>{metrics.duplicates.length?metrics.duplicates.map((x,i)=><div className="duplicate-item" key={i}><pre>{x.text}</pre><small>{x.files.join(" · ")}</small></div>):<p className="tool-note">No repeated blocks detected.</p>}</>}
 {active==="docs"&&<><div className="tool-summary"><strong>{metrics.docs.exported?Math.round(metrics.docs.documented/metrics.docs.exported*100):100}%</strong><span>documented exported declarations · {metrics.docs.documented}/{metrics.docs.exported}</span></div><div className="tool-progress"><span style={{width:metrics.docs.exported?String(metrics.docs.documented/metrics.docs.exported*100)+"%":"100%"}}/></div><p className="tool-note">Lightweight JSDoc and line-comment detection, not a full parser.</p></>}
 {active==="report"&&<div className="report-action"><p>Export summary, complexity indicators, duplicate blocks and documentation coverage.</p><button className="primary-button" onClick={exportReport}><Download size={16}/> Export JSON report</button></div>}</div>}</section>;
}
