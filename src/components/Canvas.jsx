import { useState, useRef, useEffect } from "react";
import Sidebar from "./Sidebar";
import styles from "../css/Canvas.module.css";

export default function Canvas({
  mode, setMode,
  rooms, setRooms,
  nodes, setNodes,
  paths, setPaths,
  edges, setEdges,
  floorplan,
  scale, setScale,
  offset, setOffset,
  onUploadBlueprint,
}) {
  const [currentPolygon, setCurrentPolygon] = useState([]);
  const [mousePos, setMousePos]             = useState({ x: 0, y: 0 });
  const [roomTypeModal, setRoomTypeModal]   = useState(null);
  const [formModal, setFormModal]           = useState(null);
  const [selectedType, setSelectedType]     = useState("");
  const [hoveredTarget, setHoveredTarget]   = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [isDragging, setIsDragging]         = useState(false);
  const [imgLoaded, setImgLoaded]           = useState(false);

  const containerRef = useRef(null);
  const imgRef       = useRef(null);
  const isPanning    = useRef(false);
  const panStart     = useRef({ x: 0, y: 0 });
  const offsetStart  = useRef({ x: 0, y: 0 });
  const didPan       = useRef(false);
  const scaleRef     = useRef(scale);
  const offsetRef    = useRef(offset);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  // Reset imgLoaded when floorplan changes so fitToScreen re-runs
  useEffect(() => {
    setImgLoaded(false);
  }, [floorplan]);

  // ── Clamp: blueprint can't be panned off screen ───────────────────────────
  function clamp(ox, oy, s) {
    const el  = containerRef.current;
    const img = imgRef.current;
    if (!el || !img) return { x: ox, y: oy };

    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const iw = img.naturalWidth  * s;
    const ih = img.naturalHeight * s;

    const pad = 80;
    const minX = cw - iw - pad;
    const maxX = pad;
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

    const s  = el.clientWidth / img.naturalWidth;
    const ox = 0;
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

      const isTrackpadScroll = Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) < 80;

      if (isTrackpadScroll) {
        applyOffset(currO.x - e.deltaX, currO.y - e.deltaY, currS);
      } else {
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
    const point = toBlueprint(e.clientX, e.clientY);
    setMousePos(point);
    setHoveredTarget(findHoveredTarget(point));
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
    if (formModal || roomTypeModal) return;

    const { x, y } = toBlueprint(e.clientX, e.clientY);

    if (mode === "room" || mode === "path") {
      setCurrentPolygon((prev) => [...prev, { x, y }]);
    }
    if (mode === "door") {
      openDoorModal(x, y);
    }
  }

  function isPointInsidePolygon(point, polygon) {
    if (!Array.isArray(polygon) || polygon.length < 3) return false;

    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      const intersects =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

      if (intersects) inside = !inside;
    }

    return inside;
  }

  function findHoveredTarget(point) {
    let nearestDoor = null;

    rooms.forEach((room, roomIndex) => {
      room.doors?.forEach((door, doorIndex) => {
        const d = distance(point, door);
        if (d <= 10 && (!nearestDoor || d < nearestDoor.distance)) {
          nearestDoor = { type: "door", roomIndex, doorIndex, distance: d };
        }
      });
    });

    if (nearestDoor) {
      return {
        type: nearestDoor.type,
        roomIndex: nearestDoor.roomIndex,
        doorIndex: nearestDoor.doorIndex,
      };
    }

    let nearestPath = null;

    paths.forEach((path, pathIndex) => {
      for (let i = 0; i < path.points.length - 1; i++) {
        const projection = projectPointOnSegment(point, path.points[i], path.points[i + 1]);
        const d = distance(point, projection);
        const threshold = Math.max(path.width / 2 + 2, 6);

        if (d <= threshold && (!nearestPath || d < nearestPath.distance)) {
          nearestPath = { type: "path", pathIndex, distance: d };
        }
      }
    });

    if (nearestPath) {
      return {
        type: nearestPath.type,
        pathIndex: nearestPath.pathIndex,
      };
    }

    const roomIndex = rooms.findIndex((room) => isPointInsidePolygon(point, room.polygon));
    if (roomIndex < 0) return null;

    return { type: "room", roomIndex };
  }

  function removeTarget(target) {
    if (!target) return;

    if (target.type === "room") {
      setRooms((prev) => prev.filter((_, index) => index !== target.roomIndex));
    }

    if (target.type === "door") {
      setRooms((prev) =>
        prev.map((room, roomIndex) =>
          roomIndex !== target.roomIndex
            ? room
            : {
                ...room,
                doors: (room.doors || []).filter((_, doorIndex) => doorIndex !== target.doorIndex),
              }
        )
      );
    }

    if (target.type === "path") {
      setPaths((prev) => prev.filter((_, index) => index !== target.pathIndex));
    }

    setNodes([]);
    setEdges([]);
    setHoveredTarget(null);
    setSelectedTarget(null);
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
      const isDeleteShortcut = event.key === "Delete" || event.key === "Backspace";
      const isUndoShortcut =
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z";

      if (formModal || roomTypeModal) return;

      if (isDeleteShortcut && (selectedTarget || hoveredTarget)) {
        event.preventDefault();
        removeTarget(selectedTarget || hoveredTarget);
        return;
      }

      if (!isUndoShortcut) return;

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
  }, [mode, currentPolygon.length, formModal, roomTypeModal, hoveredTarget, selectedTarget]);

  function handleContextMenu(e) {
    if (!hoveredTarget) return;
    e.preventDefault();
    setSelectedTarget(hoveredTarget);
  }

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

  function getNodeKey(x, y) {
    return `${x}_${y}`;
  }

  function distance(a, b) {
    return Math.sqrt(
      Math.pow(a.x - b.x, 2) +
      Math.pow(a.y - b.y, 2)
    );
  }

  function projectPointOnSegment(point, start, end) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) return start;

    let t =
      ((point.x - start.x) * dx + (point.y - start.y) * dy) /
      lengthSquared;

    t = Math.max(0, Math.min(1, t));

    return {
      x: start.x + t * dx,
      y: start.y + t * dy,
    };
  }

  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function generateGraph() {
    let nodeCounter = 1;

    const generatedNodes = [];
    const generatedEdges = [];
    const graphSegments = [];
    const nodeMap = new Map();

    function getOrCreateNode(point) {
      const key = getNodeKey(point.x, point.y);

      if (nodeMap.has(key)) {
        return nodeMap.get(key);
      }

      const nodeId = `N${nodeCounter++}`;
      const node = {
        id: nodeId,
        x: point.x,
        y: point.y,
      };

      generatedNodes.push(node);
      nodeMap.set(key, nodeId);

      return nodeId;
    }

    paths.forEach((path) => {
      const pathNodeIds = path.points.map((point) => getOrCreateNode(point));

      for (let i = 0; i < pathNodeIds.length - 1; i++) {
        const currentNode = generatedNodes.find((n) => n.id === pathNodeIds[i]);
        const nextNode = generatedNodes.find((n) => n.id === pathNodeIds[i + 1]);
        const edgeDistance = distance(currentNode, nextNode);
        const roundedDistance = Math.round(edgeDistance * 100) / 100;

        generatedEdges.push({
          from: pathNodeIds[i],
          to: pathNodeIds[i + 1],
          distance: roundedDistance,
        });

        generatedEdges.push({
          from: pathNodeIds[i + 1],
          to: pathNodeIds[i],
          distance: roundedDistance,
        });

        graphSegments.push({
          startId: pathNodeIds[i],
          endId: pathNodeIds[i + 1],
          start: currentNode,
          end: nextNode,
        });
      }
    });

    rooms.forEach((room) => {
      room.doors?.forEach((door) => {
        let nearestSegment = null;
        let nearestProjection = null;
        let nearestSegmentDistance = Infinity;

        paths.forEach((path) => {
          for (let i = 0; i < path.points.length - 1; i++) {
            const start = path.points[i];
            const end = path.points[i + 1];
            const projection = projectPointOnSegment(door, start, end);
            const d = distance(door, projection);

            if (d < nearestSegmentDistance) {
              nearestSegmentDistance = d;
              nearestSegment = graphSegments.find(
                (segment) =>
                  segment.start.x === start.x &&
                  segment.start.y === start.y &&
                  segment.end.x === end.x &&
                  segment.end.y === end.y
              );
              nearestProjection = projection;
            }
          }
        });

        if (!nearestSegment || !nearestProjection) return;

        const junctionId = `J${nodeCounter++}`;

        generatedNodes.push({
          id: junctionId,
          x: nearestProjection.x,
          y: nearestProjection.y,
          type: "junction",
        });

        const distToStart = distance(nearestProjection, nearestSegment.start);
        const distToEnd = distance(nearestProjection, nearestSegment.end);

        generatedEdges.push({
          from: nearestSegment.startId,
          to: junctionId,
          distance: Math.round(distToStart * 100) / 100,
        });

        generatedEdges.push({
          from: junctionId,
          to: nearestSegment.startId,
          distance: Math.round(distToStart * 100) / 100,
        });

        generatedEdges.push({
          from: junctionId,
          to: nearestSegment.endId,
          distance: Math.round(distToEnd * 100) / 100,
        });

        generatedEdges.push({
          from: nearestSegment.endId,
          to: junctionId,
          distance: Math.round(distToEnd * 100) / 100,
        });

        const doorNodeId = `D${nodeCounter++}`;

        generatedNodes.push({
          id: doorNodeId,
          x: door.x,
          y: door.y,
          roomId: room.id,
          doorId: door.id,
          type: "door",
        });

        const doorDistance = distance(door, nearestProjection);

        generatedEdges.push({
          from: doorNodeId,
          to: junctionId,
          distance: Math.round(doorDistance * 100) / 100,
        });

        generatedEdges.push({
          from: junctionId,
          to: doorNodeId,
          distance: Math.round(doorDistance * 100) / 100,
        });
      });
    });

    setNodes(generatedNodes);
    setEdges(generatedEdges);

    downloadJson(
      {
        rooms,
        paths,
        graph: {
          nodes: generatedNodes,
          edges: generatedEdges,
        },
      },
      "floorDefinition.json"
    );
  }

  const cursor = isDragging ? "grabbing"
    : mode === "room" || mode === "path" ? "crosshair"
    : "grab";

  const sw = 2  / scale;
  const r4 = 4  / scale;
  const r6 = 6  / scale;
  const fs = 11 / scale;
  const doorCount = rooms.reduce(
    (count, room) => count + (room.doors?.length || 0),
    0
  );

  return (
    <div className={styles.wrapper}>
      <Sidebar
        mode={mode} setMode={setMode}
        currentPolygon={currentPolygon}
        onFinish={finishPolygon}
        onUndo={undoLastPoint}
        onGenerateGraph={generateGraph}
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
        onContextMenu={handleContextMenu}
      >
        <div
          className={styles.zoomLayer}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        >
          {floorplan ? (
            <img
              ref={imgRef}
              src={floorplan}
              alt="Floor blueprint"
              draggable={false}
              onLoad={() => setImgLoaded(true)}
            />
          ) : (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: "1200px",
              height: "800px",
              background: "#1e293b",
              border: "4px dashed #475569",
              borderRadius: "16px",
              color: "#e2e8f0",
              fontFamily: "system-ui, sans-serif",
              padding: "48px",
              boxSizing: "border-box",
              textAlign: "center",
            }}>
              <span style={{ fontSize: "64px", marginBottom: "20px" }}>🗺️</span>
              <h3 style={{ margin: "0 0 10px 0", fontSize: "24px", fontWeight: "700" }}>No Blueprint Loaded</h3>
              <p style={{ margin: "0 0 24px 0", fontSize: "14px", color: "#94a3b8", maxWidth: "400px", lineHeight: "1.6" }}>
                This floor doesn't have an active blueprint image. Import a JSON project file or upload an image to start designing!
              </p>
              <label style={{
                background: "#38bdf8",
                color: "#0f172a",
                padding: "10px 24px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => e.target.style.background = "#7dd3fc"}
              onMouseLeave={(e) => e.target.style.background = "#38bdf8"}
              >
                Upload Blueprint Image
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (onUploadBlueprint) {
                          onUploadBlueprint(event.target.result);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
          )}

          <svg>
            {/* Rooms */}
            {rooms.map((room, i) => (
              <g key={i}>
                <polygon
                  points={room.polygon.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill={
                    (hoveredTarget?.type === "room" && hoveredTarget.roomIndex === i) ||
                    (selectedTarget?.type === "room" && selectedTarget.roomIndex === i)
                    ? "rgba(215,25,49,0.18)"
                    : "rgba(0,100,255,0.15)"
                  }
                  stroke={
                    (hoveredTarget?.type === "room" && hoveredTarget.roomIndex === i) ||
                    (selectedTarget?.type === "room" && selectedTarget.roomIndex === i)
                    ? "#b51f35"
                    : "#1a7fbf"
                  }
                  strokeWidth={sw}
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
                fill="none"
                stroke={
                  (hoveredTarget?.type === "path" && hoveredTarget.pathIndex === i) ||
                  (selectedTarget?.type === "path" && selectedTarget.pathIndex === i)
                    ? "#b51f35"
                    : "orange"
                }
                strokeWidth={path.width / scale}
                opacity={0.5}
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
            {rooms.map((room, roomIndex) => room.doors?.map((door, i) => (
              <g key={`${room.id}-door-${i}`}>
                <circle
                  cx={door.x}
                  cy={door.y}
                  r={r6}
                  fill={
                    (hoveredTarget?.type === "door" && hoveredTarget.roomIndex === roomIndex && hoveredTarget.doorIndex === i) ||
                    (selectedTarget?.type === "door" && selectedTarget.roomIndex === roomIndex && selectedTarget.doorIndex === i)
                      ? "#ff4d4d"
                      : "lime"
                  }
                  stroke="black"
                  strokeWidth={sw}
                />
                <text x={door.x + 8 / scale} y={door.y} fontSize={fs} fontFamily="system-ui">{door.id}</text>
              </g>
            )))}
          </svg>
        </div>

        {/* Status bar */}
        <div className={styles.statusBar}>
          <span> {rooms.length} rooms</span>
          <span> {paths.length} paths</span>
          <span> {doorCount} doors</span>
          <span>x: {mousePos.x} · y: {mousePos.y}</span>
          {(selectedTarget || hoveredTarget) && (
            <button
              type="button"
              className={styles.quickDeleteBtn}
              onClick={() => removeTarget(selectedTarget || hoveredTarget)}
            >
              Delete Selected
            </button>
          )}
        </div>
      </div>
    </div>
  );
}