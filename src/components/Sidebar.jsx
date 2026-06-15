import styles from "../css/Sidebar.module.css";

const ROOM_TYPES = [
  "Closed Room",
  "Open Space",
  "Lobby",
  "Staircase",
];

export default function Sidebar({
  mode,
  setMode,
  currentPolygon,
  onFinish,
  onUndo,
  onGenerateGraph,
  roomTypeModal,
  setRoomTypeModal,
  selectedType,
  setSelectedType,
}) {
  return (
    <div className={styles.sidebar}>

      {/* Logo */}
      <div className={styles.logo}>
        <span className={styles.logoIcon}></span>
        <span className={styles.logoText}>Floor Editor</span>
      </div>

      <div className={styles.divider} />

      {/* Tool buttons */}
      <button
        className={`${styles.toolBtn} ${mode === "room" ? styles.active : ""}`}
        onClick={() => setMode("room")}
      >
         Room
      </button>
      <button
        className={`${styles.toolBtn} ${mode === "path" ? styles.active : ""}`}
        onClick={() => setMode("path")}
      >
         Path
      </button>
      <button
        className={`${styles.toolBtn} ${mode === "door" ? styles.active : ""}`}
        onClick={() => setMode("door")}
      >
         Door
      </button>

      {/* Mode badge */}
      <div className={styles.modeBadge}>
        {mode} mode
      </div>

      <div className={styles.divider} />

      {/* Actions */}
      <button className={styles.finishBtn} onClick={onFinish}>
        ✓ Finish
      </button>
      <button
        className={styles.undoBtn}
        onClick={onUndo}
        disabled={
          currentPolygon.length === 0 ||
          (mode !== "room" && mode !== "path")
        }
      >
         Undo
      </button>

      {/* Point counter */}
      {currentPolygon.length > 0 && (
        <div className={styles.pointCounter}>
          {currentPolygon.length} point{currentPolygon.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Room type modal */}
      {roomTypeModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>Room Type</h3>
            <select
              className={styles.modalSelect}
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="" disabled>
                Select Room Type
              </option>
              {ROOM_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancel}
                onClick={() => { roomTypeModal.resolve(null); setRoomTypeModal(null); }}
              >
                Cancel
              </button>
              <button
                className={styles.modalOk}
                disabled={!selectedType}
                onClick={() => { roomTypeModal.resolve(selectedType); setRoomTypeModal(null); }}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Graph generation pinned to bottom */}
      <div className={styles.bottomActions}>
        <button className={styles.generateBtn} onClick={onGenerateGraph}>
          Generate Graph
        </button>
      </div>

    </div>
  );
}
