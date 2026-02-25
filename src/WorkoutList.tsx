import { Link, useNavigate } from "react-router";
import { useMassStorage } from "./plate-db";
import { Workout } from "./workout-types";
import { exportWorkout, buildImportUrl } from "./workout-export";
import { useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

const btnStyle: React.CSSProperties = { width: "auto", padding: "0.25rem 0.5rem", fontSize: "0.75rem", margin: 0 };

function ShareDialog({ workout }: { workout: Workout }) {
  const { maxes } = useMassStorage();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  async function handleShare() {
    const encoded = await exportWorkout(workout, maxes);
    setShareUrl(buildImportUrl(encoded));
    dialogRef.current?.showModal();
  }

  return (
    <>
      <button
        type="button"
        className="secondary outline"
        style={btnStyle}
        onClick={handleShare}
      >
        Share
      </button>
      <dialog ref={dialogRef} onClick={(e) => { if (e.target === dialogRef.current) dialogRef.current?.close(); }}>
        <article>
          <header>
            <button
              aria-label="Close"
              rel="prev"
              onClick={() => dialogRef.current?.close()}
            />
            <strong>Share: {workout.name || "(untitled)"}</strong>
          </header>
          {shareUrl && (
            <div style={{ textAlign: "center" }}>
              <QRCodeSVG value={shareUrl} size={256} />
              <div>
                <button
                  type="button"
                  style={{ marginTop: "1rem" }}
                  onClick={() => navigator.clipboard.writeText(shareUrl)}
                >
                  Copy link
                </button>
              </div>
            </div>
          )}
        </article>
      </dialog>
    </>
  );
}

function WorkoutRow({ workout }: { workout: Workout }) {
  return (
    <tr>
      <td>
        <Link to={`/workouts/${workout.id}/view`}>
          {workout.name || "(untitled)"}
        </Link>
      </td>
      <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
        <span style={{ display: "inline-flex", gap: "0.25rem" }}>
          <ShareDialog workout={workout} />
          <Link to={`/workouts/${workout.id}/edit`} role="button" className="secondary outline" style={btnStyle}>
            Edit
          </Link>
        </span>
      </td>
    </tr>
  );
}

function WorkoutTable({ workouts }: { workouts: readonly Workout[] }) {
  return (
    <table>
      <tbody>
        {workouts.map((w) => <WorkoutRow key={w.id} workout={w} />)}
      </tbody>
    </table>
  );
}

export default function WorkoutList() {
  const { workouts, putWorkout } = useMassStorage();
  const navigate = useNavigate();

  const { unfiled, folders } = useMemo(() => {
    const unfiled: Workout[] = [];
    const folderMap = new Map<string, Workout[]>();
    for (const w of workouts) {
      if (w.folder) {
        let list = folderMap.get(w.folder);
        if (!list) { list = []; folderMap.set(w.folder, list); }
        list.push(w);
      } else {
        unfiled.push(w);
      }
    }
    // sort folder names alphabetically
    const folders = [...folderMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return { unfiled, folders };
  }, [workouts]);

  return (
    <>
      <h3>Workouts</h3>
      {workouts.length === 0 ? (
        <p>No saved workouts yet.</p>
      ) : (
        <>
          {folders.map(([folder, items]) => (
            <details key={folder} open>
              <summary><strong>{folder}</strong></summary>
              <WorkoutTable workouts={items} />
            </details>
          ))}
          {unfiled.length > 0 && (
            <details open>
              <summary><strong>Unfiled</strong></summary>
              <WorkoutTable workouts={unfiled} />
            </details>
          )}
        </>
      )}
      <button
        type="button"
        onClick={async () => {
          const id = await putWorkout({ name: "", groups: [] });
          navigate(`/workouts/${id}/edit`);
        }}
      >
        New workout
      </button>
    </>
  );
}
