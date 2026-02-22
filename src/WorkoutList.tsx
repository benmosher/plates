import { Link, useNavigate } from "react-router";
import { useMassStorage } from "./plate-db";
import { Workout } from "./workout-types";
import { exportWorkout, buildImportUrl } from "./workout-export";
import { useRef, useState } from "react";
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

export default function WorkoutList() {
  const { workouts, putWorkout } = useMassStorage();
  const navigate = useNavigate();

  return (
    <>
      <h3>Workouts</h3>
      {workouts.length === 0 ? (
        <p>No saved workouts yet.</p>
      ) : (
        <table>
          <tbody>
            {workouts.map((w) => (
              <tr key={w.id}>
                <td>
                  <Link to={`/workouts/${w.id}/view`}>
                    {w.name || "(untitled)"}
                  </Link>
                </td>
                <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                  <span style={{ display: "inline-flex", gap: "0.25rem" }}>
                    <ShareDialog workout={w} />
                    <Link to={`/workouts/${w.id}/edit`} role="button" className="secondary outline" style={btnStyle}>
                      Edit
                    </Link>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
