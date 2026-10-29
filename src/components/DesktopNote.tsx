import { invitation as C } from "@/src/content/invitation";

/**
 * Shown beside the phone frame on tablet/desktop (hidden on phones by CSS).
 * Static QR placeholder for now — swap in a real QR image (e.g. /assets/qr.webp)
 * once the final URL is known. No QR library, no runtime cost.
 */
export function DesktopNote() {
  return (
    <aside className="desktop-note">
      <p style={{ fontFamily: "var(--font-script)", fontSize: 34, lineHeight: 1.05, color: "var(--gold-light)" }}>
        {C.desktopNote.heading}
      </p>
      <p style={{ fontSize: 15, opacity: 0.85, lineHeight: 1.4 }}>{C.desktopNote.body}</p>
      <div
        style={{
          background: "#f6eee3",
          padding: 12,
          borderRadius: 10,
          width: "fit-content",
          boxShadow: "0 10px 30px rgb(0 0 0 / .35)",
        }}
      >
        <svg width="136" height="136" viewBox="0 0 34 34" role="img" aria-label="QR code placeholder">
          <g fill="#4a0a12">
            {[
              [1, 1],
              [24, 1],
              [1, 24],
            ].map(([x, y]) => (
              <g key={`${x}-${y}`}>
                <path d={`M${x} ${y}h9v9h-9z M${x + 1.5} ${y + 1.5}v6h6v-6z`} fillRule="evenodd" />
                <rect x={x + 3} y={y + 3} width="3" height="3" />
              </g>
            ))}
          </g>
          <text x="17" y="19" textAnchor="middle" fontSize="4" fill="#8a6a33" fontFamily="var(--font-serif), serif">
            QR
          </text>
        </svg>
      </div>
    </aside>
  );
}
