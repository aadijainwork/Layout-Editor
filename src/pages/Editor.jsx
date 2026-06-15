import { useState } from "react";
import Canvas from "../components/Canvas";

export default function Editor() {
  const [mode, setMode] = useState("room");

  const [rooms, setRooms] = useState([]);
  const [paths, setPaths] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

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
