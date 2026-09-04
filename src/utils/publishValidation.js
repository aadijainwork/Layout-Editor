/**
 * Validation utility for Layout Editor publishing
 * Ensures all required data models, geometries, graph nodes, and references
 * conform to the schema required by the Indoor Navigation backend.
 */

/**
 * Validates layout definition and metadata before publishing.
 *
 * @param {Object} params
 * @param {Object} params.building { id: string, name: string }
 * @param {Object} params.floor { id: string, name: string, level: number }
 * @param {Object} params.definition { rooms: Array, paths: Array, graph: { nodes: Array, edges: Array } }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateLayoutForPublish({ building, floor, definition }) {
  const errors = [];

  // 1. Building validation
  if (!building || typeof building !== "object") {
    errors.push("Building metadata is missing.");
  } else {
    if (!building.id || typeof building.id !== "string" || !building.id.trim()) {
      errors.push("Building ID is required and must be a non-empty string.");
    }
    if (!building.name || typeof building.name !== "string" || !building.name.trim()) {
      errors.push("Building name is required and must be a non-empty string.");
    }
  }

  // 2. Floor validation
  if (!floor || typeof floor !== "object") {
    errors.push("Floor metadata is missing.");
  } else {
    if (!floor.id || typeof floor.id !== "string" || !floor.id.trim()) {
      errors.push("Floor ID is required and must be a non-empty string.");
    }
    if (!floor.name || typeof floor.name !== "string" || !floor.name.trim()) {
      errors.push("Floor name is required and must be a non-empty string.");
    }
    if (floor.level === undefined || floor.level === null || typeof floor.level !== "number" || !Number.isFinite(floor.level)) {
      errors.push("Floor level must be a valid finite number (e.g. 1, 2, 5, -1).");
    }
  }

  // 3. Definition object check
  if (!definition || typeof definition !== "object") {
    errors.push("Layout definition is missing.");
    return { valid: false, errors };
  }

  // 4. Rooms validation
  const roomIdSet = new Set();
  const roomDoorsMap = new Map(); // roomId -> Set of doorIds

  if (!Array.isArray(definition.rooms)) {
    errors.push("Rooms must be an array.");
  } else {
    definition.rooms.forEach((room, roomIdx) => {
      const roomLabel = room?.name ? `Room "${room.name}"` : `Room #${roomIdx + 1}`;

      if (!room || typeof room !== "object") {
        errors.push(`${roomLabel} is not a valid object.`);
        return;
      }

      if (room.id === undefined || room.id === null || String(room.id).trim() === "") {
        errors.push(`${roomLabel} is missing a valid id.`);
      } else {
        roomIdSet.add(String(room.id));
      }

      const doorIdSet = new Set();
      if (room.id !== undefined && room.id !== null) {
        roomDoorsMap.set(String(room.id), doorIdSet);
      }

      // Check polygon
      if (!Array.isArray(room.polygon)) {
        errors.push(`${roomLabel} polygon must be an array.`);
      } else if (room.polygon.length < 3) {
        errors.push(`${roomLabel} polygon must have at least 3 points (found ${room.polygon.length}).`);
      } else {
        // all polygon coordinates are numeric
        room.polygon.forEach((pt, ptIdx) => {
          if (
            !pt ||
            typeof pt.x !== "number" ||
            !Number.isFinite(pt.x) ||
            typeof pt.y !== "number" ||
            !Number.isFinite(pt.y)
          ) {
            errors.push(
              `${roomLabel} polygon point #${ptIdx + 1} has invalid numeric coordinates (x: ${pt?.x}, y: ${pt?.y}).`
            );
          }
        });
      }

      // Check doors and numeric coordinates
      if (room.doors) {
        if (!Array.isArray(room.doors)) {
          errors.push(`${roomLabel} doors property must be an array.`);
        } else {
          room.doors.forEach((door, doorIdx) => {
            const doorLabel = door?.name ? `Door "${door.name}"` : `Door #${doorIdx + 1}`;
            if (door?.id !== undefined && door?.id !== null) {
              doorIdSet.add(String(door.id));
            } else {
              errors.push(`${doorLabel} in ${roomLabel} is missing an id.`);
            }

            if (
              !door ||
              typeof door.x !== "number" ||
              !Number.isFinite(door.x) ||
              typeof door.y !== "number" ||
              !Number.isFinite(door.y)
            ) {
              errors.push(
                `${doorLabel} in ${roomLabel} has invalid numeric coordinates (x: ${door?.x}, y: ${door?.y}).`
              );
            }
          });
        }
      }
    });
  }

  // 5. Graph validation
  const graph = definition.graph;
  if (!graph || typeof graph !== "object") {
    errors.push("Graph definition is missing. Please click 'Generate Graph' before publishing.");
    return { valid: false, errors };
  }

  // graph.nodes is an array
  if (!Array.isArray(graph.nodes)) {
    errors.push("Graph nodes must be an array.");
  } else if (graph.nodes.length === 0) {
    errors.push("Graph nodes array is empty. Please click 'Generate Graph' before publishing.");
  } else {
    const nodeIdSet = new Set();

    // every graph node has id/x/y
    graph.nodes.forEach((node, nodeIdx) => {
      const nodeLabel = node?.id ? `Graph node '${node.id}'` : `Graph node #${nodeIdx + 1}`;

      if (!node || typeof node !== "object") {
        errors.push(`${nodeLabel} is not a valid object.`);
        return;
      }

      if (node.id === undefined || node.id === null || String(node.id).trim() === "") {
        errors.push(`Graph node #${nodeIdx + 1} is missing an id.`);
      } else {
        nodeIdSet.add(String(node.id));
      }

      if (typeof node.x !== "number" || !Number.isFinite(node.x)) {
        errors.push(`${nodeLabel} has invalid x coordinate (${node.x}). Coordinate must be a finite number.`);
      }
      if (typeof node.y !== "number" || !Number.isFinite(node.y)) {
        errors.push(`${nodeLabel} has invalid y coordinate (${node.y}). Coordinate must be a finite number.`);
      }

      // room/door references used by graph nodes refer to existing rooms/doors where applicable
      if (node.roomId !== undefined && node.roomId !== null) {
        const strRoomId = String(node.roomId);
        if (!roomIdSet.has(strRoomId)) {
          errors.push(
            `${nodeLabel} references room '${node.roomId}', but this room does not exist in the floor layout.`
          );
        } else if (node.doorId !== undefined && node.doorId !== null) {
          const strDoorId = String(node.doorId);
          const roomDoors = roomDoorsMap.get(strRoomId);
          if (!roomDoors || !roomDoors.has(strDoorId)) {
            errors.push(
              `${nodeLabel} references door '${node.doorId}' in room '${node.roomId}', but this door does not exist.`
            );
          }
        }
      } else if (node.doorId !== undefined && node.doorId !== null) {
        const strDoorId = String(node.doorId);
        let foundDoor = false;
        for (const doors of roomDoorsMap.values()) {
          if (doors.has(strDoorId)) {
            foundDoor = true;
            break;
          }
        }
        if (!foundDoor) {
          errors.push(
            `${nodeLabel} references door '${node.doorId}', but this door does not exist in any room.`
          );
        }
      }
    });

    // graph.edges is an array
    if (!Array.isArray(graph.edges)) {
      errors.push("Graph edges must be an array.");
    } else {
      // every edge references an existing graph node
      graph.edges.forEach((edge, edgeIdx) => {
        const edgeLabel = `Graph edge #${edgeIdx + 1}`;

        if (!edge || typeof edge !== "object") {
          errors.push(`${edgeLabel} is not a valid object.`);
          return;
        }

        if (edge.from === undefined || edge.from === null || !nodeIdSet.has(String(edge.from))) {
          errors.push(`${edgeLabel} references non-existent node 'from': '${edge?.from}'.`);
        }
        if (edge.to === undefined || edge.to === null || !nodeIdSet.has(String(edge.to))) {
          errors.push(`${edgeLabel} references non-existent node 'to': '${edge?.to}'.`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
