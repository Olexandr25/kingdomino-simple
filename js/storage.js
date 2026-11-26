(function (global) {
  const STORAGE_KEY = "kingdomino-simple-v1";
  const TTL_MS = 24 * 60 * 60 * 1000;

  function now() {
    return Date.now();
  }

  function createDefaultState() {
    return {
      version: 1,
      savedAt: now(),
      expiresAt: now() + TTL_MS,
      players: [],
      activePlayerId: null,
      lastView: "home",
    };
  }

  function createPlayer(name) {
    return {
      id: crypto.randomUUID(),
      name: name || "",
      regions: [],
    };
  }

  function createRegion() {
    return {
      id: crypto.randomUUID(),
      terrain: "",
      tiles: 1,
      crowns: 0,
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
      return {
        ...createDefaultState(),
        ...parsed,
        players: Array.isArray(parsed.players) ? parsed.players : [],
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
