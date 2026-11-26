(function (global) {
  const TERRAINS = [
    { value: "", label: "—" },
    { value: "field", label: "Поле" },
    { value: "forest", label: "Ліс" },
    { value: "water", label: "Вода" },
    { value: "pasture", label: "Луг" },
    { value: "swamp", label: "Болото" },
    { value: "mine", label: "Шахта" },
  ];

  function clampInt(value, min, max, fallback) {
    const n = Number.parseInt(value, 10);
    if (Number.isNaN(n)) return fallback;
    return Math.min(max, Math.max(min, n));
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
    return found ? found.label : "—";
  }

  global.KingdominoScoring = {
    TERRAINS,
    clampInt,
    regionScore,
    playerScore,
    comparePlayers,
    terrainLabel,
  };
})(window);
