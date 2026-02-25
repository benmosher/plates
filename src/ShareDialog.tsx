import { useRef, useState } from "react";
import { useMassStorage } from "./plate-db";
import { exportWorkout, buildImportUrl } from "./workout-export";
import { Workout } from "./workout-types";
import { QRCodeSVG } from "qrcode.react";

export default function ShareDialog({ workout, buttonStyle }: { workout: Workout; buttonStyle?: React.CSSProperties }) {
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
        style={buttonStyle}
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
