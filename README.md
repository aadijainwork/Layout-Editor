# Layout Editor

An interactive web-based indoor floor plan layout editor and navigation graph authoring tool. The Layout Editor allows floor plan authors and developers to annotate physical blueprints with rooms, doors, and walkable corridors, generate topological navigation graphs with mathematical door projections, and publish structured floor definitions directly to the Indoor Navigation backend via a REST API.

---

## Table of Contents

- [1. Project Overview](#1-project-overview)
- [2. Core Capabilities](#2-core-capabilities)
- [3. Architecture](#3-architecture)
- [4. Repository Structure](#4-repository-structure)
- [5. Technology Stack](#5-technology-stack)
- [6. Data Model](#6-data-model)
- [7. Graph Generation](#7-graph-generation)
- [8. Validation](#8-validation)
- [9. Indoor Navigation Integration](#9-indoor-navigation-integration)
- [10. Local Persistence & Autosave](#10-local-persistence--autosave)
- [11. Development Setup](#11-development-setup)
- [12. Working on a Floor](#12-working-on-a-floor)
- [13. Known Limitations & Gotchas](#13-known-limitations--gotchas)
- [14. Troubleshooting](#14-troubleshooting)
- [15. Handover & Maintenance](#15-handover--maintenance)

---

## 1. Project Overview

### Purpose & Problem Solved
Indoor navigation systems require more than geometric blueprints or CAD drawings: they require an explicit topological network of walkable paths connected to distinct destination rooms through accessible entry points (doors). Creating these graphs manually by editing raw coordinate JSON files is error-prone and labor-intensive.

The **Layout Editor** provides a visual authoring environment where operators can:
1. Load high-resolution floor plan blueprint images.
2. Outline polygonal room boundaries and assign semantic room metadata (names, types).
3. Place doors along room boundaries.
4. Trace centerline walkable corridor networks.
5. Compute a mathematically connected routing graph with automated door-to-corridor orthogonal projections.
6. Validate all geometric and referential integrity constraints on the client.
7. Dispatch the resulting layout dataset directly into the Indoor Navigation backend service for pathfinding.

### Relationship to the Indoor Navigation System
The Layout Editor is the **authoring frontend** of the broader indoor navigation platform. It does **not** perform pathfinding or run the end-user navigation UI, nor does it interact directly with the backend database.

```
┌────────────────────────────────────────────────────────┐
│                     LAYOUT EDITOR                      │
│  - Blueprint Canvas (Pan / Zoom / Draw)                │
│  - Floor / Building / Location Management             │
│  - LocalStorage Autosave (`layout-editor.autosave.v1`) │
│  - Graph Generation (Door Projections & Segment Split) │
│  - Client-Side Structural Validation                   │
└───────────────────────────┬────────────────────────────┘
                            │
                            │ HTTP POST /api/layouts/publish
                            │ (JSON Payload)
                            ▼
┌────────────────────────────────────────────────────────┐
│               INDOOR NAVIGATION BACKEND                │
│                 (Express / TypeScript)                 │
│  - Zod Schema Validation & Ingestion                   │
│  - SQLite Database (`dev.db`) Persistence via Prisma   │
│  - Synthetic Door Generation & Topology Cache Reset    │
│  - A* Turn-by-Turn Pathfinding Engine                  │
└────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Data Boundary**: The Layout Editor communicates with the Indoor Navigation system **exclusively via HTTP API calls** (`POST /api/layouts/publish`). It never directly reads from or writes to the Indoor Navigation SQLite database (`dev.db`).

---

## 2. Core Capabilities

| Capability | Description |
| :--- | :--- |
| **Location & Building Hierarchy** | Organizes layouts across locations (`Pune`, `Bangalore`, `Gurugram`) and distinct buildings (`Ganges`, `Gravity`, `Jupiter`, `Gurugram`, `Hudson`). |
| **Multi-Floor Management** | Supports multiple floors per building with explicit numeric levels (e.g. `level: 5`), floor renaming, floor duplication, and floor deletion. |
| **Blueprint Canvas Engine** | Interactive viewport with smooth pan (mouse drag or two-finger trackpad), zoom (`0.1x` to `10x`), automated fit-to-screen (`ResizeObserver`), and boundary clamping. |
| **Room Authoring** | Point-by-point polygon drawing (minimum 3 vertices), custom room naming, and room categorization (`Closed Room`, `Open Space`, `Lobby`, `Staircase`). |
| **Door Placement** | Point-and-click door placement with automatic containing-room detection, configurable door widths, and explicit room association. |
| **Corridor / Path Authoring** | Continuous polyline corridor drawing with configurable path widths (default `18px`). |
| **Automated Graph Generation** | Computes path nodes, deduplicates shared vertices, calculates Euclidean edge weights, orthogonally projects doors onto corridor segments, creates junction nodes, splits segments, and links door endpoints. |
| **Local Export** | Automatically triggers browser download of `floorDefinition.json` whenever the navigation graph is generated. |
| **Autosave & Hydration** | Persists editing state to browser `localStorage` under `layout-editor.autosave.v1` with 400ms debouncing and multi-version schema migration. |
| **Pre-Publish Validation** | Validates metadata completeness, polygon closure, coordinate finiteness, node existence, and room/door referential integrity before dispatch. |
| **One-Click Publishing** | Direct HTTP publication to the Indoor Navigation backend with real-time UI state feedback (`idle`, `publishing`, `success`, `error`) and imported entity summaries. |

---

## 3. Architecture

### High-Level Component Structure
The application is structured as a single-page React application powered by Vite:

```
src/
├── main.jsx                 # Application entry point (React 19 StrictMode)
├── App.jsx                  # Root component rendering Editor page
├── pages/
│   └── Editor.jsx           # Top-level state owner: buildings, floors, autosave, modals
├── components/
│   ├── Canvas.jsx           # Viewport engine, interaction events, drawing logic, graph generation
│   ├── Sidebar.jsx          # Mode switching (Room/Path/Door), Undo/Finish actions, publish trigger
│   └── PublishModal.jsx     # Status modal displaying validation errors, spinner, and success counts
├── api/
│   └── indoorNavApi.js      # Base URL resolution and HTTP client for publication
├── utils/
│   └── publishValidation.js # Client-side pre-flight validation schema and referential checks
├── css/
│   ├── Canvas.module.css    # Scoped canvas styling
│   └── Sidebar.module.css   # Scoped sidebar styling
└── assets/                  # Bundled floorplan blueprints (JPEG images)
```

### Data Flow & State Lifecycle
1. **Initialization**: On initial load, `Editor.jsx` invokes `loadAutosavedState()`. It checks browser `localStorage` for `layout-editor.autosave.v1`. If present, it migrates older schemas, ensures floor levels are numeric, normalizes canonical IDs (such as `floor-jupiter-f1`), and rehydrates building definitions. If empty, default configurations for Ganges, Gravity, Jupiter, Gurugram, and Hudson are initialized.
2. **Active Floor Isolation**: `Editor.jsx` maintains the master building array while exposing only the active floor's data (`rooms`, `paths`, `nodes`, `edges`, `blueprint`, `canvasState`) to `Canvas.jsx`.
3. **Autosave Cycle**: Every modification to rooms, paths, nodes, edges, or viewport pan/zoom triggers an asynchronous debounced (400ms) write back to `layout-editor.autosave.v1`.
4. **Graph Generation**: Clicking **Generate Graph** runs `generateGraph()` in `Canvas.jsx`. It populates `nodes` and `edges` and triggers a download of `floorDefinition.json`.
5. **Pre-Publish Check**: Clicking **Publish to Indoor Nav** triggers `validateLayoutForPublish()`. Any violation (missing nodes, unreferenced doors, invalid numbers) halts execution and opens `PublishModal` with detailed bullet points.
6. **HTTP Publication**: If valid, `indoorNavApi.js` sends an HTTP `POST` request to `{VITE_INDOOR_NAV_API_URL}/api/layouts/publish`.
7. **Confirmation**: On HTTP 200, `PublishModal` displays verified import metrics (room count, graph node count, graph edge count).

---

## 4. Repository Structure

The Layout Editor codebase contains only the following operational files and directories:

```
layout-editor/
├── .env                     # Local environment configuration (VITE_INDOOR_NAV_API_URL)
├── .env.development         # Development environment overrides
├── .env.example             # Example configuration template
├── .gitignore               # Git ignore rules (node_modules, dist, etc.)
├── eslint.config.js         # ESLint configuration
├── index.html               # HTML entry shell
├── package.json             # Dependencies, scripts, and package metadata
├── package-lock.json        # Pinned dependency lockfile
├── README.md                # Developer handover and technical reference
├── vite.config.js           # Vite configuration with React plugin and fs allow rules
├── docs/
│   └── LAYOUT_EDITOR_SOP.md # Standard Operating Procedure for floor operators
├── public/
│   ├── favicon.svg          # Editor favicon
│   └── icons.svg            # UI icons
└── src/
    ├── App.css              # Global application CSS
    ├── App.jsx              # Root App container
    ├── index.css            # Base Tailwind / CSS reset styles
    ├── main.jsx             # React DOM root render
    ├── api/
    │   └── indoorNavApi.js  # REST API publish client
    ├── assets/
    │   ├── Ganges_floor9.jpg# Ganges Building 9th floor blueprint
    │   ├── Gravity.jpg      # Gravity layout blueprint
    │   ├── Gurugram_3rd.jpg # Gurugram 3rd floor blueprint
    │   ├── Hudson_floor5.jpg# Hudson Building 5th floor blueprint
    │   ├── Hudson_floor6.jpg# Hudson Building 6th floor blueprint
    │   ├── Hudson_floor7.jpg# Hudson Building 7th floor blueprint
    │   └── Jupiter.jpg      # Jupiter layout blueprint
    ├── components/
    │   ├── Canvas.jsx       # Interactive drawing canvas and graph algorithm
    │   ├── PublishModal.jsx # Publication status and verification modal
    │   └── Sidebar.jsx      # Tool palette and action buttons
    ├── css/
    │   ├── Canvas.module.css# CSS module for Canvas
    │   └── Sidebar.module.css# CSS module for Sidebar
    ├── pages/
    │   └── Editor.jsx       # Main layout editor view and state manager
    └── utils/
        └── publishValidation.js # Structural and referential validator
```

---

## 5. Technology Stack

The exact dependencies and tooling versions defined in `package.json`:

| Category | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime Library** | React | `^19.2.6` | Component model, state management, hooks |
| **DOM Renderer** | React DOM | `^19.2.6` | Browser DOM rendering |
| **Build Tool** | Vite | `^8.0.12` | Dev server, HMR, bundling |
| **Compiler Plugin**| @vitejs/plugin-react| `^6.0.1` | Fast Refresh and JSX transformation |
| **Linter** | ESLint | `^10.3.0` | Code quality and standard adherence |
| **Linter Plugins** | @eslint/js | `^10.0.1` | ESLint recommended rules |
| | eslint-plugin-react-hooks | `^7.1.1` | React Hooks lint rules |
| | eslint-plugin-react-refresh | `^0.5.2` | Vite Fast Refresh lint rules |
| **Helper Tools** | globals | `^17.6.0` | Browser/node global environment identifiers |
| | pdfjs-dist | `^6.0.227` | PDF blueprint support |
| | react-zoom-pan-pinch | `^4.0.3` | Viewport transformation utilities |

---

## 6. Data Model

All coordinates are in **blueprint image pixel space** (positive $x$ right, positive $y$ down).

### 1. Building Object
```json
{
  "id": "building-jupiter",
  "name": "Jupiter",
  "location": "Bangalore",
  "hasFloors": false,
  "activeFloorId": "floor-jupiter-f1",
  "floors": [ /* Floor Objects */ ]
}
```

### 2. Floor Object
```json
{
  "id": "floor-jupiter-f1",
  "name": "Jupiter Layout",
  "level": 1,
  "blueprint": "data:image/jpeg;base64,...",
  "rooms": [ /* Room Objects */ ],
  "paths": [ /* Path Objects */ ],
  "nodes": [ /* Graph Node Objects */ ],
  "edges": [ /* Graph Edge Objects */ ],
  "canvasState": {
    "scale": 1.0,
    "offset": { "x": 0, "y": 0 }
  }
}
```

### 3. Room Object
```json
{
  "id": "Cabin 1 (North)",
  "name": "Cabin 1 (North)",
  "type": "Closed Room",
  "polygon": [
    { "x": 100.0, "y": 150.0 },
    { "x": 250.0, "y": 150.0 },
    { "x": 250.0, "y": 300.0 },
    { "x": 100.0, "y": 300.0 }
  ],
  "doors": [
    {
      "id": "D32",
      "name": "D32",
      "x": 250.0,
      "y": 210.0,
      "width": 12,
      "doorWidth": 12,
      "roomId": "Cabin 1 (North)",
      "roomName": "Cabin 1 (North)"
    }
  ]
}
```

### 4. Path Object
Corridors are defined as polylines:
```json
{
  "id": "path_1",
  "width": 18,
  "pathWidth": 18,
  "points": [
    { "x": 50.0, "y": 210.0 },
    { "x": 400.0, "y": 210.0 }
  ]
}
```

### 5. Graph Structure
The navigation graph consists of three node types:
- **`N` (Path Node)**: Endpoints or intermediate vertices of drawn corridors.
- **`J` (Junction Node)**: Orthogonal projection point of a door onto the nearest corridor segment.
- **`D` (Door Node)**: Physical location of the door, referencing its parent room.

```json
{
  "nodes": [
    { "id": "N1", "x": 50.0, "y": 210.0 },
    { "id": "N2", "x": 400.0, "y": 210.0 },
    { "id": "J3", "x": 250.0, "y": 210.0, "type": "junction" },
    { "id": "D4", "x": 250.0, "y": 210.0, "roomId": "Cabin 1 (North)", "doorId": "D32", "type": "door" }
  ],
  "edges": [
    { "from": "N1", "to": "J3", "distance": 200.0 },
    { "from": "J3", "to": "N1", "distance": 200.0 },
    { "from": "J3", "to": "N2", "distance": 150.0 },
    { "from": "N2", "to": "J3", "distance": 150.0 },
    { "from": "D4", "to": "J3", "distance": 0.0 },
    { "from": "J3", "to": "D4", "distance": 0.0 }
  ]
}
```

> [!NOTE]
> When a door lies exactly on the centerline of a corridor, the distance between the Door Node (`D`) and the Junction Node (`J`) is `0.0`. The backend schema accepts `distance >= 0`.

---

## 7. Graph Generation

The `generateGraph()` function in [`src/components/Canvas.jsx`](src/components/Canvas.jsx) executes a deterministic 7-step pipeline:

```
Paths Array
    │
    ▼
1. Extract Path Nodes (N1, N2...) ── Deduplicate by key `${x}_${y}`
    │
    ▼
2. Create Bidirectional Path Edges (Euclidean distance rounded to 2 decimals)
    │
    ▼
Rooms & Doors Array
    │
    ▼
3. For each Door: Find Nearest Path Segment via orthogonal projection
    │
    ▼
4. Create Junction Node (J3, J4...) at projection coordinates
    │
    ▼
5. Split Path Segment:
   Replace (Start ↔ End) with (Start ↔ Junction) and (Junction ↔ End)
    │
    ▼
6. Create Door Node (D5, D6...) at physical door coordinate
    │
    ▼
7. Create Bidirectional Door Edges: (Door ↔ Junction)
    │
    ▼
Update State (nodes, edges) & Trigger Download of `floorDefinition.json`
```

### Key Mathematical Operations
1. **Node Deduplication**: Vertices are indexed using `getNodeKey(x, y) = "${x}_${y}"` in a `Map`. Intersecting corridor paths automatically share identical node IDs, creating topological junctions without duplicating vertices.
2. **Orthogonal Segment Projection**:
   Given door point $P$ and corridor segment endpoints $A$ and $B$:
   $$t = \frac{(P - A) \cdot (B - A)}{|B - A|^2}, \quad t \in [0, 1]$$
   $$\text{Projection} = A + t(B - A)$$
3. **Segment Splitting**: The direct edge between segment endpoints $A$ and $B$ is replaced by edges $A \leftrightarrow J$ and $J \leftrightarrow B$, preserving overall corridor connectivity while introducing the door access point.

---

## 8. Validation

Validation occurs in two distinct tiers: **Client-Side** (within Layout Editor before dispatch) and **Backend** (inside the Indoor Navigation service).

### Client-Side Validation (`src/utils/publishValidation.js`)
Invoked by `handlePublish()` in `Canvas.jsx`:
- **Building Metadata**: `building.id` and `building.name` must be non-empty strings.
- **Floor Metadata**: `floor.id` and `floor.name` must be non-empty strings; `floor.level` must be a finite number.
- **Room Polygons**: `rooms` must contain $\ge 1$ room; each polygon must have $\ge 3$ vertices; all $x, y$ coordinates must be finite numbers; room IDs must be valid and non-empty.
- **Doors**: All doors must have valid IDs and finite numeric coordinates.
- **Graph Nodes**: `graph.nodes` must contain $\ge 1$ node; all node coordinates must be finite numbers; node IDs must be unique.
- **Graph Edges**: `graph.edges` must contain $\ge 1$ edge; every `from` and `to` ID must exist in `graph.nodes`.
- **Referential Integrity**: Every graph node with a `roomId` or `doorId` must correspond to an existing room and door in `rooms`.

### Backend Validation (`Indoor_Navigation/backend`)
Invoked by `POST /api/layouts/publish`:
- **Zod Schema**: Enforces schema rules, ensuring room IDs are unique within the floor definition.
- **Edge Distance**: Validates that edge distances are finite and non-negative (`distance >= 0`).
- **Synthetic Door Fallback**: If room doors lack corresponding door graph nodes, the backend automatically generates synthetic door nodes to ensure routing reachability.

---

## 9. Indoor Navigation Integration

### Configuration
The Layout Editor connects to the Indoor Navigation backend over HTTP. The backend base URL is configured via environment variables:

```env
# .env or .env.development
VITE_INDOOR_NAV_API_URL=http://localhost:3001
```

- If `VITE_INDOOR_NAV_API_URL` is unset or empty, the API client defaults to relative paths (e.g. `/api/layouts/publish`), allowing deployment behind reverse proxies.
- Vite loads environment variables **at dev server startup**. If you modify `.env`, you **must restart the Vite dev server**.

### Publication Endpoint
- **URL**: `POST {VITE_INDOOR_NAV_API_URL}/api/layouts/publish`
- **Headers**:
  ```http
  Content-Type: application/json
  Accept: application/json
  ```
- **Payload Structure**:
  ```json
  {
    "building": {
      "id": "building-jupiter",
      "name": "Jupiter"
    },
    "floor": {
      "id": "floor-jupiter-f1",
      "name": "Jupiter Layout",
      "level": 1
    },
    "definition": {
      "rooms": [ /* ... */ ],
      "paths": [ /* ... */ ],
      "graph": {
        "nodes": [ /* ... */ ],
        "edges": [ /* ... */ ]
      }
    }
  }
  ```

### Expected Success Response (HTTP 200)
```json
{
  "success": true,
  "data": {
    "buildingId": "building-jupiter",
    "floorId": "floor-jupiter-f1",
    "status": "published",
    "roomsImported": 71,
    "graphNodesImported": 159,
    "graphEdgesImported": 354,
    "syntheticDoorNodes": 11
  },
  "meta": {
    "timestamp": "2026-09-04T09:19:50.123Z"
  }
}
```

---

## 10. Local Persistence & Autosave

### Mechanism
The editor state is continuously saved in browser `localStorage` under the key:
```
layout-editor.autosave.v1
```

### Behavior & Debouncing
- Whenever rooms, paths, nodes, edges, viewport position, or floor selections change, an effect schedules a save with a **400ms debounce** window.
- The stored object contains:
  ```json
  {
    "buildings": [ /* complete hierarchy with floor arrays */ ],
    "activeBuildingId": "building-jupiter",
    "activeFloorId": "floor-jupiter-f1",
    "activeLocation": "Bangalore",
    "mode": "room",
    "savedAt": 1725441589000
  }
  ```

### Schema Migration & Self-Healing
`loadAutosavedState()` in `Editor.jsx` contains backwards-compatibility migrations:
1. **Legacy Flat Layout**: Migrates old single-floor state objects into Hudson Building Floor 5.
2. **Floors-Only Format**: Wraps unparented floor lists into a default building structure.
3. **Canonical Normalization**:
   - Ensures all floors have finite numeric levels via `ensureFloorLevel()`.
   - Normalizes Jupiter floor ID to canonical `floor-jupiter-f1`.
   - Detects legacy duplicate room IDs (e.g. legacy duplicate "Cabin 1" or "4 Pax Meeting Room") and automatically hydrates genuine authoritative data from `Jupiter.json`.

---

## 11. Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or later (Node 20+ recommended)
- **npm**: v9.0.0 or later

### Installation & Execution
```bash
# 1. Navigate to repository root
cd layout-editor

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env

# 4. Start Vite development server
npm run dev
```

### Available npm Scripts
| Command | Action |
| :--- | :--- |
| `npm run dev` | Starts Vite dev server (default `http://localhost:5173`) |
| `npm run build` | Compiles production assets into `dist/` |
| `npm run lint` | Runs ESLint across all JSX and JS files |
| `npm run preview` | Starts local HTTP server previewing the production `dist/` bundle |

---

## 12. Working on a Floor

A standard authoring session follows this conceptual workflow:
1. **Select Location & Building**: Use the top-right header dropdowns to select the target location and building.
2. **Select or Add Floor**: Select an existing floor or click **Add New Floor** to supply a name, numeric level, and blueprint image.
3. **Trace Rooms**: Select the **Room** tool (`Sidebar`). Click points around room perimeters (clockwise or counter-clockwise). Click **✓ Finish** (or press Enter) to finalize, name the room, and select its room type.
4. **Place Doors**: Select the **Door** tool. Click on the wall/boundary where entry occurs. Specify the door number and width.
5. **Draw Corridors**: Select the **Path** tool. Click points along walkable hall centerlines. Click **✓ Finish** to set corridor width.
6. **Generate Graph**: Click **Generate Graph**. Review the generated nodes and edges on the canvas. The browser downloads `floorDefinition.json`.
7. **Publish**: Click **Publish to Indoor Nav**. Confirm the HTTP 200 response and verified entity counts in `PublishModal`.

---

## 13. Known Limitations & Gotchas

1. **Vite Env Variable Caching**: Changes to `.env` or `.env.development` are bundled at server start. You must restart the dev server process after editing environment files.
2. **Canvas Deletions Clear Graph**: Deleting a room, door, or path clears generated graph nodes and edges (`setNodes([])`, `setEdges([])`). You must click **Generate Graph** again before publishing.
3. **Room ID Uniqueness**: Room IDs must be unique within a single floor. Duplicate room names (e.g. two rooms named "Cabin 1") will fail backend publication validation. Disambiguate them as "Cabin 1 (North)" and "Cabin 1 (South)".
4. **Door Projections**: Doors must be placed reasonably close to corridors. If a door is excessively far from all path segments, pathfinding routes may create unrealistic direct lines through obstacles.
5. **Autosave Scope**: `localStorage` is tied to the specific browser and port origin (`http://localhost:5173`). Opening the editor in an incognito window or alternate browser will load default template data.

---

## 14. Troubleshooting

### 1. Vite Server Starts on Alternate Port (`5174` or `5175`)
- **Cause**: Port `5173` is occupied by another process.
- **Fix**: Identify and stop the conflicting process or run `npx kill-port 5173`.

### 2. Publish Fails with 404 Not Found
- **Cause**: Layout Editor is posting to the wrong host (e.g. `http://localhost:5173/api/layouts/publish`) because `VITE_INDOOR_NAV_API_URL` is missing or the dev server was not restarted.
- **Fix**: Verify `.env` contains `VITE_INDOOR_NAV_API_URL=http://localhost:3001` and restart `npm run dev`.

### 3. Publish Fails with Network Error (Connection Refused)
- **Cause**: The Indoor Navigation backend service is not running on port `3001`.
- **Fix**: Start the backend in `Indoor_Navigation/backend` via `npm run dev`.

### 4. Publish Fails with 400 Validation Error
- **Cause**: Malformed geometry, duplicate room IDs, missing nodes, or ungenerated graph.
- **Fix**: Read the error message in `PublishModal`. Click **Generate Graph** to refresh nodes and edges, ensure room names are unique, and re-attempt publication.

### 5. Canvas Shows Old Blueprint or Stale Floor Data
- **Cause**: Corrupted or outdated state cached in `localStorage`.
- **Fix**: Open browser DevTools &rarr; Application &rarr; Local Storage &rarr; remove `layout-editor.autosave.v1`, then refresh the page (`Ctrl+F5`).

---

## 15. Handover & Maintenance

### Key Files for Maintainers
- [`src/pages/Editor.jsx`](src/pages/Editor.jsx): Master state container, location/building/floor management, and autosave hydration.
- [`src/components/Canvas.jsx`](src/components/Canvas.jsx): Canvas event handling, pan/zoom math, and `generateGraph()` projection algorithm.
- [`src/utils/publishValidation.js`](src/utils/publishValidation.js): Client validation schema. Keep synchronized with backend Zod rules!
- [`src/api/indoorNavApi.js`](src/api/indoorNavApi.js): HTTP client and endpoint URL resolution.

### Lower-Risk Areas to Modify
- Adding new preset blueprint images to `src/assets/`.
- Styling and layout adjustments in `src/css/*.module.css`.
- Adding new UI keyboard shortcuts in `Canvas.jsx`.

### Integration-Sensitive Areas (Exercise Caution)
- **Graph node ID conventions (`N`, `J`, `D`)**: Backend and routing algorithms rely on `type: "door"` and `type: "junction"` properties.
- **Publish Payload Schema**: Any changes to the payload shape in `indoorNavApi.js` must be matched by updates to `layoutPublishService.ts` in the Indoor Navigation backend.
- **Autosave Key**: Changing `AUTOSAVE_KEY` without a migration will reset existing authors' local work to factory defaults.

### Verification Checklist Before Committing Changes
```bash
# Verify no lint errors
npm run lint

# Verify clean production build
npm run build
```
