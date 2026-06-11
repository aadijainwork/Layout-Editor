import { useState } from "react";
import floorplan from "../assets/hudson_floor5.jpg";

export default function Canvas({
  mode,
  rooms,
  setRooms,
  doors,
  setDoors,
  nodes,
  setNodes,
  corridors,
  setCorridors,
}) {
  const [currentPolygon, setCurrentPolygon] =
    useState([]);

  function handleClick(e) {
    const rect =
      e.currentTarget.getBoundingClientRect();

    const x =
      e.clientX - rect.left;

    const y =
      e.clientY - rect.top;

    if (
        mode === "room" ||
        mode === "corridor"
    ) {
        setCurrentPolygon(prev => [
        ...prev,
        {
            x: Math.round(x),
            y: Math.round(y)
        }
    ]);
    }

    if (mode === "door") {

        const id =
            prompt("Door Name");

        if (!id) return;

        const width =
            Number(
                prompt("Door Width")
            );

        setDoors(prev => [
            ...prev,
            {
             id,
             x: Math.round(x),
             y: Math.round(y),
             width
            }
        ]);

    }   
  }

  function finishPolygon() {
    if (
        currentPolygon.length < 3
    ) return;

    const name =
        prompt("Name");

    if (!name) return;

            if (mode === "room") {

    setRooms(prev => [
      ...prev,
      {
        id: name,
        polygon:
          currentPolygon
      }
    ]);

  }

  if (mode === "corridor") {

    setCorridors(prev => [
      ...prev,
      {
        id: name,
        polygon:
          currentPolygon
      }
    ]);

  }

  setCurrentPolygon([]);

}   

  return (
    <div
      style={{
        position: "relative",
      }}
    >
      <button
        onClick={finishPolygon}
        style={{
          position: "fixed",
          top: 60,
          left: 10,
          zIndex: 1000,
        }}
      >
        Finish Room
      </button>

      <img
        src={floorplan}
        alt=""
        style={{
          width: "100%",
          display: "block",
        }}
      />

      <svg
        onClick={handleClick}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      >
        {rooms.map(
          (room, index) => (
            <polygon
              key={index}
              points={room.polygon
                .map(
                  (p) =>
                    `${p.x},${p.y}`
                )
                .join(" ")}
              fill="rgba(0,0,255,0.2)"
              stroke="blue"
              strokeWidth="2"
            />
          )
        )}
        {corridors.map(
            (corridor, index) => (
                <polygon
                    key={`corridor-${index}`}
                    points={corridor.polygon
                        .map(
                            (p) =>
                        `${p.x},${p.y}`
                    )
                        .join(" ")}
                    fill="rgba(255,165,0,0.3)"
                    stroke="orange"
                    strokeWidth="2"
                    />
                     )
        )}

        {currentPolygon.length >
          1 && (
          <polyline
            points={currentPolygon
              .map(
                (p) =>
                  `${p.x},${p.y}`
              )
              .join(" ")}
            fill="none"
            stroke="red"
            strokeWidth="2"
          />
        )}

        {doors.map(
          (door, index) => (
            <circle
              key={index}
              cx={door.x}
              cy={door.y}
              r={5}
              fill="green"
            />
          )
        )}
      </svg>
    </div>
  );
}