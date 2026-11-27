(function (global) {
  /** Fixed Kingdomino terrain types — always shown in selects. */
  const TERRAINS = [
    { value: "forest", label: "Ліс" },
    { value: "field", label: "Поле" },
    { value: "water", label: "Вода" },
    { value: "swamp", label: "Болото" },
    { value: "mine", label: "Шахта" },
    { value: "pasture", label: "Луг" },
  ];

  function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(value, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function normalizeTerrain(value) {
    if (TERRAINS.some((t) => t.value === value)) return value;
    return TERRAINS[0].value;
  }

  function regionScore(region) {
    const tiles = clampInt(region.tiles, 0, 25, 0);
    const crowns = clampInt(region.crowns, 0, 25, 0);
    return tiles * crowns;
  }

  function playerScore(player) {
    if (!player || !Array.isArray(player.regions)) return 0;
    return player.regions.reduce((sum, region) => sum + regionScore(region), 0);
  }

  function regionHasInput(region) {
    if (!region) return false;
    const tiles = clampInt(region.tiles, 0, 25, 0);
    const crowns = clampInt(region.crowns, 0, 25, 1);
    // Default empty region is tiles=0, crowns=1 — not "entered" yet.
    return tiles > 0 || crowns !== 1;
  }

  function playerHasInput(player) {
    if (!player || !Array.isArray(player.regions)) return false;
    if (playerScore(player) > 0) return true;
    return player.regions.some(regionHasInput);
  }

  function comparePlayers(players) {
    const scored = (players || []).map((player) => ({
      id: player.id,
      name: (player.name || "").trim() || "Без імені",
      score: playerScore(player),
    }));

    if (scored.length === 0) {
      return { leaders: [], maxScore: 0, isTie: false, ranked: [] };
    }

    const ranked = [...scored].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, "uk"));
    const maxScore = ranked[0].score;
    const leaders = ranked.filter((p) => p.score === maxScore);

    return {
      leaders,
      maxScore,
      isTie: leaders.length > 1,
      ranked,
    };
  }

  function terrainLabel(value) {
    const found = TERRAINS.find((t) => t.value === value);
    return found ? found.label : TERRAINS[0].label;
  }

  global.KingdominoScoring = {
    TERRAINS,
    clampInt,
    normalizeTerrain,
    regionScore,
    playerScore,
    regionHasInput,
    playerHasInput,
    comparePlayers,
    terrainLabel,
  };
})(window);
