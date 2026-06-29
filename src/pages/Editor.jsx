import { useEffect, useState } from "react";
import Canvas from "../components/Canvas";

// ── Preloaded floor images ──────────────────────────────────────────────────
import floor5 from "../assets/hudson_floor5.jpg";
import floor6 from "../assets/hudson_floor6.jpg";
import floor7 from "../assets/hudson_floor7.jpg";

const AUTOSAVE_KEY = "layout-editor.autosave.v1";

function loadAutosavedState() {
  const defaultFloors = [
    {
      id: "floor-5",
      name: "5th Floor",
      blueprint: floor5,
      rooms: [],
      paths: [],
      nodes: [],
      edges: [],
      canvasState: { scale: 1, offset: { x: 0, y: 0 } }
    },
    {
      id: "floor-6",
      name: "6th Floor",
      blueprint: floor6,
      rooms: [],
      paths: [],
      nodes: [],
      edges: [],
      canvasState: { scale: 1, offset: { x: 0, y: 0 } }
    },
    {
      id: "floor-7",
      name: "7th Floor",
      blueprint: floor7,
      rooms: [],
      paths: [],
      nodes: [],
      edges: [],
      canvasState: { scale: 1, offset: { x: 0, y: 0 } }
    }
  ];

  const fallback = {
    floors: defaultFloors,
    activeFloorId: "floor-5",
    mode: "room",
  };

  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);

    if (parsed.rooms && !parsed.floors) {
      const migratedFloors = [
        {
          id: "floor-5",
          name: "5th Floor",
          blueprint: floor5,
          rooms: parsed.rooms || [],
          paths: parsed.paths || [],
          nodes: parsed.nodes || [],
          edges: parsed.edges || [],
          canvasState: { scale: 1, offset: { x: 0, y: 0 } }
        },
        {
          id: "floor-6",
          name: "6th Floor",
          blueprint: floor6,
          rooms: [],
          paths: [],
          nodes: [],
          edges: [],
          canvasState: { scale: 1, offset: { x: 0, y: 0 } }
        },
        {
          id: "floor-7",
          name: "7th Floor",
          blueprint: floor7,
          rooms: [],
          paths: [],
          nodes: [],
          edges: [],
          canvasState: { scale: 1, offset: { x: 0, y: 0 } }
        }
      ];
      return {
        floors: migratedFloors,
        activeFloorId: "floor-5",
        mode: typeof parsed.mode === "string" ? parsed.mode : "room",
      };
    }

    if (!Array.isArray(parsed.floors) || parsed.floors.length === 0) {
      return fallback;
    }

    const resolvedFloors = parsed.floors.map(f => {
      let bp = f.blueprint;
      if (bp === "floor5" || bp?.includes("hudson_floor5")) bp = floor5;
      else if (bp === "floor6" || bp?.includes("hudson_floor6")) bp = floor6;
      else if (bp === "floor7" || bp?.includes("hudson_floor7")) bp = floor7;

      return {
        id: f.id || `floor-${Date.now()}`,
        name: f.name || "Unnamed Floor",
        blueprint: bp || null,
        rooms: Array.isArray(f.rooms) ? f.rooms : [],
        paths: Array.isArray(f.paths) ? f.paths : [],
        nodes: Array.isArray(f.nodes) ? f.nodes : [],
        edges: Array.isArray(f.edges) ? f.edges : [],
        canvasState: f.canvasState || { scale: 1, offset: { x: 0, y: 0 } }
      };
    });

    return {
      floors: resolvedFloors,
      activeFloorId: parsed.activeFloorId || resolvedFloors[0].id,
      mode: typeof parsed.mode === "string" ? parsed.mode : "room",
    };
  } catch {
    return fallback;
  }
}

export default function Editor() {
  const initialState = loadAutosavedState();
  const [floors, setFloors] = useState(initialState.floors);
  const [activeFloorId, setActiveFloorId] = useState(initialState.activeFloorId);
  const [mode, setMode] = useState(initialState.mode);

  // Active floor states
  const activeFloor = floors.find(f => f.id === activeFloorId) || floors[0];
  const [rooms, setRooms] = useState(activeFloor.rooms);
  const [paths, setPaths] = useState(activeFloor.paths);
  const [nodes, setNodes] = useState(activeFloor.nodes);
  const [edges, setEdges] = useState(activeFloor.edges);
  const [selectedFloor, setSelectedFloor] = useState(activeFloor.blueprint);
  const [scale, setScale] = useState(activeFloor.canvasState?.scale ?? 1);
  const [offset, setOffset] = useState(activeFloor.canvasState?.offset ?? { x: 0, y: 0 });

  const [loadingFloor, setLoadingFloor] = useState(false);

  // Floor manager UI states
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFloorName, setNewFloorName] = useState("");
  const [newFloorBlueprintType, setNewFloorBlueprintType] = useState("floor5");
  const [newFloorBlueprintFile, setNewFloorBlueprintFile] = useState(null);

  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [floorToRename, setFloorToRename] = useState(null);
  const [renameFloorName, setRenameFloorName] = useState("");

  // Autosave when anything changes
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

 
 
   const floorsToSave = floors.map(f => {
      if (f.id === activeFloorId) {
        return {
          ...f,
          rooms,
          paths,
          nodes,
          edges,
          blueprint: selectedFloor,
          canvasState: { scale, offset }
        };
      }
      return f;
    });

    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(
        AUTOSAVE_KEY,
        JSON.stringify({
          floors: floorsToSave,
          activeFloorId,
          mode,
          savedAt: Date.now()
        })
      );
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [mode, floors, activeFloorId, rooms, paths, nodes, edges, scale, offset, selectedFloor]);

  const handleSwitchFloor = (newFloorId) => {
    if (newFloorId === activeFloorId) return;

    // Save current active floor state first
    setFloors(prev => prev.map(f => {
      if (f.id === activeFloorId) {
        return {
          ...f,
          rooms,
          paths,
          nodes,
          edges,
          blueprint: selectedFloor,
          canvasState: { scale, offset }
        };
      }
      return f;
    }));

    // Start transition
    setLoadingFloor(true);
    setRooms([]);
    setPaths([]);
    setNodes([]);
    setEdges([]);
    setSelectedFloor(null);

    setTimeout(() => {
      const nextFloor = floors.find(f => f.id === newFloorId);
      if (nextFloor) {
        setActiveFloorId(newFloorId);
        setSelectedFloor(nextFloor.blueprint || null);
        setRooms(nextFloor.rooms || []);
        setPaths(nextFloor.paths || []);
        setNodes(nextFloor.nodes || []);
        setEdges(nextFloor.edges || []);
        setScale(nextFloor.canvasState?.scale ?? 1);
        setOffset(nextFloor.canvasState?.offset ?? { x: 0, y: 0 });
      }
      setLoadingFloor(false);
    }, 150);
  };

  const handleAddFloorSubmit = () => {
    if (!newFloorName.trim()) return;

    let bp = null;
    if (newFloorBlueprintType === "floor5") bp = floor5;
    else if (newFloorBlueprintType === "floor6") bp = floor6;
    else if (newFloorBlueprintType === "floor7") bp = floor7;
    else if (newFloorBlueprintType === "custom") bp = newFloorBlueprintFile;

    const newFloorId = `floor-${Date.now()}`;
    const newFloorObj = {
      id: newFloorId,
      name: newFloorName.trim(),
      blueprint: bp,
      rooms: [],
      paths: [],
      nodes: [],
      edges: [],
      canvasState: { scale: 1, offset: { x: 0, y: 0 } }
    };

    // Save current floor first
    const updatedFloors = floors.map(f => {
      if (f.id === activeFloorId) {
        return {
          ...f,
          rooms,
          paths,
          nodes,
          edges,
          blueprint: selectedFloor,
          canvasState: { scale, offset }
        };
      }
      return f;
    });

    const nextFloors = [...updatedFloors, newFloorObj];
    setFloors(nextFloors);

    // Switch sequence
    setLoadingFloor(true);
    setRooms([]);
    setPaths([]);
    setNodes([]);
    setEdges([]);
    setSelectedFloor(null);

    setTimeout(() => {
      setActiveFloorId(newFloorId);
      setSelectedFloor(bp);
      setRooms([]);
      setPaths([]);
      setNodes([]);
      setEdges([]);
      setScale(1);
      setOffset({ x: 0, y: 0 });
      setLoadingFloor(false);
    }, 150);

    // Reset modals and inputs
    setIsAddModalOpen(false);
    setNewFloorName("");
    setNewFloorBlueprintType("floor5");
    setNewFloorBlueprintFile(null);
    setIsManagerOpen(false);
  };

  const handleRenameFloorSubmit = () => {
    if (!renameFloorName.trim() || !floorToRename) return;

    setFloors(prev => prev.map(f => {
      if (f.id === floorToRename.id) {
        return {
          ...f,
          name: renameFloorName.trim()
        };
      }
      return f;
    }));

    setIsRenameModalOpen(false);
    setFloorToRename(null);
    setRenameFloorName("");
  };

  const handleDuplicateFloor = (floorToDup) => {
    const isDupActive = floorToDup.id === activeFloorId;
    const currentRooms = isDupActive ? rooms : floorToDup.rooms;
    const currentPaths = isDupActive ? paths : floorToDup.paths;
    const currentNodes = isDupActive ? nodes : floorToDup.nodes;
    const currentEdges = isDupActive ? edges : floorToDup.edges;
    const currentBlueprint = isDupActive ? selectedFloor : floorToDup.blueprint;
    const currentScale = isDupActive ? scale : (floorToDup.canvasState?.scale ?? 1);
    const currentOffset = isDupActive ? offset : (floorToDup.canvasState?.offset ?? { x: 0, y: 0 });

    const newFloorId = `floor-${Date.now()}`;
    const duplicatedFloor = {
      id: newFloorId,
      name: `${floorToDup.name} (Copy)`,
      blueprint: currentBlueprint,
      rooms: JSON.parse(JSON.stringify(currentRooms)),
      paths: JSON.parse(JSON.stringify(currentPaths)),
      nodes: JSON.parse(JSON.stringify(currentNodes)),
      edges: JSON.parse(JSON.stringify(currentEdges)),
      canvasState: { scale: currentScale, offset: { ...currentOffset } }
    };

    const updatedFloors = floors.map(f => {
      if (f.id === activeFloorId) {
        return {
          ...f,
          rooms,
          paths,
          nodes,
          edges,
          blueprint: selectedFloor,
          canvasState: { scale, offset }
        };
      }
      return f;
    });

    const nextFloors = [...updatedFloors, duplicatedFloor];
    setFloors(nextFloors);

    setLoadingFloor(true);
    setRooms([]);
    setPaths([]);
    setNodes([]);
    setEdges([]);
    setSelectedFloor(null);

    setTimeout(() => {
      setActiveFloorId(newFloorId);
      setSelectedFloor(duplicatedFloor.blueprint);
      setRooms(duplicatedFloor.rooms);
      setPaths(duplicatedFloor.paths);
      setNodes(duplicatedFloor.nodes);
      setEdges(duplicatedFloor.edges);
      setScale(duplicatedFloor.canvasState.scale);
      setOffset(duplicatedFloor.canvasState.offset);
      setLoadingFloor(false);
    }, 150);

    setIsManagerOpen(false);
  };

  const handleDeleteFloor = (idToDelete) => {
    if (floors.length <= 1) {
      alert("Cannot delete the last floor. You must have at least one floor.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this floor and all its objects?")) {
      const updatedFloors = floors.filter(f => f.id !== idToDelete);

      if (activeFloorId === idToDelete) {
        const deletedIndex = floors.findIndex(f => f.id === idToDelete);
        const nextActiveIndex = deletedIndex === 0 ? 0 : deletedIndex - 1;
        const nextActiveFloor = updatedFloors[nextActiveIndex];

        setFloors(updatedFloors);

        setLoadingFloor(true);
        setRooms([]);
        setPaths([]);
        setNodes([]);
        setEdges([]);
        setSelectedFloor(null);

        setTimeout(() => {
          setActiveFloorId(nextActiveFloor.id);
          setSelectedFloor(nextActiveFloor.blueprint);
          setRooms(nextActiveFloor.rooms || []);
          setPaths(nextActiveFloor.paths || []);
          setNodes(nextActiveFloor.nodes || []);
          setEdges(nextActiveFloor.edges || []);
          setScale(nextActiveFloor.canvasState?.scale ?? 1);
          setOffset(nextActiveFloor.canvasState?.offset ?? { x: 0, y: 0 });
          setLoadingFloor(false);
        }, 150);
      } else {
        setFloors(updatedFloors);
      }
    }
  };

  const triggerRenameFloor = (floor) => {
    setFloorToRename(floor);
    setRenameFloorName(floor.name);
    setIsRenameModalOpen(true);
  };

  return (
    <>
      {/* Floor Manager dropdown / widget - floating top right */}
      <div style={{
        position: "fixed",
        top: "12px",
        right: "12px",
        zIndex: 1000,
        fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
      }}>
        <div style={{
          background: "#ffffff",
          color: "#185fa5",
          border: "1px solid #b5d4f4",
          borderRadius: "8px",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
          boxShadow: "0 4px 6px -1px rgba(24, 95, 165, 0.1), 0 2px 4px -1px rgba(24, 95, 165, 0.06)",
          transition: "all 0.2s ease",
          fontSize: "14px",
          fontWeight: "600",
          userSelect: "none",
        }}
        onClick={() => setIsManagerOpen(!isManagerOpen)}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#f3f8fd";
          e.currentTarget.style.borderColor = "#378add";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#ffffff";
          e.currentTarget.style.borderColor = "#b5d4f4";
        }}
        >
          <span>🏢 {activeFloor?.name || "No Floor Selected"}</span>
          <span style={{
            fontSize: "10px",
            transform: isManagerOpen ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
            color: "#185fa5"
          }}>▼</span>
        </div>

        {isManagerOpen && (
          <div style={{
            background: "#ffffff",
            border: "1px solid #b5d4f4",
            borderRadius: "10px",
            padding: "16px",
            marginTop: "8px",
            width: "280px",
            boxShadow: "0 10px 15px -3px rgba(24, 95, 165, 0.15), 0 4px 6px -2px rgba(24, 95, 165, 0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            color: "#333333",
          }}>
            <div style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#64748b",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              borderBottom: "1px solid #e2e8f0",
              paddingBottom: "8px",
            }}>
              Floor List
            </div>

            <div style={{
              maxHeight: "180px",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}>
              {floors.map(floor => {
                const isActive = floor.id === activeFloorId;
                return (
                  <div key={floor.id} style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: isActive ? "#e6f1fb" : "transparent",
                    border: isActive ? "1px solid #b5d4f4" : "1px solid transparent",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "#f3f8fd";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: isActive ? "600" : "400",
                        color: isActive ? "#185fa5" : "#475569",
                        cursor: "pointer",
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      onClick={() => handleSwitchFloor(floor.id)}
                    >
                      {floor.name}
                    </span>

                    <div style={{ display: "flex", gap: "2px" }}>
                      <button
                        title="Rename Floor"
                        onClick={() => triggerRenameFloor(floor)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "13px",
                          padding: "2px",
                          opacity: 0.6,
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
                      >
                        ✏️
                      </button>
                      <button
                        title="Duplicate Floor"
                        onClick={() => handleDuplicateFloor(floor)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "13px",
                          padding: "2px",
                          opacity: 0.6,
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
                        onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
                      >
                        👥
                      </button>
                      <button
                        title="Delete Floor"
                        disabled={floors.length <= 1}
                        onClick={() => handleDeleteFloor(floor.id)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: floors.length <= 1 ? "not-allowed" : "pointer",
                          fontSize: "13px",
                          padding: "2px",
                          opacity: floors.length <= 1 ? 0.2 : 0.6,
                        }}
                        onMouseEnter={e => { if (floors.length > 1) e.currentTarget.style.opacity = "1"; }}
                        onMouseLeave={e => { if (floors.length > 1) e.currentTarget.style.opacity = "0.6"; }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{
              borderTop: "1px solid #e2e8f0",
              paddingTop: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}>
              <button
                onClick={() => setIsAddModalOpen(true)}
                style={{
                  background: "#185fa5",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "background 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "#0f4a85"}
                onMouseLeave={e => e.currentTarget.style.background = "#185fa5"}
              >
                ➕ Add New Floor
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add Floor Modal */}
      {isAddModalOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(24, 95, 165, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          fontFamily: "system-ui, sans-serif",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "#ffffff",
            border: "1px solid #b5d4f4",
            borderRadius: "12px",
            padding: "24px",
            width: "360px",
            boxShadow: "0 20px 25px -5px rgba(24, 95, 165, 0.15), 0 10px 10px -5px rgba(24, 95, 165, 0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            color: "#333333",
          }}>
            <h3 style={{ margin: "0", fontSize: "16px", fontWeight: "700", color: "#185fa5" }}>Add New Floor</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "500", color: "#555555" }}>Floor Name</label>
              <input
                type="text"
                value={newFloorName}
                onChange={(e) => setNewFloorName(e.target.value)}
                placeholder="e.g. 8th Floor"
                style={{
                  padding: "8px 12px",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#333333",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "500", color: "#555555" }}>Blueprint Image</label>
              <select
                value={newFloorBlueprintType}
                onChange={(e) => {
                  setNewFloorBlueprintType(e.target.value);
                  if (e.target.value !== "custom") {
                    setNewFloorBlueprintFile(null);
                  }
                }}
                style={{
                  padding: "8px 12px",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#333333",
                }}
              >
                <option value="floor5">Hudson Floor 5 (Preset)</option>
                <option value="floor6">Hudson Floor 6 (Preset)</option>
                <option value="floor7">Hudson Floor 7 (Preset)</option>
                <option value="none">No Blueprint (Blank Canvas)</option>
                <option value="custom">Upload Custom Blueprint...</option>
              </select>
            </div>

            {newFloorBlueprintType === "custom" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "500", color: "#555555" }}>Choose Image File</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        setNewFloorBlueprintFile(event.target.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  style={{
                    padding: "6px 8px",
                    background: "#ffffff",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "13px",
                    color: "#333333",
                  }}
                />
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setNewFloorName("");
                  setNewFloorBlueprintType("floor5");
                  setNewFloorBlueprintFile(null);
                }}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#555555",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddFloorSubmit}
                disabled={!newFloorName.trim() || (newFloorBlueprintType === "custom" && !newFloorBlueprintFile)}
                style={{
                  padding: "8px 18px",
                  border: "none",
                  borderRadius: "6px",
                  background: "#185fa5",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "13px",
                  opacity: (!newFloorName.trim() || (newFloorBlueprintType === "custom" && !newFloorBlueprintFile)) ? 0.5 : 1,
                }}
              >
                Add Floor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Floor Modal */}
      {isRenameModalOpen && floorToRename && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(24, 95, 165, 0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
          fontFamily: "system-ui, sans-serif",
          backdropFilter: "blur(4px)",
        }}>
          <div style={{
            background: "#ffffff",
            border: "1px solid #b5d4f4",
            borderRadius: "12px",
            padding: "24px",
            width: "320px",
            boxShadow: "0 20px 25px -5px rgba(24, 95, 165, 0.15), 0 10px 10px -5px rgba(24, 95, 165, 0.1)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            color: "#333333",
          }}>
            <h3 style={{ margin: "0", fontSize: "16px", fontWeight: "700", color: "#185fa5" }}>Rename Floor</h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "500", color: "#555555" }}>New Floor Name</label>
              <input
                type="text"
                value={renameFloorName}
                onChange={(e) => setRenameFloorName(e.target.value)}
                placeholder={floorToRename.name}
                style={{
                  padding: "8px 12px",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#333333",
                }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
              <button
                onClick={() => {
                  setIsRenameModalOpen(false);
                  setFloorToRename(null);
                  setRenameFloorName("");
                }}
                style={{
                  padding: "8px 16px",
                  background: "transparent",
                  border: "1px solid #cbd5e1",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "#555555",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRenameFloorSubmit}
                disabled={!renameFloorName.trim()}
                style={{
                  padding: "8px 18px",
                  border: "none",
                  borderRadius: "6px",
                  background: "#185fa5",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontWeight: "600",
                  fontSize: "13px",
                  opacity: !renameFloorName.trim() ? 0.5 : 1,
                }}
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loadingFloor && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(240, 244, 248, 0.85)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 3000,
          fontFamily: "system-ui, sans-serif",
          backdropFilter: "blur(6px)",
        }}>
          <div style={{
            width: "50px",
            height: "50px",
            border: "3px solid #e6f1fb",
            borderTop: "3px solid #185fa5",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            marginBottom: "16px",
          }} />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <div style={{ color: "#185fa5", fontSize: "16px", fontWeight: "600", letterSpacing: "0.05em" }}>
            Switching Floors...
          </div>
        </div>
      )}

      <Canvas
        mode={mode}       setMode={setMode}
        rooms={rooms}     setRooms={setRooms}
        paths={paths}     setPaths={setPaths}
        nodes={nodes}     setNodes={setNodes}
        edges={edges}     setEdges={setEdges}
        floorplan={selectedFloor}
        scale={scale}     setScale={setScale}
        offset={offset}   setOffset={setOffset}
        onUploadBlueprint={(imgSrc) => setSelectedFloor(imgSrc)}
      />
    </>
  );
}