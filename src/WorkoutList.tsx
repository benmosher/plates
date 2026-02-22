import { Link, useNavigate } from "react-router";
import { useMassStorage } from "./plate-db";
import { HiddenDeleteFieldset } from "./HiddenDeleteFieldset";
import { Workout } from "./workout-types";
import { exportWorkout, buildImportUrl } from "./workout-export";
import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";

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
        style={{ width: "auto" }}
        onClick={handleShare}
      >
        Share
      </button>
      <dialog ref={dialogRef}>
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
              <button
                type="button"
                style={{ marginTop: "1rem" }}
                onClick={() => navigator.clipboard.writeText(shareUrl)}
              >
                Copy link
              </button>
            </div>
          )}
        </article>
      </dialog>
    </>
  );
}

export default function WorkoutList() {
  const { workouts, putWorkout, deleteWorkout } = useMassStorage();
  const navigate = useNavigate();

  return (
    <>
      <h3>Workouts</h3>
      {workouts.length === 0 && <p>No saved workouts yet.</p>}
      {workouts.map((w) => (
        <HiddenDeleteFieldset
          key={w.id}
          onDelete={() => deleteWorkout(w.id!)}
        >
          <Link to={`/workouts/${w.id}/edit`} style={{ flex: 1 }}>
            {w.name || "(untitled)"}
          </Link>
          <ShareDialog workout={w} />
          <Link to={`/workouts/${w.id}/view`} role="button" className="secondary outline" style={{ width: "auto" }}>
            View
          </Link>
        </HiddenDeleteFieldset>
      ))}
      <button
        type="button"
        onClick={async () => {
          const id = await putWorkout({ name: "", movements: [] });
          navigate(`/workouts/${id}/edit`);
        }}
      >
        New workout
      </button>
    </>
  );
}
