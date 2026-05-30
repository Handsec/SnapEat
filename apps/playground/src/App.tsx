import { useState } from "react";
import { PipelineRunner } from "./components/PipelineRunner";
import { PromptViewer } from "./components/PromptViewer";
import "./App.css";

type Tab = "pipeline" | "prompts";

export default function App() {
  const [tab, setTab] = useState<Tab>("pipeline");

  return (
    <div className="app">
      <header className="header">
        <h1>Menu AI Playground</h1>
        <nav>
          <button
            className={tab === "pipeline" ? "active" : ""}
            onClick={() => setTab("pipeline")}
          >
            Pipeline
          </button>
          <button
            className={tab === "prompts" ? "active" : ""}
            onClick={() => setTab("prompts")}
          >
            Prompts
          </button>
        </nav>
      </header>
      <main>
        {tab === "pipeline" ? <PipelineRunner /> : <PromptViewer />}
      </main>
    </div>
  );
}
