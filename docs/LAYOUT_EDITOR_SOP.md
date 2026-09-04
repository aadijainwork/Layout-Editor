# Standard Operating Procedure (SOP): Layout Editor & Floor Publication

**Document ID**: SOP-LE-001  
**Target Audience**: Floor Plan Authors, CAD/GIS Operators, Integration Engineers  
**Applies to**: Layout Editor v0.x & Indoor Navigation Integration  
**Last Verified**: September 2026  

---

## 1. Purpose & Scope

This Standard Operating Procedure (SOP) provides a complete, step-by-step operational guide for creating, updating, validating, and publishing indoor floor plans and navigation graphs using the **Layout Editor**.

Following this SOP ensures:
1. Floor layouts and corridor networks maintain geometric and topological validity.
2. Every destination room has at least one valid, walkable door connected to the corridor graph.
3. Published layouts correctly persist in the Indoor Navigation backend service without corrupting existing floors or breaking turn-by-turn routing.

---

## 2. Before You Start

### System Prerequisites
Ensure the following software and access requirements are met:
- **Node.js**: `v18.0.0` or later (`node -v`)
- **npm**: `v9.0.0` or later (`npm -v`)
- **Web Browser**: Modern Chromium-based browser (Google Chrome, Microsoft Edge) or Mozilla Firefox
- **Network Ports**:
  - `5173`: Default port for Layout Editor Vite dev server
  - `3001`: Indoor Navigation Backend API
  - `5174`: Indoor Navigation Frontend Web UI (optional, for end-user route testing)

### Verification Checklist Before Opening the Editor
- [ ] Indoor Navigation backend repository is available locally at `../Indoor_Navigation/backend`.
- [ ] High-resolution floor blueprint image (JPEG/PNG) is available or one of the bundled presets will be used.
- [ ] Target building name, floor name, and floor level number (e.g. Level `1`, `5`, `9`) are decided.

---

## 3. Start & Stop the Services

Both the Layout Editor and the Indoor Navigation backend service must be running for publication to succeed.

### Step 3.1: Start the Indoor Navigation Backend
Open a terminal in the Indoor Navigation backend directory:
```powershell
# Working Directory: Indoor_Navigation/backend
cd <path-to>\Indoor_Navigation\backend
npm run dev
```
**Expected Output**:
```
[INFO] Server listening on port 3001
[INFO] Database connected: prisma/dev.db
```

### Step 3.2: Start the Layout Editor
Open a second terminal in the Layout Editor directory:
```powershell
# Working Directory: layout-editor
cd <path-to>\layout-editor
npm run dev
```
**Expected Output**:
```
  VITE v8.0.12  ready in 210 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### Step 3.3: Access the Editor
Open your browser and navigate to:
```
http://localhost:5173
```

### Step 3.4: Stopping the Services
To stop either service, return to its terminal and press `Ctrl + C` (or `Y` when prompted in PowerShell).

---

## 4. Environment & Configuration

The Layout Editor connects to the Indoor Navigation backend via the URL specified in `.env`.

### Step 4.1: Verify `.env` File
Inspect `layout-editor/.env` (or `layout-editor/.env.development`):
```env
VITE_INDOOR_NAV_API_URL=http://localhost:3001
```

> [!CAUTION]
> **Vite Server Restart Required**: Vite bakes environment variables into the client bundle at startup. If you create or modify `.env`, you **MUST restart the Vite dev server** (`Ctrl+C` then `npm run dev`). Refreshing the browser alone is **not** sufficient.

---

## 5. Navigating Locations, Buildings, and Floors

The Layout Editor organizes floors using a top-right floating navigation panel.

```
┌─────────────────┐  ┌───────────────────────┐  ┌───────────────────┐
│  📍 Pune   [▼]  │  │  🏢 Hudson Bldg  [▼]  │  │  🗺️ 5th Floor [▼] │
└─────────────────┘  └───────────────────────┘  └───────────────────┘
```

### Step 5.1: Switch Location
1. Click the **Location** button (e.g. `📍 Pune`).
2. Select your desired location: `Pune`, `Bangalore`, or `Gurugram`.
3. The building and floor menus automatically update to display buildings in that location.

### Step 5.2: Switch Building
1. Click the **Building** button (e.g. `🏢 Hudson Building`).
2. Click the desired building from the list to load its active floor.
3. *To rename a building*: Click the pencil icon (`✏️`) next to the building name.
4. *To add a new building*: Click **➕ Add New Building**, enter the building name, and click **Add Building**.

### Step 5.3: Select, Add, or Configure Floors
1. Click the **Floor** button (e.g. `🗺️ 5th Floor`).
2. Click any floor in the list to switch to it.
3. *To Add a New Floor*:
   - Click **➕ Add New Floor**.
   - **Floor Name**: Enter descriptive name (e.g. `2nd Floor`).
   - **Floor Level**: Enter a valid integer (e.g. `2`, `0`, `-1`).
   - **Blueprint Image**: Choose a preset (e.g. `Hudson Floor 5`, `Ganges Floor 9`) or select **Upload Custom Blueprint...** and browse for a local JPEG/PNG file.
   - Click **Add Floor**.
4. *To Rename or Change Level*: Click the pencil icon (`✏️`) next to the floor, update the name or level, and click **Rename**.
5. *To Duplicate a Floor*: Click the duplicate icon (`👥`) to create an exact clone of the layout, rooms, and paths.

---

## 6. Floor Layout Editing Workflow

Floor authoring follows a strict sequential pipeline:

```
1. Trace Rooms & Assign Types
              ↓
2. Place Doors Along Room Boundaries
              ↓
3. Draw Walkable Corridor Paths
              ↓
4. Click "Generate Graph" & Inspect
              ↓
5. Click "Publish to Indoor Nav"
              ↓
6. Verify Routes in Indoor Navigation
```

---

## 7. Room & Door Authoring Step-by-Step

### 7.1: Drawing a Room
1. In the left sidebar, click the **Room** tool (or ensure the sidebar displays `room mode`).
2. On the blueprint canvas, click to place the first corner of the room.
3. Continue clicking in sequence (clockwise or counter-clockwise) around the room perimeter.
   - *Undo vertex*: Press `Ctrl + Z` (or `Cmd + Z`) or click **Undo** in the sidebar to delete the last placed point.
   - *Cancel*: Press `Escape` or delete points using `Undo`.
4. After placing at least 3 points, click **✓ Finish** in the sidebar.
5. In the **Create Room** modal:
   - Enter a unique **Room Name** (e.g. `Conference Room A`, `Cabin 1 (North)`).
   - Click **OK**.
6. In the **Room Type** dropdown:
   - Select one of: `Closed Room`, `Open Space`, `Lobby`, `Staircase`.
   - Click **OK**.
7. The room polygon appears filled on the canvas with its name label.

> [!WARNING]
> **Room ID Uniqueness**: Room names become their canonical ID. Never name two rooms identically on the same floor (e.g. do not have two rooms named `Cabin 1`). Always disambiguate (e.g. `Cabin 1 (North)` and `Cabin 1 (South)`). Duplicate room names will cause backend publication rejection.

### 7.2: Placing a Door
1. In the sidebar, click the **Door** tool (mode badge shows `door mode`).
2. Click on the room perimeter wall where users enter/exit.
3. In the **Add Door** dialog:
   - **Door Number**: Enter a door identifier (e.g. `D1`, `D31`).
   - **Door Width**: Leave default `12` or set desired width in pixels.
   - **Room Name**: Verify that the auto-detected containing room name is correct.
   - Click **OK**.
4. The door marker appears as a colored node on the room boundary.

### 7.3: Editing or Deleting Rooms and Doors
- **To Rename a Room or Door**: Click to select it, then press `Enter` to open the inline edit prompt.
- **To Delete a Room or Door**: Hover over the room polygon or door node (or click to select it) and press `Delete` or `Backspace`.
  > [!NOTE]
  > Deleting a room or door clears previously generated graph nodes and edges. You must re-run **Generate Graph** after any deletion.

---

## 8. Path / Corridor Authoring Step-by-Step

Corridors define the physical walkable network connecting rooms.

### 8.1: Drawing a Corridor Path
1. In the sidebar, click the **Path** tool (mode badge shows `path mode`).
2. Click the centerline of the hallway to place the starting point.
3. Click along hallway turns and intersections to trace the walkable path.
4. Click **✓ Finish** in the sidebar.
5. In the **Create Path** dialog:
   - Set **Path Width** (default: `18` pixels).
   - Click **OK**.
6. The path displays as a distinct colored polyline on the canvas.

### 8.2: Path Authoring Best Practices
- **Intersections**: When two hallways meet, click precisely on the existing hallway's vertex or line. The graph generator will automatically merge coincident coordinates into a shared junction node.
- **Obstacle Clearance**: Ensure path lines stay within corridors and do not cut through structural walls, pillars, or non-walkable furniture.
- **Door Proximity**: Ensure paths run parallel to and reasonably close to room doors so the orthogonal door projection creates clean, natural entry segments.

---

## 9. Generating the Navigation Graph

Graph generation transforms raw polylines and door points into a connected routing network.

### 9.1: Execution
Click the **Generate Graph** button in the lower section of the sidebar.

```
┌───────────────────────────┐
│      Generate Graph       │  <── Click here
├───────────────────────────┤
│   Publish to Indoor Nav   │
└───────────────────────────┘
```

### 9.2: What Happens Automatically
1. **Corridor Nodes (`N`)**: All path vertices are converted into path nodes (`N1`, `N2`, ...). Overlapping points at intersections are merged.
2. **Path Edges**: Consecutive vertices are linked with bidirectional edges weighted by Euclidean distance.
3. **Door Projections**: Each door is projected orthogonally onto the closest corridor segment.
4. **Junction Nodes (`J`)**: A junction node (`J3`, `J4`, ...) is created on the corridor at the projection point. The corridor segment is automatically split.
5. **Door Nodes (`D`)**: A door node (`D5`, `D6`, ...) is placed at the door coordinate and linked to its junction node with bidirectional edges.
6. **Local Backup Download**: The browser automatically triggers a file download of `floorDefinition.json` containing the complete exported structure.

### 9.3: Visual Inspection on Canvas
Verify the generated graph on screen:
- **Blue Nodes**: Path vertices (`N`).
- **Yellow / Orange Nodes**: Door junction nodes (`J`) sitting on corridor lines.
- **Green Nodes**: Room door nodes (`D`) linked to their respective junctions.
- Ensure there are no isolated, disconnected corridor sections.

---

## 10. Validating Before Publishing

Before publication, the Layout Editor runs client-side validation (`src/utils/publishValidation.js`).

### Items Checked
1. **Building & Floor Metadata**:
   - `building.id` and `building.name` must be non-empty strings.
   - `floor.id` and `floor.name` must be non-empty strings.
   - `floor.level` must be a finite number.
2. **Room Geometries**:
   - `rooms` array must contain $\ge 1$ room.
   - Every room must have a valid non-empty `id`.
   - Every room polygon must contain $\ge 3$ points with finite numeric $\{x, y\}$ coordinates.
   - Every door must have a valid ID and finite numeric coordinates.
3. **Navigation Graph**:
   - `graph.nodes` must contain $\ge 1$ node.
   - Every node must have finite numeric $\{x, y\}$ coordinates and an ID.
   - Every node referencing a `roomId` or `doorId` must point to an existing room and door.
   - `graph.edges` must contain $\ge 1$ edge.
   - Every edge `from` and `to` ID must exist in `graph.nodes`.

### Handling Validation Failures
If validation fails, the editor opens the **Publish Modal** in the error state with a red banner listing all violations:

```
⚠️ Publish Failed
Please correct the following errors before publishing:
• Room "Meeting Room A" polygon must have at least 3 points (found 2).
• Graph nodes array is empty. Please click 'Generate Graph' before publishing.
```

**Remediation**:
- If nodes or edges are empty: Click **Generate Graph**.
- If a room has < 3 points: Delete the incomplete room and redraw it.
- If a door references a missing room: Delete and recreate the door inside the room boundary.

---

## 11. Publishing to Indoor Navigation

### Step 11.1: Pre-Flight Check
- Ensure Indoor Navigation backend is running on port `3001`.
- Ensure **Generate Graph** has been executed for the current floor state.

### Step 11.2: Trigger Publication
Click **Publish to Indoor Nav** in the lower sidebar.

### Step 11.3: Monitor Publication Modal
1. **Publishing State**:
   - The button shows `Publishing...`.
   - A modal displays a spinner with:
     ```
     Sending floor definition and navigation graph to backend...
     POST /api/layouts/publish
     ```
2. **Success State**:
   - The modal turns green with `✓ Floor Published Successfully`.
   - Summary cards display verified import counts:
     - **Rooms**: Number of rooms imported into the database.
     - **Graph Nodes**: Number of nodes stored.
     - **Graph Edges**: Number of edges stored.
     - **Timestamp**: Exact server receipt time.
   - Click **Done** to close the modal.
   - The sidebar displays a green badge: `✓ Published (view details)`.

3. **Error State**:
   - The modal turns red with `⚠️ Publish Failed`.
   - Displays server error messages (e.g. network failure, endpoint not found, validation error).
   - Click **Retry** to resubmit after fixing the issue, or **Close** to return to editing.

---

## 12. Post-Publication Verification

Immediately after publishing, verify that the data was received and functions properly in the Indoor Navigation platform.

### Step 12.1: Verify HTTP 200 & Response
Confirm that `PublishModal` showed `success: true` and that the imported counts match the drawn entities.

### Step 12.2: Verify SQLite Database (Indoor Navigation)
Run a quick query against the Indoor Navigation database to confirm records exist:
```powershell
# Working Directory: Indoor_Navigation/backend
cd <path-to>\Indoor_Navigation\backend
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); (async () => { const f = await prisma.floor.findUnique({ where: { id: 'floor-jupiter-f1' }, include: { rooms: true, nodes: true, edges: true } }); console.log('Floor:', f.name, '| Level:', f.level, '| Rooms:', f.rooms.length, '| Nodes:', f.nodes.length, '| Edges:', f.edges.length); await prisma.\$disconnect(); })();"
```
**Expected Output**:
```
The target floor exists with non-zero room, node, and edge counts. Exact counts depend on the current published floor definition.
```

> [!NOTE]
> The publication modal's imported graph-edge count may differ from the final database edge-row count because the backend can create additional connectivity records during publication.

### Step 12.3: Perform a Turn-by-Turn Route Test
Verify that the routing engine successfully calculates a path across the published floor:
```powershell
# Test routing between two published rooms via Indoor Nav Backend API
Invoke-RestMethod -Method Post -Uri "http://localhost:3001/api/v1/route" -ContentType "application/json" -Body '{"startRoomId":"Reception","endRoomId":"Cafeteria"}'
```
**Expected Output**:
```json
{
  "success": true,
  "data": {
    "path": [ /* sequence of waypoints */ ],
    "totalDistance": 22.3,
    "steps": [ /* turn-by-turn directions */ ]
  }
}
```

---

## 13. Updating an Existing Floor

When updating a previously published floor (e.g. adding a new room or adjusting corridors):

1. Switch to the target building and floor in the Layout Editor.
2. Make your geometry edits on the canvas (add room, move door, extend path).
3. **MANDATORY**: Click **Generate Graph** to recompute door projections and split segments.
4. Click **Publish to Indoor Nav**.
5. The backend will transactionally replace the floor's previous graph, update room records, and reset the pathfinding graph cache.
6. Run the post-publication verification steps (Section 12) to confirm updated connectivity.

---

## 14. Local Storage & Recovery

### How Autosave Works
- All work is automatically debounced and saved in browser `localStorage` under `layout-editor.autosave.v1`.
- If you accidentally close your browser tab or reload, the editor restores the latest autosaved editor state (including buildings, floors, rooms, paths, and view coordinates).

### Recovering from Corrupted Local State
If a malformed floor or invalid state causes errors on page load:
1. Open Chrome / Edge Developer Tools (`F12` or `Ctrl + Shift + I`).
2. Go to the **Application** tab &rarr; **Storage** &rarr; **Local Storage** &rarr; `http://localhost:5173`.
3. Locate the key `layout-editor.autosave.v1`.
4. Right-click and select **Delete**.
5. Hard reload the browser (`Ctrl + F5`).
6. The editor will rehydrate clean factory defaults (including Jupiter, Hudson, Ganges, Gravity, and Gurugram floors).

---

## 15. Backup & Export Procedure

### Step 15.1: Automatic Graph Export
Every time you click **Generate Graph**, the editor automatically prompts a browser download of:
```
floorDefinition.json
```
Save this file into your project documentation or backups directory:
```
docs/backups/<building-id>_<floor-id>_<YYYY-MM-DD>.json
```

### Step 15.2: Backup File Contents
The exported JSON contains:
- `rooms`: Array of room polygons, types, and door definitions.
- `paths`: Array of corridor polylines and widths.
- `graph`: Complete `{ nodes, edges }` network.

---

## 16. Operational Gotchas & Traps

| Gotcha | Why It Happens | Solution |
| :--- | :--- | :--- |
| **Publishing Without Re-Generating Graph** | Moving or deleting a door invalidates previous graph nodes. Publishing old nodes causes validation failure or disconnected routes. | Always click **Generate Graph** immediately before clicking **Publish to Indoor Nav**. |
| **Duplicate Room Names** | Two rooms labeled `Meeting Room` will collide in the database because room name is used as the unique identifier. | Append directional or numbered suffixes: `Meeting Room (North)` and `Meeting Room (South)`. |
| **Vite Dev Server Port Shift** | If port `5173` is busy, Vite silently moves to `5174` or `5175`. | Check terminal console URL. Kill stale processes if necessary. |
| **Disconnected Paths** | Corridors drawn with gaps between them will not generate linking edges. | Ensure corridor polylines overlap or click precisely on intersection vertices. |
| **Door Placed Outside Room** | If a door is clicked outside all room polygons, auto-detection fails to assign a `roomId`. | Ensure the door click falls on or immediately inside the target room boundary. |

---

## 17. Final QA Checklist

Complete this checklist before signing off on any floor publication:

- [ ] **Correct Building Selected**: Verified target building in top-right header (e.g. `Jupiter`).
- [ ] **Correct Floor Selected**: Verified floor name and numeric level (e.g. `Level 1`).
- [ ] **Blueprint Aligned**: Background image renders sharp and fully visible within canvas.
- [ ] **All Rooms Defined**: All destination rooms outlined with $\ge 3$ vertices.
- [ ] **Room Names Unique**: No two rooms share identical names or IDs.
- [ ] **Room Types Assigned**: Every room assigned an appropriate type (`Closed Room`, etc.).
- [ ] **Doors Placed & Linked**: Every destination room has at least one door connected to it.
- [ ] **Corridor Paths Traced**: Hallways covered by walkable paths without wall collisions.
- [ ] **Graph Generated**: Clicked **Generate Graph**; confirmed nodes (`N`, `J`, `D`) and edges on canvas.
- [ ] **Backup JSON Saved**: Browser downloaded `floorDefinition.json`.
- [ ] **Backend Available**: Indoor Navigation backend active on `http://localhost:3001`.
- [ ] **Published Successfully**: Clicked **Publish to Indoor Nav**; received green `✓ Floor Published Successfully` modal.
- [ ] **Entity Counts Verified**: Confirmed room, node, and edge counts in modal match drawn entities.
- [ ] **Route Test Passed**: Verified turn-by-turn route between sample rooms via API or frontend UI.

---

## 18. Quick Reference Card

### Keyboard Shortcuts
| Key | Action |
| :--- | :--- |
| `Ctrl + Z` / `Cmd + Z` | Undo last point while drawing room polygon or corridor path |
| `Delete` / `Backspace` | Delete hovered or selected room, door, or path |
| `Enter` | Edit name of selected room or door |
| `Mouse Drag` | Pan blueprint canvas |
| `Mouse Wheel` | Zoom in / Zoom out |
| `Ctrl + Wheel` | High-precision zoom |

### Service URLs & Ports
| Service | URL | Directory | Startup Command |
| :--- | :--- | :--- | :--- |
| **Layout Editor** | `http://localhost:5173` | `layout-editor` | `npm run dev` |
| **Indoor Nav Backend** | `http://localhost:3001` | `Indoor_Navigation/backend` | `npm run dev` |
| **Indoor Nav Frontend** | `http://localhost:5174` | `Indoor_Navigation/frontend` | `npm run dev` |

### API Endpoints Used
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/layouts/publish` | Publish floor definition and navigation graph |
| `POST` | `/api/v1/route` | Test turn-by-turn routing between rooms |
| `GET` | `/api/v1/buildings` | List published buildings and floors |
