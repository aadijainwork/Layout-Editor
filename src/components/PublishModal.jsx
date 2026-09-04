export default function PublishModal({
  isOpen,
  onClose,
  publishState,
  errors = [],
  result = null,
  building = null,
  floor = null,
  onRetry = null,
}) {
  if (!isOpen) return null;

  const isPublishing = publishState === "publishing";
  const isError = publishState === "error";
  const isSuccess = publishState === "success";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
      onClick={isPublishing ? undefined : onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "14px",
          padding: "24px",
          width: "440px",
          maxWidth: "92vw",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)",
          border: isError
            ? "1px solid #fecaca"
            : isSuccess
            ? "1px solid #bbf7d0"
            : "1px solid #b5d4f4",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          color: "#1e293b",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "20px" }}>
              {isPublishing && "🔄"}
              {isError && "⚠️"}
              {isSuccess && "✅"}
            </span>
            <h3
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: "700",
                color: isError ? "#b91c1c" : isSuccess ? "#15803d" : "#185fa5",
              }}
            >
              {isPublishing && "Publishing Floor Layout"}
              {isError && "Publish Failed"}
              {isSuccess && "Floor Published Successfully"}
            </h3>
          </div>

          {!isPublishing && (
            <button
              onClick={onClose}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "18px",
                cursor: "pointer",
                color: "#64748b",
                padding: "2px 6px",
                borderRadius: "4px",
                lineHeight: 1,
              }}
              aria-label="Close modal"
            >
              ✕
            </button>
          )}
        </div>

        {/* Target building & floor info banner */}
        <div
          style={{
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "10px 12px",
            fontSize: "13px",
            color: "#334155",
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "4px 10px",
          }}
        >
          <span style={{ fontWeight: "600", color: "#64748b" }}>Building:</span>
          <span>
            {result?.building?.name || building?.name || "N/A"}{" "}
            <code style={{ fontSize: "11px", color: "#64748b" }}>
              ({result?.building?.id || building?.id || "N/A"})
            </code>
          </span>

          <span style={{ fontWeight: "600", color: "#64748b" }}>Floor:</span>
          <span>
            {result?.floor?.name || floor?.name || "N/A"}{" "}
            <code style={{ fontSize: "11px", color: "#64748b" }}>
              ({result?.floor?.id || floor?.id || "N/A"})
            </code>
          </span>

          <span style={{ fontWeight: "600", color: "#64748b" }}>Level:</span>
          <span style={{ fontWeight: "600" }}>
            {result?.floor?.level !== undefined
              ? result.floor.level
              : floor?.level !== undefined
              ? floor.level
              : "N/A"}
          </span>
        </div>

        {/* Publishing State */}
        {isPublishing && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px 12px",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                border: "3px solid #e2e8f0",
                borderTop: "3px solid #185fa5",
                borderRadius: "50%",
                animation: "publishSpin 0.9s linear infinite",
              }}
            />
            <style>{`
              @keyframes publishSpin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <div style={{ fontSize: "14px", color: "#475569", textAlign: "center" }}>
              Sending floor definition and navigation graph to backend...
            </div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
              POST /api/layouts/publish
            </div>
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "13px", color: "#7f1d1d", fontWeight: "500" }}>
              Please correct the following errors before publishing:
            </div>
            <div
              style={{
                maxHeight: "180px",
                overflowY: "auto",
                background: "#fef2f2",
                border: "1px solid #fee2e2",
                borderRadius: "8px",
                padding: "10px 14px",
                fontSize: "12px",
                color: "#991b1b",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {errors.length > 0 ? (
                errors.map((err, i) => (
                  <div key={i} style={{ display: "flex", gap: "6px", alignItems: "flex-start" }}>
                    <span style={{ color: "#ef4444" }}>•</span>
                    <span style={{ lineHeight: "1.4" }}>{err}</span>
                  </div>
                ))
              ) : (
                <div>An unknown error occurred while publishing.</div>
              )}
            </div>
          </div>
        )}

        {/* Success State */}
        {isSuccess && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ fontSize: "13px", color: "#166534" }}>
              The floor layout was successfully validated and saved in the Indoor Navigation backend.
            </div>

            {/* Counts Summary */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "8px",
              }}
            >
              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "10px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "11px", color: "#166534", fontWeight: "600", textTransform: "uppercase" }}>
                  Rooms
                </div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#15803d", marginTop: "2px" }}>
                  {result?.counts?.rooms ?? 0}
                </div>
              </div>

              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "10px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "11px", color: "#166534", fontWeight: "600", textTransform: "uppercase" }}>
                  Graph Nodes
                </div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#15803d", marginTop: "2px" }}>
                  {result?.counts?.nodes ?? 0}
                </div>
              </div>

              <div
                style={{
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  borderRadius: "8px",
                  padding: "10px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "11px", color: "#166534", fontWeight: "600", textTransform: "uppercase" }}>
                  Graph Edges
                </div>
                <div style={{ fontSize: "20px", fontWeight: "700", color: "#15803d", marginTop: "2px" }}>
                  {result?.counts?.edges ?? 0}
                </div>
              </div>
            </div>

            {result?.meta?.timestamp && (
              <div style={{ fontSize: "11px", color: "#64748b", textAlign: "right" }}>
                Published at: {new Date(result.meta.timestamp).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
          {isError && onRetry && (
            <button
              onClick={onRetry}
              style={{
                padding: "8px 16px",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
                color: "#334155",
                fontWeight: "500",
              }}
            >
              Retry
            </button>
          )}

          {!isPublishing && (
            <button
              onClick={onClose}
              style={{
                padding: "8px 20px",
                background: isSuccess ? "#15803d" : "#185fa5",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "13px",
                color: "#ffffff",
                fontWeight: "600",
                transition: "opacity 0.15s",
              }}
            >
              {isSuccess ? "Done" : "Close"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
