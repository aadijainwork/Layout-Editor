export default function Toolbar({
  mode,
  setMode,
  rooms,
  paths,
}) {

  function getNodeKey(x, y) {
    return `${x}_${y}`;
  }

  function distance(a, b) {

    return Math.sqrt(
        Math.pow(a.x - b.x, 2) +
        Math.pow(a.y - b.y, 2)
      );
    }
  
  function projectPointOnSegment(
    point,
    start,
    end
    ) {

    const dx =
        end.x - start.x;

    const dy =
        end.y - start.y;

    const lengthSquared =
        dx * dx +
        dy * dy;

    if (
        lengthSquared === 0
    ) {
        return start;
    }

    let t =
        (
        (point.x - start.x) *
        dx +
        (point.y - start.y) *
        dy
        ) / lengthSquared;

    t = Math.max(
        0,
        Math.min(1, t)
    );

    return {

        x:
        start.x +
        t * dx,

        y:
        start.y +
        t * dy

    };

    }
  
  function generateGraph() {


    console.log("Generate Graph clicked");

    let nodeCounter = 1;

    const nodes = [];
    const edges = [];
    const graphSegments = [];

    const nodeMap = new Map();

    function getOrCreateNode(point) {

        const key =
          getNodeKey(
            point.x,
            point.y
          );

        if (
          nodeMap.has(key)
        ) {
          return nodeMap.get(key);
        }   

        const nodeId =
          `N${nodeCounter++}`;

        const node = {
          id: nodeId,
          x: point.x,
          y: point.y,
        };

        nodes.push(node);

        nodeMap.set(
          key,
          nodeId
        );

        return nodeId;
    }

    paths.forEach(path => {

      const pathNodeIds =
        path.points.map(
          point =>
            getOrCreateNode(
              point
            )
        );

      for (
        let i = 0;
        i <
        pathNodeIds.length - 1;
        i++
    ) {

      const currentNode =
        nodes.find(
          n =>
            n.id ===
            pathNodeIds[i]
        );

      const nextNode =
        nodes.find(
          n =>
            n.id ===
            pathNodeIds[i + 1]
        );

      const edgeDistance = 
        distance(
            currentNode,
            nextNode
        );

      edges.push({
        from:
          pathNodeIds[i],

        to:
          pathNodeIds[i + 1],

        distance:
          Math.round(
            edgeDistance * 100
          ) / 100
    });

        edges.push({
        from:
            pathNodeIds[i + 1],

        to:
            pathNodeIds[i],

        distance:
            Math.round(
            edgeDistance * 100
            ) / 100
        });

        graphSegments.push({

        startId:
            pathNodeIds[i],

        endId:
            pathNodeIds[i + 1],

        start:
            currentNode,

        end:
            nextNode

        });

            }

        });

  rooms.forEach(room => {

    room.doors?.forEach(door => {

      let nearestSegment = null;

      let nearestProjection = null;

      let nearestSegmentDistance =
        Infinity;
    
      paths.forEach(path => {

        for (
            let i = 0;
            i <
            path.points.length - 1;
            i++
        ) {

            const start =
            path.points[i];

            const end =
            path.points[i + 1];

            const projection =
            projectPointOnSegment(
                door,
                start,
                end
            );

            const d =
            distance(
                door,
                projection
            );

            if (
            d <
            nearestSegmentDistance
            ) {

            nearestSegmentDistance =
                d;

            nearestSegment =
                graphSegments.find(
                    segment =>
                    segment.start.x ===
                        start.x &&
                    segment.start.y ===
                        start.y &&
                    segment.end.x ===
                        end.x &&
                    segment.end.y ===
                        end.y
                );

            nearestProjection =
                projection;

            }

        }

        });

        console.log(
        "Door",
        door.id
        );

        console.log(
        "Nearest Projection",
        nearestProjection
        );

        console.log(
        "Nearest Segment",
        nearestSegment
        );

      const junctionId =
        `J${nodeCounter++}`;

        nodes.push({

        id: junctionId,
        x:
            nearestProjection.x,
        y:
            nearestProjection.y,

        type:
            "junction"

        });

        const distToStart =
            distance(
                nearestProjection,
                nearestSegment.start
            );

            const distToEnd =
            distance(
                nearestProjection,
                nearestSegment.end
            );

            edges.push({

            from:
                nearestSegment.startId,

            to:
                junctionId,

            distance:
                Math.round(
                distToStart * 100
                ) / 100

            });

            edges.push({

            from:
                junctionId,

            to:
                nearestSegment.startId,

            distance:
                Math.round(
                distToStart * 100
                ) / 100

            });

            edges.push({

            from:
                junctionId,

            to:
                nearestSegment.endId,

            distance:
                Math.round(
                distToEnd * 100
                ) / 100

            });

            edges.push({

            from:
                nearestSegment.endId,

            to:
                junctionId,

            distance:
                Math.round(
                distToEnd * 100
                ) / 100

            });

      let nearestNode = null;
      let nearestDistance =
        Infinity;

      nodes.forEach(node => {

        const d =
          distance(
            door,
            node
          );

        if (
          d <
          nearestDistance
        ) {

          nearestDistance =
            d;

          nearestNode =
            node;

        }

      });

    const doorNodeId =
      `D${nodeCounter++}`;

    nodes.push({

      id: doorNodeId,

      x: door.x,

      y: door.y,

      roomId: room.id,

      doorId: door.id,

      type: "door"

    });

    const doorDistance =
        distance(
            door,
            nearestProjection
        );

        edges.push({

        from:
            doorNodeId,

        to:
            junctionId,

        distance:
            Math.round(
            doorDistance * 100
            ) / 100

        });

        edges.push({

        from:
            junctionId,

        to:
            doorNodeId,

        distance:
            Math.round(
            doorDistance * 100
            ) / 100

        });

  });

});

  const floorDefinition = {
    rooms,
    paths,

    graph: {
      nodes,
      edges
    }
  };

  console.log(
    "Generated Floor",
    floorDefinition
  );

  const blob =
    new Blob(
      [
        JSON.stringify(
          floorDefinition,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    URL.createObjectURL(
      blob
    );

  link.download =
    "floorDefinition.json";

  link.click();

}

  function exportJson() {
    const data = {
      rooms,
      paths,
    };

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      {
        type: "application/json",
      }
    );

    const link =
      document.createElement("a");

    link.href =
      URL.createObjectURL(blob);

    link.download =
      "officeLayout.json";

    link.click();
  }

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        left: 10,
        zIndex: 1000,
        background: "white",
        padding: 10,
        borderRadius: 8,
        display: "flex",
        gap: 8,
      }}
    >
      <button
        onClick={() => setMode("room")}
      >
        Room
      </button>

      <button
        onClick={() => setMode("path")}
      >
        Path
      </button>

      <button
        onClick={() => setMode("door")}
      >
        Door
      </button>

      <button
        onClick={() => generateGraph()}
      >
        Generate Graph
      </button>

      <button onClick={exportJson}>
        Export
      </button>

      <span>
        Current: {mode}
      </span>
    </div>
  );
}