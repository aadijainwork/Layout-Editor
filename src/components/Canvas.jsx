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
  paths,
  setPaths,
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
        mode === "path"
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

        const roomId =
            prompt(
                "Room Name"
            );

    if (!roomId) return;

    setRooms(prev =>
        prev.map(room => {

            if (
                room.id !== roomId
            ) {
                return room;
            }

            return {
                ...room,

                doors: [
                    ...(room.doors || []),

                    {
                        id,
                        x: Math.round(x),
                        y: Math.round(y),
                        width
                    }
                ]
            };

        })
    );

}
  }

  function finishPolygon() {
    if (
        currentPolygon.length < 3
    ) return;

    if (mode === "room") {

        const name =
            prompt("Room Name");

        if (!name) return;

        const type =
            prompt(
                "Room Type:\n\nroom\nopen_space\nlobby\nstaircase"
            );

        if (!type) return;

        setRooms(prev => [
            ...prev,
            {
                id: name,
                type: type,
                polygon: currentPolygon,
                doors: []
            }
        ]);
    }

    if (mode === "path") {

        const width =
            Number(
                prompt(
                    "Path Width"
                )
            );

        setPaths(prev => [
            ...prev,
            {
                id:
                    `path_${prev.length + 1}`,
                width,
                points:
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
        Finish
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
        {paths.map(
            (path, index) => (
                <polyline
                    key={index}
                    points={path.points
                        .map(
                            p =>
                                `${p.x},${p.y}`
                            )
                            .join(" ")}
                        fill="none"
                        stroke="orange"
                        strokeWidth={
                            path.width
                        }
                        opacity={0.4}
                />
            )
        )}
        {paths.map(path =>
            path.points.map(
                (point, index) => (
                    <circle
                        key={`${path.id}-${index}`}
                        cx={point.x}
                        cy={point.y}
                        r={5}
                        fill="red"
                />
            )
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