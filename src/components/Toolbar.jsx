export default function Toolbar({
  mode,
  setMode,
  rooms,
  paths,
  doors,
  nodes,
  edges,
}) {
  function exportJson() {
    const data = {
      rooms,
      paths,
    };

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      {
        type: "application/json",
      }
    );

    const link =
      document.createElement("a");

    link.href =
      URL.createObjectURL(blob);

    link.download =
      "officeLayout.json";

    link.click();
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        left: 10,
        zIndex: 1000,
        background: "white",
        padding: 10,
        borderRadius: 8,
        display: "flex",
        gap: 8,
      }}
    >
      <button
        onClick={() => setMode("room")}
      >
        Room
      </button>

      <button
        onClick={() => setMode("path")}
      >
        Path
      </button>

      <button
        onClick={() => setMode("door")}
      >
        Door
      </button>

      <button onClick={exportJson}>
        Export
      </button>

      <span>
        Current: {mode}
      </span>
    </div>
  );
}