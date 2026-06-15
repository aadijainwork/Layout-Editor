import { useState, useRef, useEffect } from "react";
import floorplan from "../assets/hudson_floor5.jpg";
import Sidebar from "./Sidebar";
import styles from "../css/Canvas.module.css";

export default function Canvas({
  mode, setMode,
  rooms, setRooms,
  doors, setDoors,
  nodes, setNodes,
  paths, setPaths,
}) {
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [mousePos, setMousePos]             = useState({ x: 0, y: 0 });
  const [roomTypeModal, setRoomTypeModal]   = useState(null);
  const [formModal, setFormModal]           = useState(null);
  const [selectedType, setSelectedType]     = useState("");
  const [scale, setScale]                   = useState(1);
  const [offset, setOffset]                 = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging]         = useState(false);
  const [imgLoaded, setImgLoaded]           = useState(false);

  const containerRef = useRef(null);
  const imgRef       = useRef(null);
  const isPanning    = useRef(false);
  const panStart     = useRef({ x: 0, y: 0 });
  const offsetStart  = useRef({ x: 0, y: 0 });
  const didPan       = useRef(false);
  const scaleRef     = useRef(1);
  const offsetRef    = useRef({ x: 0, y: 0 });

  // ── Clamp: blueprint can't be panned off screen ───────────────────────────
  function clamp(ox, oy, s) {
    const el  = containerRef.current;
    const img = imgRef.current;
    if (!el || !img) return { x: ox, y: oy };

    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const iw = img.naturalWidth  * s;
    const ih = img.naturalHeight * s;

    // Blueprint must stay at least 80px inside the canvas on every edge
    const pad = 80;
    const minX = cw - iw - pad;   // how far left blueprint can go
    const maxX = pad;              // how far right blueprint can go
    const minY = ch - ih - pad;
    const maxY = pad;

    return {
      x: Math.min(maxX, Math.max(minX, ox)),
      y: Math.min(maxY, Math.max(minY, oy)),
    };
  }

  function applyOffset(ox, oy, s) {
    const c = clamp(ox, oy, s ?? scaleRef.current);
    offsetRef.current = c;
    setOffset(c);
  }

  // ── Fit blueprint to fill canvas width on load ────────────────────────────
  function fitToScreen() {
    const img = imgRef.current;
    const el  = containerRef.current;
    if (!img || !el || !img.naturalWidth) return;

    // Fit by WIDTH so there's no horizontal blank space
    const s  = el.clientWidth / img.naturalWidth;
    const ox = 0; // flush left
    const oy = (el.clientHeight - img.naturalHeight * s) / 2;

    scaleRef.current  = s;
    offsetRef.current = { x: ox, y: oy };
    setScale(s);
    setOffset({ x: ox, y: oy });
  }

  useEffect(() => {
    if (!imgLoaded) return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        fitToScreen();
        ro.disconnect();
      }
    });
    ro.observe(el);
    if (el.clientWidth > 0) fitToScreen();
    return () => ro.disconnect();
  }, [imgLoaded]);

  // ── Wheel: zoom + two-finger trackpad pan ─────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      e.preventDefault();
      const rect  = el.getBoundingClientRect();
      const mx    = e.clientX - rect.left;
      const my    = e.clientY - rect.top;
      const currS = scaleRef.current;
      const currO = offsetRef.current;

      // ctrlKey=true → pinch-to-zoom gesture
      if (e.ctrlKey) {
        const factor = e.deltaY < 0 ? 1.08 : 0.93;
        const next   = Math.min(Math.max(currS * factor, 0.1), 10);
        scaleRef.current = next;
        setScale(next);
        applyOffset(
          mx - (mx - currO.x) * (next / currS),
          my - (my - currO.y) * (next / currS),
          next
        );
        return;
      }

      // deltaX present → two-finger horizontal scroll
      // deltaY only → could be vertical scroll or mouse wheel
      const isTrackpadScroll = Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) < 80;

      if (isTrackpadScroll) {
        // Two-finger trackpad pan — use deltaX/deltaY directly
        applyOffset(currO.x - e.deltaX, currO.y - e.deltaY, currS);
      } else {
        // Mouse wheel → zoom toward cursor
        const factor = e.deltaY < 0 ? 1.12 : 0.9;
        const next   = Math.min(Math.max(currS * factor, 0.1), 10);
        scaleRef.current = next;
        setScale(next);
        applyOffset(
          mx - (mx - currO.x) * (next / currS),
          my - (my - currO.y) * (next / currS),
          next
        );
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Coordinate conversion ─────────────────────────────────────────────────
  function toBlueprint(clientX, clientY) {
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: Math.round((clientX - rect.left - offsetRef.current.x) / scaleRef.current),
      y: Math.round((clientY - rect.top  - offsetRef.current.y) / scaleRef.current),
    };
  }

  // ── Mouse drag to pan ─────────────────────────────────────────────────────
  function handleMouseDown(e) {
    if (e.button !== 0) return;
    isPanning.current   = true;
    didPan.current      = false;
    panStart.current    = { x: e.clientX, y: e.clientY };
    offsetStart.current = { ...offsetRef.current };
    setIsDragging(true);
  }

  function handleMouseMove(e) {
    setMousePos(toBlueprint(e.clientX, e.clientY));
    if (!isPanning.current) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPan.current = true;
    applyOffset(offsetStart.current.x + dx, offsetStart.current.y + dy, scaleRef.current);
  }

  function handleMouseUp() {
    isPanning.current = false;
    setIsDragging(false);
  }

  // ── Click: place polygon point ────────────────────────────────────────────
  function handleClick(e) {
    if (didPan.current) { didPan.current = false; return; }
    const { x, y } = toBlueprint(e.clientX, e.clientY);

    if (mode === "room" || mode === "path") {
      setCurrentPolygon((prev) => [...prev, { x, y }]);
    }
    if (mode === "door") {
      openDoorModal(x, y);
    }
  }

  // ── Room type modal ───────────────────────────────────────────────────────
  function showRoomTypeDropdown() {
    return new Promise((resolve) => {
      setSelectedType("");
      setRoomTypeModal({ resolve });
    });
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      const isUndoShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z";

      if (!isUndoShortcut) return;

      if (formModal || roomTypeModal) return;

      if (
        (mode === "room" || mode === "path") &&
        currentPolygon.length > 0
      ) {
        event.preventDefault();
        undoLastPoint();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, currentPolygon.length, formModal, roomTypeModal]);

  function showFormDialog(config) {
    return new Promise((resolve) => {
      const initialValues = config.fields.reduce(
        (acc, field) => ({
          ...acc,
          [field.name]: field.defaultValue ?? "",
        }),
        {}
      );

      setFormModal({
        title: config.title,
        fields: config.fields,
        values: initialValues,
        resolve,
      });
    });
  }

  function closeFormModal(result = null) {
    if (!formModal) return;
    formModal.resolve(result);
    setFormModal(null);
  }

  function updateFormValue(name, value) {
    setFormModal((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        values: {
          ...prev.values,
          [name]: value,
        },
      };
    });
  }

  async function openDoorModal(x, y) {
    const result = await showFormDialog({
      title: "Add Door",
      fields: [
        { name: "id", label: "Door Number" },
        { name: "width", label: "Door Width", type: "number", defaultValue: "1" },
        { name: "roomId", label: "Room Name" },
      ],
    });

    if (!result) return;

    const id = result.id?.trim();
    const roomId = result.roomId?.trim();
    const width = Number(result.width);

    if (!id || !roomId || Number.isNaN(width)) return;

    setRooms((prev) =>
      prev.map((room) =>
        room.id !== roomId
          ? room
          : {
              ...room,
              doors: [...(room.doors || []), { id, x, y, width }],
            }
      )
    );
  }

  async function finishPolygon() {
    if (currentPolygon.length < 3) return;

    if (mode === "room") {
      const roomResult = await showFormDialog({
        title: "Create Room",
        fields: [{ name: "name", label: "Room Name" }],
      });

      const name = roomResult?.name?.trim();
      if (!name) return;

      const type = await showRoomTypeDropdown(); if (!type) return;
      setRooms((prev) => [...prev, { id: name, type, polygon: currentPolygon, doors: [] }]);
    }

    if (mode === "path") {
      const pathResult = await showFormDialog({
        title: "Create Path",
        fields: [{ name: "width", label: "Path Width", type: "number", defaultValue: "2" }],
      });

      const width = Number(pathResult?.width);
      if (!pathResult || Number.isNaN(width)) return;

      setPaths((prev) => [...prev, { id: `path_${prev.length + 1}`, width, points: currentPolygon }]);
    }

    setCurrentPolygon([]);
  }

  function undoLastPoint() {
    setCurrentPolygon((prev) => prev.slice(0, -1));
  }

  function handleExport() {
    const blob = new Blob([JSON.stringify({ rooms, paths, doors }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hudson_f5_layout.json";
    a.click();
  }

  const cursor = isDragging ? "grabbing"
    : mode === "room" || mode === "path" ? "crosshair"
    : "grab";

  const sw = 2  / scale;
  const r4 = 4  / scale;
  const r6 = 6  / scale;
  const fs = 11 / scale;

  return (
    <div className={styles.wrapper}>
      <Sidebar
        mode={mode} setMode={setMode}
        rooms={rooms} paths={paths} doors={doors}
        currentPolygon={currentPolygon}
        onFinish={finishPolygon}
        onUndo={undoLastPoint}
        onExport={handleExport}
        roomTypeModal={roomTypeModal}
        setRoomTypeModal={setRoomTypeModal}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
      />

      {formModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3 className={styles.modalTitle}>{formModal.title}</h3>

            {formModal.fields.map((field) => (
              <label key={field.name} className={styles.formLabel}>
                {field.label}
                <input
                  className={styles.formInput}
                  type={field.type || "text"}
                  value={formModal.values[field.name] ?? ""}
                  onChange={(e) =>
                    updateFormValue(
                      field.name,
                      e.target.value
                    )
                  }
                />
              </label>
            ))}

            <div className={styles.modalActions}>
              <button
                className={styles.modalCancel}
                onClick={() => closeFormModal(null)}
              >
                Cancel
              </button>
              <button
                className={styles.modalOk}
                onClick={() =>
                  closeFormModal(formModal.values)
                }
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        className={styles.canvasArea}
        style={{ cursor }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
      >
        <div
          className={styles.zoomLayer}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        >
          <img
            ref={imgRef}
            src={floorplan}
            alt="Floor blueprint"
            draggable={false}
            onLoad={() => setImgLoaded(true)}
          />

          <svg>
            {/* Rooms */}
            {rooms.map((room, i) => (
              <g key={i}>
                <polygon
                  points={room.polygon.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="rgba(0,100,255,0.15)" stroke="#1a7fbf" strokeWidth={sw}
                />
                <text
                  x={room.polygon.reduce((s, p) => s + p.x, 0) / room.polygon.length}
                  y={room.polygon.reduce((s, p) => s + p.y, 0) / room.polygon.length}
                  textAnchor="middle" fontSize={fs} fill="#185FA5"
                  fontWeight="600" fontFamily="system-ui" pointerEvents="none"
                >{room.id}</text>
              </g>
            ))}

            {/* Paths */}
            {paths.map((path, i) => (
              <polyline key={i}
                points={path.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none" stroke="orange" strokeWidth={path.width / scale} opacity={0.5}
              />
            ))}
            {paths.map((path) => path.points.map((pt, i) => (
              <circle key={`${path.id}-${i}`} cx={pt.x} cy={pt.y} r={r4} fill="orange" />
            )))}

            {/* In-progress polygon */}
            {currentPolygon.length > 1 && (
              <polyline
                points={currentPolygon.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none" stroke="red" strokeWidth={sw}
                strokeDasharray={`${6 / scale},${4 / scale}`}
              />
            )}
            {currentPolygon.map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r={r4} fill="red" opacity={0.8} />
            ))}

            {/* Doors */}
            {rooms.map((room) => room.doors?.map((door, i) => (
              <g key={`${room.id}-door-${i}`}>
                <circle cx={door.x} cy={door.y} r={r6} fill="lime" stroke="black" strokeWidth={sw} />
                <text x={door.x + 8 / scale} y={door.y} fontSize={fs} fontFamily="system-ui">{door.id}</text>
              </g>
            )))}
          </svg>
        </div>

        {/* Status bar */}
        <div className={styles.statusBar}>
          <span> {rooms.length} rooms</span>
          <span> {paths.length} paths</span>
          <span> {doors.length} doors</span>
          <span>x: {mousePos.x} · y: {mousePos.y}</span>
        </div>
      </div>
    </div>
  );
}
