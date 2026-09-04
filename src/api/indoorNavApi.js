/**
 * Indoor Navigation API Client
 * Reusable HTTP helper for publishing layouts to the Indoor Navigation backend.
 */

/**
 * Resolves the Indoor Navigation API base URL from Vite environment variable.
 * Does not hardcode localhost. If the environment variable is not set,
 * returns an empty string which allows relative API calls.
 */
export function getApiBaseUrl() {
  const envUrl = import.meta.env?.VITE_INDOOR_NAV_API_URL;
  if (!envUrl || typeof envUrl !== "string") {
    return "";
  }
  return envUrl.trim().replace(/\/+$/, "");
}

/**
 * Formats server error details from the response body.
 */
function extractErrorMessage(status, statusText, responseData) {
  if (responseData && typeof responseData === "object") {
    if (responseData.message && typeof responseData.message === "string") {
      return responseData.message;
    }
    if (responseData.error) {
      if (typeof responseData.error === "string") {
        return responseData.error;
      }
      return JSON.stringify(responseData.error);
    }
    if (Array.isArray(responseData.errors) && responseData.errors.length > 0) {
      return responseData.errors.map((e) => (typeof e === "string" ? e : JSON.stringify(e))).join("; ");
    }
    if (responseData.errors && typeof responseData.errors === "object") {
      return Object.entries(responseData.errors)
        .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : val}`)
        .join("; ");
    }
  }

  if (typeof responseData === "string" && responseData.trim()) {
    return responseData.trim();
  }

  return `Server responded with status ${status} (${statusText || "Error"})`;
}

/**
 * Publishes a single floor layout definition to the Indoor Navigation backend.
 *
 * Endpoint: POST /api/layouts/publish
 *
 * @param {Object} params
 * @param {Object} params.building { id: string, name: string }
 * @param {Object} params.floor { id: string, name: string, level: number }
 * @param {Object} params.definition { rooms: Array, paths: Array, graph: { nodes: Array, edges: Array } }
 * @returns {Promise<Object>} The API response payload
 */
export async function publishLayout({ building, floor, definition }) {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/layouts/publish`;

  const payload = {
    building: {
      id: building.id,
      name: building.name,
    },
    floor: {
      id: floor.id,
      name: floor.name,
      level: floor.level,
    },
    definition: {
      rooms: definition.rooms,
      paths: definition.paths,
      graph: {
        nodes: definition.graph.nodes,
        edges: definition.graph.edges,
      },
    },
  };

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (networkError) {
    const error = new Error(
      `Failed to connect to Indoor Navigation backend at ${endpoint}: ${networkError.message || networkError}`
    );
    error.isNetworkError = true;
    throw error;
  }

  let responseData;
  const contentType = response.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }
  } catch {
    responseData = null;
  }

  if (!response.ok) {
    const message = extractErrorMessage(response.status, response.statusText, responseData);
    const error = new Error(message);
    error.status = response.status;
    error.data = responseData;
    throw error;
  }

  // Handle standard API response format { success, data, meta }
  if (responseData && typeof responseData === "object" && responseData.success === false) {
    const message = extractErrorMessage(response.status, response.statusText, responseData);
    const error = new Error(message);
    error.status = response.status;
    error.data = responseData;
    throw error;
  }

  return responseData;
}
