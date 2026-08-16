"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main
          style={{
            alignItems: "center",
            background:
              "radial-gradient(circle at 18% 18%, rgba(255,255,255,.72), transparent 28%), radial-gradient(circle at 82% 78%, rgba(210,235,216,.75), transparent 30%), #dff1e2",
            color: "#0f281c",
            display: "flex",
            fontFamily: "ui-sans-serif, system-ui, sans-serif",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
          }}
        >
          <section style={{ maxWidth: 520, textAlign: "center" }}>
            <h1 style={{ fontSize: 28, margin: 0 }}>AstroCraft needs to reload</h1>
            <p style={{ lineHeight: 1.6, margin: "16px 0 24px" }}>
              A shared part of the application failed to load. Retry to restore the workspace.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#183d30",
                border: 0,
                borderRadius: 999,
                color: "white",
                cursor: "pointer",
                fontWeight: 700,
                padding: "12px 20px",
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
