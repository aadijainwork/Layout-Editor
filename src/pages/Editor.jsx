import { useEffect, useState } from "react";
import Canvas from "../components/Canvas";

const AUTOSAVE_KEY = "layout-editor.autosave.v1";

function loadAutosavedState() {
  const fallback = {
    mode: "room",
    rooms: [],
    paths: [],
    nodes: [],
    edges: [],
  };

  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return fallback;

    const parsed = JSON.parse(raw);

    return {
      mode: typeof parsed.mode === "string" ? parsed.mode : fallback.mode,
      rooms: Array.isArray(parsed.rooms) ? parsed.rooms : fallback.rooms,
      paths: Array.isArray(parsed.paths) ? parsed.paths : fallback.paths,
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : fallback.nodes,
      edges: Array.isArray(parsed.edges) ? parsed.edges : fallback.edges,
    };
  } catch {
    return fallback;
  }
}

export default function Editor() {
  const initialState = loadAutosavedState();
  const [mode, setMode] = useState(initialState.mode);

  const [rooms, setRooms] = useState(initialState.rooms);
  const [paths, setPaths] = useState(initialState.paths);
  const [nodes, setNodes] = useState(initialState.nodes);
  const [edges, setEdges] = useState(initialState.edges);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const timeoutId = window.setTimeout(() => {
      window.localStorage.setItem(
        AUTOSAVE_KEY,
        JSON.stringify({ mode, rooms, paths, nodes, edges, savedAt: Date.now() })
      );
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [mode, rooms, paths, nodes, edges]);

  return (
    <Canvas
      mode={mode}
      setMode={setMode}
      rooms={rooms}
      setRooms={setRooms}
      paths={paths}
      setPaths={setPaths}
      nodes={nodes}
      setNodes={setNodes}
      edges={edges}
      setEdges={setEdges}
    />
  );
}
