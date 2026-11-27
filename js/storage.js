(function (global) {
  const STORAGE_KEY = "kingdomino-simple-v1";
  const TTL_MS = 24 * 60 * 60 * 1000;
  const DEFAULT_TERRAIN = "forest";

  function now() {
    return Date.now();
  }

  function createRegion() {
    return {
      id: crypto.randomUUID(),
      terrain: DEFAULT_TERRAIN,
      tiles: 0,
      crowns: 1,
    };
  }

  function createPlayer(name) {
    return {
      id: crypto.randomUUID(),
      name: name || "",
      regions: [createRegion()],
    };
  }

  function createDefaultState() {
    return {
      version: 1,
      savedAt: now(),
      expiresAt: now() + TTL_MS,
      players: [createPlayer("Гравець 1"), createPlayer("Гравець 2")],
      activePlayerId: null,
      lastView: "home",
    };
  }

  function normalizePlayer(player) {
    if (!player || typeof player !== "object") {
      return createPlayer("Гравець");
    }
    const regions = Array.isArray(player.regions) ? player.regions.map(normalizeRegion) : [];
    return {
      id: player.id || crypto.randomUUID(),
      name: typeof player.name === "string" ? player.name : "",
      regions: regions.length > 0 ? regions : [createRegion()],
    };
  }

  function normalizeRegion(region) {
    if (!region || typeof region !== "object") return createRegion();
    const tiles = Number.parseInt(region.tiles, 10);
    const crowns = Number.parseInt(region.crowns, 10);
    const terrain =
      typeof region.terrain === "string" && region.terrain
        ? region.terrain
        : DEFAULT_TERRAIN;
    return {
      id: region.id || crypto.randomUUID(),
      terrain,
      tiles: Number.isNaN(tiles) ? 0 : Math.max(0, tiles),
      crowns: Number.isNaN(crowns) ? 1 : Math.max(0, crowns),
    };
  }

  function isExpired(state) {
    if (!state || typeof state.expiresAt !== "number") return true;
    return now() > state.expiresAt;
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultState();
      const parsed = JSON.parse(raw);
      if (isExpired(parsed)) {
        localStorage.removeItem(STORAGE_KEY);
        return createDefaultState();
      }
      const players = Array.isArray(parsed.players)
        ? parsed.players.map(normalizePlayer)
        : [];
      return {
        ...createDefaultState(),
        ...parsed,
        players: players.length > 0 ? players : createDefaultState().players,
      };
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      return createDefaultState();
    }
  }

  function saveState(state) {
    const next = {
      ...state,
      version: 1,
      savedAt: now(),
      expiresAt: now() + TTL_MS,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function clearState() {
    localStorage.removeItem(STORAGE_KEY);
    return createDefaultState();
  }

  global.KingdominoStorage = {
    STORAGE_KEY,
    TTL_MS,
    createDefaultState,
    createPlayer,
    createRegion,
    loadState,
    saveState,
    clearState,
    isExpired,
  };
})(window);
