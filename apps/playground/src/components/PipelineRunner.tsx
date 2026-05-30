import { useState, useRef } from "react";
import "./PipelineRunner.css";

interface StepResult {
  label: string;
  data: string;
  time: number;
}

export function PipelineRunner() {
  const [image, setImage] = useState<string | null>(null);
  const [results, setResults] = useState<StepResult[]>([]);
  const [running, setRunning] = useState(false);
  const [fullJson, setFullJson] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const runPipeline = async () => {
    if (!image) return;
    setRunning(true);
    setResults([]);
    setFullJson(null);

    const steps: StepResult[] = [];
    const startTotal = performance.now();

    // Convert base64 to blob
    const res = await fetch(image);
    const blob = await res.blob();
    const form = new FormData();
    form.append("image", blob, "menu.jpg");

    // Call the API
    const apiRes = await fetch("/api/menu/scan", {
      method: "POST",
      body: form,
    });

    const json = await apiRes.json();
    const totalTime = Math.round(performance.now() - startTotal);

    if (!json.success) {
      steps.push({
        label: "Error",
        data: JSON.stringify(json.error, null, 2),
        time: totalTime,
      });
      setResults(steps);
      setRunning(false);
      return;
    }

    const data = json.data;
    steps.push({
      label: `Structured Menu (${data.categories?.length ?? 0} categories, ${data.language})`,
      data: JSON.stringify(data, null, 2),
      time: data.metadata?.processing_time_ms ?? totalTime,
    });

    setFullJson(JSON.stringify(data, null, 2));
    setResults(steps);
    setRunning(false);
  };

  return (
    <div className="pipeline">
      <div className="upload-section">
        <h2>Upload Menu Image</h2>
        <div className="upload-area" onClick={() => fileRef.current?.click()}>
          {image ? (
            <img src={image} alt="menu" className="preview" />
          ) : (
            <p>Click to upload a menu photo</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            hidden
          />
        </div>

        <button
          onClick={runPipeline}
          disabled={!image || running}
          className="run-btn"
        >
          {running ? "Running..." : "Run Pipeline"}
        </button>
      </div>

      {(results.length > 0 || fullJson) && (
        <div className="results">
          <h2>Results</h2>
          {results.map((step, i) => (
            <details key={i} className="step">
              <summary>
                {step.label}
                {step.time > 0 && (
                  <span className="time">{step.time}ms</span>
                )}
              </summary>
              <pre>{step.data}</pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
