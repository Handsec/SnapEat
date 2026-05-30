import { useState } from "react";
import {
  menuVisionPrompt,
  translationPrompt,
  waiterOrderPrompt,
} from "@menu/prompts";
import "./PromptViewer.css";

const prompts = [
  { key: "vision", label: "Menu Vision", data: menuVisionPrompt },
  { key: "translate", label: "Translation", data: translationPrompt },
  { key: "waiter", label: "Waiter Order", data: waiterOrderPrompt },
];

export function PromptViewer() {
  const [active, setActive] = useState(prompts[0]!.key);

  const current = prompts.find((p) => p.key === active)!;

  return (
    <div className="prompt-viewer">
      <div className="prompt-sidebar">
        {prompts.map((p) => (
          <button
            key={p.key}
            className={active === p.key ? "active" : ""}
            onClick={() => setActive(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="prompt-content">
        <div className="prompt-meta">
          <span className="prompt-name">{current.data.name}</span>
          <span className="prompt-version">v{current.data.version}</span>
        </div>

        <section>
          <h3>System Prompt</h3>
          <pre className="prompt-system">{current.data.system}</pre>
        </section>

        <section>
          <h3>Expected Output Schema</h3>
          <pre className="prompt-schema">{current.data.outputSchema}</pre>
        </section>
      </div>
    </div>
  );
}
