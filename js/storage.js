(function (global) {
  const STORAGE_KEY = "kingdomino-simple-v1";
  const TTL_MS = 24 * 60 * 60 * 1000;
  const DEFAULT_TERRAIN = "forest";

  /** Classic Kingdomino meeple colors (4 max players). */
  const PLAYER_COLORS = [
    { id: "pink", label: "Рожевий" },
    { id: "yellow", label: "Жовтий" },
    { id: "green", label: "Зелений" },
    { id: "blue", label: "Синій" },
  ];

  const COLOR_IDS = PLAYER_COLORS.map((c) => c.id);

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

  function normalizeColor(color) {
    return COLOR_IDS.includes(color) ? color : null;
  }

  function takenColors(players, exceptId) {
    const taken = new Set();
    (players || []).forEach((p) => {
      if (!p || p.id === exceptId) return;
      const c = normalizeColor(p.color);
      if (c) taken.add(c);
    });
    return taken;
  }

  function nextAvailableColor(players, exceptId) {
    const taken = takenColors(players, exceptId);
    return COLOR_IDS.find((id) => !taken.has(id)) || null;
  }

  function createPlayer(name, color, existingPlayers) {
    const players = existingPlayers || [];
    const chosen = normalizeColor(color) || nextAvailableColor(players);
    return {
      id: crypto.randomUUID(),
      name: name || "",
      color: chosen || COLOR_IDS[0],
      regions: [createRegion()],
    };
  }

  function createDefaultState() {
    const p1 = createPlayer("Гравець 1", "pink", []);
    const p2 = createPlayer("Гравець 2", "yellow", [p1]);
    return {
      version: 1,
      savedAt: now(),
      expiresAt: now() + TTL_MS,
      players: [p1, p2],
      activePlayerId: null,
      lastView: "home",
    };
  }

  function normalizePlayer(player, siblings) {
    if (!player || typeof player !== "object") {
      return createPlayer("Гравець", null, siblings);
    }
    const regions = Array.isArray(player.regions) ? player.regions.map(normalizeRegion) : [];
    const color =
      normalizeColor(player.color) || nextAvailableColor(siblings, player.id) || COLOR_IDS[0];
    return {
      id: player.id || crypto.randomUUID(),
      name: typeof player.name === "string" ? player.name : "",
      color,
      regions: regions.length > 0 ? regions : [createRegion()],
    };
  }

  function assignUniqueColors(players) {
    const list = Array.isArray(players) ? players : [];
    const used = new Set();
    return list.map((raw) => {
      const player = normalizePlayer(raw, list);
      let color = normalizeColor(player.color);
      if (!color || used.has(color)) {
        color = COLOR_IDS.find((id) => !used.has(id)) || COLOR_IDS[0];
      }
      used.add(color);
      return { ...player, color };
    });
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
        ? assignUniqueColors(parsed.players)
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
    PLAYER_COLORS,
    COLOR_IDS,
    createDefaultState,
    createPlayer,
    createRegion,
    loadState,
    saveState,
    clearState,
    isExpired,
    normalizeColor,
    takenColors,
    nextAvailableColor,
    assignUniqueColors,
  };
})(window);
