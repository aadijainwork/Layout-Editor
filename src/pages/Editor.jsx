import { useState } from "react";
import Toolbar from "../components/Toolbar";
import Canvas from "../components/Canvas";

export default function Editor() {
  const [mode, setMode] = useState("room");

  const [rooms, setRooms] = useState([]);
  const [paths, setPaths] = useState([]);
  const [doors, setDoors] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  return (
    <>
      <Toolbar
        mode={mode}
        setMode={setMode}
        rooms={rooms}
        paths={paths}
        doors={doors}
        nodes={nodes}
        edges={edges}
      />

      <Canvas
        mode={mode}
        rooms={rooms}
        setRooms={setRooms}
        paths={paths}
        setPaths={setPaths}
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