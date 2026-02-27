import { useState, useRef } from "react";
import { useNavigate } from "react-router";
import { useMassStorage } from "./plate-db";
import { Workout, MovementGroup, WorkoutSet } from "./workout-types";

const API_KEY_STORAGE = "plates-claude-api-key";

interface AIWorkoutResponse {
  name: string;
  groups: {
    movements: {
      name: string;
      maxName: string | null;
      sets: { reps: number; count: number; weight: number }[];
    }[];
    restSeconds?: number | null;
    notes?: string | null;
  }[];
}

const SYSTEM_PROMPT = `You are a workout parser. Given an image of a workout plan (handwritten, typed, screenshot, etc.), extract the structured workout data.

Return ONLY valid JSON matching this exact schema:
{
  "name": "workout name or date if visible",
  "groups": [
    {
      "movements": [
        {
          "name": "exercise name",
          "maxName": null,
          "sets": [
            { "reps": 5, "count": 3, "weight": 225 }
          ]
        }
      ],
      "restSeconds": null,
      "notes": null
    }
  ]
}

Rules:
- "count" means how many identical sets (e.g. "3x5 @ 225" → count:3, reps:5, weight:225)
- If multiple rep schemes exist for the same exercise, create separate set entries (e.g. "5,5,5,3,3" at 225 → [{reps:5,count:3,weight:225},{reps:3,count:2,weight:225}])
- If exercises are grouped as a superset or circuit, put them in the same group
- Otherwise each exercise gets its own group
- Use 0 for weight if no weight is specified (bodyweight exercises)
- Extract rest periods if mentioned
- Put any notes or extra instructions in the notes field
- "maxName" should be set to the exercise name if the exercise is a common barbell lift (squat, bench press, deadlift, overhead press, etc.), otherwise null
- Use standard exercise names where possible (e.g. "Bench Press" not "BP", "Squat" not "SQ")
- Return ONLY the JSON, no markdown fences, no explanation`;

export default function WorkoutAIImporter() {
  const navigate = useNavigate();
  const { maxes, workouts, putMax, putWorkout } = useMassStorage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem(API_KEY_STORAGE) ?? "",
  );
  const [imageData, setImageData] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>("image/jpeg");
  const [analyzing, setAnalyzing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [parsed, setParsed] = useState<AIWorkoutResponse | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [folder, setFolder] = useState("");

  // max linking state
  const NONE = "@@none";
  const CREATE_PREFIX = "@@create:";
  const [maxMapping, setMaxMapping] = useState<Map<string, string>>(new Map());

  function saveApiKey(key: string) {
    setApiKey(key);
    if (key) {
      localStorage.setItem(API_KEY_STORAGE, key);
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setParsed(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // result is data:image/...;base64,XXXX
      const commaIdx = result.indexOf(",");
      setImageData(result.slice(commaIdx + 1));
      setImageMimeType(file.type || "image/jpeg");
    };
    reader.readAsDataURL(file);
  }

  async function analyze() {
    if (!apiKey || !imageData) return;
    setAnalyzing(true);
    setError(null);
    setParsed(null);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: imageMimeType,
                    data: imageData,
                  },
                },
                {
                  type: "text",
                  text: "Parse this workout image into structured JSON.",
                },
              ],
            },
          ],
          system: SYSTEM_PROMPT,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `API error ${response.status}: ${body.slice(0, 200)}`,
        );
      }

      const data = await response.json();
      const text: string = data.content?.[0]?.text ?? "";

      // Try to parse JSON from response (strip markdown fences if present)
      let jsonStr = text.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      }

      const result: AIWorkoutResponse = JSON.parse(jsonStr);
      setParsed(result);
      setWorkoutName(result.name || "");

      // build max mapping
      const names = new Set<string>();
      for (const g of result.groups) {
        for (const m of g.movements) {
          if (m.maxName) names.add(m.maxName);
        }
      }
      const mapping = new Map<string, string>();
      for (const name of names) {
        const match = maxes.find(
          (m) => m.label?.toLowerCase() === name.toLowerCase(),
        );
        mapping.set(
          name,
          match ? String(match.id!) : `${CREATE_PREFIX}${name}`,
        );
      }
      setMaxMapping(mapping);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze image");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleImport() {
    if (!parsed) return;
    setImporting(true);
    setError(null);

    try {
      // resolve max mappings
      const resolvedMaxIds = new Map<string, number | null>();
      for (const [name, value] of maxMapping) {
        if (value === NONE) {
          resolvedMaxIds.set(name, null);
        } else if (value.startsWith(CREATE_PREFIX)) {
          const label = value.slice(CREATE_PREFIX.length);
          const id = await putMax({ label, weight: null });
          resolvedMaxIds.set(name, id);
        } else {
          resolvedMaxIds.set(name, Number(value));
        }
      }

      const trimmedFolder = folder.trim();
      const workout: Workout = {
        name: workoutName || parsed.name,
        ...(trimmedFolder ? { folder: trimmedFolder } : {}),
        groups: parsed.groups.map(
          (g): MovementGroup => ({
            movements: g.movements.map((m) => ({
              name: m.name,
              maxId: m.maxName
                ? (resolvedMaxIds.get(m.maxName) ?? null)
                : null,
              sets: m.sets.map(
                (s): WorkoutSet => ({
                  reps: s.reps,
                  count: s.count,
                  weight: s.weight,
                }),
              ),
            })),
            ...(g.restSeconds ? { restSeconds: g.restSeconds } : {}),
            ...(g.notes ? { notes: g.notes } : {}),
          }),
        ),
      };

      const id = await putWorkout(workout);
      navigate(`/workouts/${id}/view`);
    } catch {
      setError("Failed to import workout.");
      setImporting(false);
    }
  }

  const uniqueMaxNames = parsed
    ? [
        ...new Set(
          parsed.groups
            .flatMap((g) => g.movements)
            .map((m) => m.maxName)
            .filter((n): n is string => n != null),
        ),
      ]
    : [];

  const existingFolders = [
    ...new Set(
      workouts.map((w) => w.folder).filter((f): f is string => !!f),
    ),
  ];

  return (
    <>
      <h3>AI Workout Import</h3>
      <p>
        <small>
          Upload a photo of a workout (handwritten, screenshot, etc.) and use
          Claude to parse it into a structured workout.
        </small>
      </p>

      <label>
        Claude API Key
        <input
          type="password"
          placeholder="sk-ant-..."
          value={apiKey}
          onChange={(e) => saveApiKey(e.target.value)}
        />
        <small>
          Stored locally in your browser. Get a key at{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
          >
            console.anthropic.com
          </a>
          .
        </small>
      </label>

      <label>
        Workout image
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
        />
      </label>

      {imageData && (
        <img
          src={`data:${imageMimeType};base64,${imageData}`}
          alt="Workout preview"
          style={{ maxWidth: "100%", maxHeight: "300px", marginBottom: "1rem" }}
        />
      )}

      <button
        type="button"
        onClick={analyze}
        disabled={!apiKey || !imageData || analyzing}
        aria-busy={analyzing}
      >
        {analyzing ? "Analyzing..." : "Analyze with Claude"}
      </button>

      {error && <p aria-invalid="true">{error}</p>}

      {parsed && (
        <>
          <article>
            <header>
              <strong>Parsed workout</strong>
            </header>
            <label>
              Name
              <input
                type="text"
                value={workoutName}
                placeholder="Workout name"
                onChange={(e) => setWorkoutName(e.target.value)}
              />
            </label>
            {parsed.groups.map((group, gIdx) => (
              <p key={gIdx}>
                {group.movements
                  .map((m) => m.name || "(unnamed)")
                  .join(" + ")}
                {" — "}
                {group.movements.reduce(
                  (n, m) => n + m.sets.reduce((s, set) => s + set.count, 0),
                  0,
                )}{" "}
                sets
                {group.restSeconds != null && `, ${group.restSeconds}s rest`}
                {group.notes && (
                  <>
                    <br />
                    <small>{group.notes}</small>
                  </>
                )}
              </p>
            ))}
            <details>
              <summary>
                <small>Raw details</small>
              </summary>
              {parsed.groups.map((group, gIdx) => (
                <div key={gIdx} style={{ marginBottom: "0.5rem" }}>
                  {group.movements.map((m, mIdx) => (
                    <div key={mIdx}>
                      <strong>{m.name}</strong>
                      {m.sets.map((s, sIdx) => (
                        <small key={sIdx} style={{ display: "block" }}>
                          {s.count}x{s.reps}
                          {s.weight > 0 ? ` @ ${s.weight}` : " (BW)"}
                        </small>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </details>
          </article>

          <label>
            Folder
            <input
              type="text"
              placeholder="No folder"
              value={folder}
              list="ai-import-folder-options"
              onChange={(e) => setFolder(e.target.value)}
            />
            <datalist id="ai-import-folder-options">
              {existingFolders.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </label>

          {uniqueMaxNames.length > 0 && (
            <article>
              <header>
                <strong>Link maxes</strong>
              </header>
              {uniqueMaxNames.map((name) => (
                <label key={name}>
                  {name}
                  <select
                    value={maxMapping.get(name) ?? NONE}
                    onChange={(e) =>
                      setMaxMapping(
                        (prev) => new Map(prev).set(name, e.target.value),
                      )
                    }
                  >
                    {maxes
                      .filter((m) => m.label)
                      .map((m) => (
                        <option key={m.id} value={String(m.id!)}>
                          {m.label} ({m.weight ?? "no weight"})
                        </option>
                      ))}
                    <option value={`${CREATE_PREFIX}${name}`}>
                      Create new: {name}
                    </option>
                    <option value={NONE}>None (unlink)</option>
                  </select>
                </label>
              ))}
            </article>
          )}

          <button
            type="button"
            onClick={handleImport}
            aria-busy={importing}
            disabled={importing}
          >
            {importing ? "Importing..." : "Import workout"}
          </button>
        </>
      )}
    </>
  );
}
