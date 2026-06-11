import { useState } from "react";
import Toolbar from "../components/Toolbar";
import Canvas from "../components/Canvas";

export default function Editor() {
  const [mode, setMode] = useState("room");

  const [rooms, setRooms] = useState([]);
  const [corridors, setCorridors] = useState([]);
  const [doors, setDoors] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  return (
    <>
      <Toolbar
        mode={mode}
        setMode={setMode}
        rooms={rooms}
        doors={doors}
        nodes={nodes}
        edges={edges}
      />

      <Canvas
        mode={mode}
        rooms={rooms}
        setRooms={setRooms}
        corridors={corridors}
        setCorridors={setCorridors}
        doors={doors}
        setDoors={setDoors}
        nodes={nodes}
        setNodes={setNodes}
        edges={edges}
        setEdges={setEdges}
      />
    </>
  );
}