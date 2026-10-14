"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            alignItems: "center",
            background: "#f4f1e8",
            color: "#1d2a27",
            display: "flex",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
          }}
        >
          <section style={{ maxWidth: 520, textAlign: "center" }}>
            <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.01em", margin: 0 }}>
              Webinar Stack needs to reload
            </h1>
            <p style={{ color: "#68736f", lineHeight: 1.6, margin: "16px 0 24px" }}>
              A shared part of the application failed to load. Retry to restore the workspace.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#1f4d3d",
                border: 0,
                borderRadius: 999,
                color: "#fffefb",
                cursor: "pointer",
                fontSize: 14,
                fontWeight: 600,
                padding: "12px 24px",
              }}
            >
              Reload application
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
