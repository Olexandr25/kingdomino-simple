(function () {
  const { createPlayer, createRegion, loadState, saveState, clearState } = KingdominoStorage;
  const {
    TERRAINS,
    clampInt,
    normalizeTerrain,
    regionScore,
    playerScore,
    playerHasInput,
    comparePlayers,
  } = KingdominoScoring;

  const MAX_PLAYERS = 4;
  const MIN_PLAYERS = 2;

  const els = {
    views: {
      home: document.getElementById("view-home"),
      table: document.getElementById("view-table"),
      score: document.getElementById("view-score"),
      rules: document.getElementById("view-rules"),
    },
    playersList: document.getElementById("players-list"),
    regionsList: document.getElementById("regions-list"),
    leaderBanner: document.getElementById("leader-banner"),
    scorePlayerName: document.getElementById("score-player-name"),
    scoreTotal: document.getElementById("score-total"),
    btnAddPlayer: document.getElementById("btn-add-player"),
    btnAddRegion: document.getElementById("btn-add-region"),
    btnSaveScore: document.getElementById("btn-save-score"),
    btnReset: document.getElementById("btn-reset"),
    btnRulesBack: document.getElementById("btn-rules-back"),
    dialog: document.getElementById("confirm-dialog"),
    confirmMessage: document.getElementById("confirm-message"),
  };

  let state = loadState();
  let rulesReturnView = "home";
  let confirmResolver = null;

  function persist() {
    state = saveState(state);
  }

  function ensureStarterPlayers() {
    if (state.players.length === 0) {
      state.players = [createPlayer("Гравець 1"), createPlayer("Гравець 2")];
      persist();
    }
    state.players.forEach((player) => {
      if (!Array.isArray(player.regions) || player.regions.length === 0) {
        player.regions = [createRegion()];
      }
      player.regions.forEach((region) => {
        region.terrain = normalizeTerrain(region.terrain);
      });
    });
  }

  function showView(name) {
    Object.entries(els.views).forEach(([key, node]) => {
      const active = key === name;
      node.hidden = !active;
      node.classList.toggle("is-active", active);
    });
    state.lastView = name === "score" ? "table" : name;
    if (name !== "score") persist();
  }

  function askConfirm(message) {
    els.confirmMessage.textContent = message;
    els.dialog.showModal();
    return new Promise((resolve) => {
      confirmResolver = resolve;
    });
  }

  els.dialog.addEventListener("close", () => {
    const ok = els.dialog.returnValue === "confirm";
    if (confirmResolver) {
      confirmResolver(ok);
      confirmResolver = null;
    }
  });

  function getActivePlayer() {
    return state.players.find((p) => p.id === state.activePlayerId) || null;
  }

  function renderLeaderBanner() {
    const { leaders, maxScore, isTie } = comparePlayers(state.players);
    els.leaderBanner.classList.toggle("is-tie", isTie && maxScore > 0);

    if (state.players.length === 0) {
      els.leaderBanner.textContent = "Додайте гравців, щоб почати.";
      return;
    }

    if (maxScore === 0) {
      els.leaderBanner.textContent = "Поки всі мають 0 — введіть області.";
      return;
    }

    if (isTie) {
      const names = leaders.map((l) => l.name).join(", ");
      els.leaderBanner.textContent = `Нічия: ${names} — по ${maxScore}.`;
      return;
    }

    els.leaderBanner.textContent = `Лідер: ${leaders[0].name} — ${maxScore} оч.`;
  }

  function renderPlayers() {
    ensureStarterPlayers();
    renderLeaderBanner();
    const { leaders, maxScore } = comparePlayers(state.players);
    const leaderIds = new Set(leaders.map((l) => l.id));

    els.playersList.innerHTML = "";

    state.players.forEach((player, index) => {
      const score = playerScore(player);
      const li = document.createElement("li");
      li.className = "player" + (maxScore > 0 && leaderIds.has(player.id) ? " is-leader" : "");
      li.dataset.id = player.id;

      const canRemove = state.players.length > MIN_PLAYERS;

      li.innerHTML = `
        <label class="player__label" for="player-name-${player.id}">Імʼя</label>
        <input
          id="player-name-${player.id}"
          class="player__name"
          type="text"
          maxlength="24"
          autocomplete="off"
          aria-label="Імʼя гравця ${index + 1}"
          value="${escapeAttr(player.name)}"
        />
        <span class="player__score" aria-label="Очки">${score}</span>
        <div class="player__meta">
          ${maxScore > 0 && leaderIds.has(player.id) ? '<span class="player__badge">Лідер</span>' : ""}
          <div class="player__actions">
            <button type="button" class="btn btn--secondary" data-action="score">Підрахунок</button>
            <button type="button" class="btn btn--icon" data-action="remove" aria-label="Видалити гравця" ${canRemove ? "" : "disabled"}>×</button>
          </div>
        </div>
      `;

      els.playersList.appendChild(li);
    });

    els.btnAddPlayer.disabled = state.players.length >= MAX_PLAYERS;
  }

  function terrainOptions(selected) {
    const current = normalizeTerrain(selected);
    return TERRAINS.map(
      (t) => `<option value="${t.value}" ${t.value === current ? "selected" : ""}>${t.label}</option>`
    ).join("");
  }

  function renderRegions() {
    const player = getActivePlayer();
    if (!player) {
      showView("table");
      renderPlayers();
      return;
    }

    if (!player.regions.length) {
      player.regions.push(createRegion());
      persist();
    }

    els.scorePlayerName.textContent = player.name.trim() || "Гравець";
    els.scoreTotal.textContent = String(playerScore(player));
    els.regionsList.innerHTML = "";

    const canRemoveRegion = player.regions.length > 1;

    player.regions.forEach((region, index) => {
      const li = document.createElement("li");
      li.className = "region";
      li.dataset.id = region.id;
      region.terrain = normalizeTerrain(region.terrain);

      li.innerHTML = `
        <div class="field field--terrain">
          <label for="terrain-${region.id}">Місцевість</label>
          <select id="terrain-${region.id}" data-field="terrain" required>${terrainOptions(region.terrain)}</select>
        </div>
        <div class="field">
          <label for="tiles-${region.id}">Клітинки</label>
          <input id="tiles-${region.id}" data-field="tiles" type="number" inputmode="numeric" min="0" max="25" value="${clampInt(region.tiles, 0, 25, 0)}" />
        </div>
        <div class="field">
          <label for="crowns-${region.id}">Корони</label>
          <input id="crowns-${region.id}" data-field="crowns" type="number" inputmode="numeric" min="0" max="25" value="${clampInt(region.crowns, 0, 25, 0)}" />
        </div>
        <button type="button" class="btn btn--icon" data-action="remove-region" aria-label="Видалити область ${index + 1}" ${canRemoveRegion ? "" : "disabled"}>×</button>
        <p class="region__sub">Очки області: <strong>${regionScore(region)}</strong></p>
      `;

      els.regionsList.appendChild(li);
    });
  }

  function escapeAttr(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function addPlayer() {
    if (state.players.length >= MAX_PLAYERS) return;
    const n = state.players.length + 1;
    state.players.push(createPlayer(`Гравець ${n}`));
    persist();
    renderPlayers();
  }

  async function removePlayer(playerId) {
    if (state.players.length <= MIN_PLAYERS) return;
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return;

    if (playerHasInput(player)) {
      const ok = await askConfirm(`Видалити гравця «${player.name.trim() || "Без імені"}» з уже введеними очками?`);
      if (!ok) return;
    }

    state.players = state.players.filter((p) => p.id !== playerId);
    if (state.activePlayerId === playerId) state.activePlayerId = null;
    persist();
    renderPlayers();
  }

  function openScore(playerId) {
    state.activePlayerId = playerId;
    const player = getActivePlayer();
    if (!player) return;
    if (!player.regions.length) {
      player.regions.push(createRegion());
    }
    player.regions.forEach((region) => {
      region.terrain = normalizeTerrain(region.terrain);
    });
    persist();
    showView("score");
    renderRegions();
  }

  function addRegion() {
    const player = getActivePlayer();
    if (!player) return;
    player.regions.push(createRegion());
    persist();
    renderRegions();
  }

  async function removeRegion(regionId) {
    const player = getActivePlayer();
    if (!player) return;
    if (player.regions.length <= 1) return;

    const region = player.regions.find((r) => r.id === regionId);
    if (!region) return;

    if (regionScore(region) > 0) {
      const ok = await askConfirm("Видалити цю область з очками?");
      if (!ok) return;
    }

    player.regions = player.regions.filter((r) => r.id !== regionId);
    if (!player.regions.length) {
      player.regions.push(createRegion());
    }
    persist();
    renderRegions();
  }

  function saveScoreAndBack() {
    persist();
    state.activePlayerId = null;
    showView("table");
    renderPlayers();
  }

  async function resetAll() {
    const ok = await askConfirm("Дійсно скинути підрахунок?");
    if (!ok) return;
    state = clearState();
    ensureStarterPlayers();
    showView("table");
    renderPlayers();
  }

  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      if (target === "rules") {
        const current = Object.entries(els.views).find(([, node]) => !node.hidden)?.[0] || "home";
        rulesReturnView = current === "rules" ? "home" : current;
        showView("rules");
        return;
      }
      if (target === "table") {
        ensureStarterPlayers();
        showView("table");
        renderPlayers();
        return;
      }
      showView(target);
    });
  });

  els.btnRulesBack.addEventListener("click", () => {
    const back = rulesReturnView === "score" ? "table" : rulesReturnView || "home";
    if (back === "table") {
      ensureStarterPlayers();
      showView("table");
      renderPlayers();
      return;
    }
    showView(back);
  });

  els.btnAddPlayer.addEventListener("click", addPlayer);
  els.btnAddRegion.addEventListener("click", addRegion);
  els.btnSaveScore.addEventListener("click", saveScoreAndBack);
  els.btnReset.addEventListener("click", resetAll);

  els.playersList.addEventListener("input", (event) => {
    const input = event.target.closest(".player__name");
    if (!input) return;
    const li = input.closest(".player");
    const player = state.players.find((p) => p.id === li.dataset.id);
    if (!player) return;
    player.name = input.value;
    persist();
    renderLeaderBanner();
  });

  els.playersList.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const li = btn.closest(".player");
    if (!li) return;
    const id = li.dataset.id;
    if (btn.dataset.action === "score") openScore(id);
    if (btn.dataset.action === "remove") removePlayer(id);
  });

  els.regionsList.addEventListener("input", (event) => {
    const field = event.target.closest("[data-field]");
    if (!field) return;
    const li = field.closest(".region");
    const player = getActivePlayer();
    if (!player || !li) return;
    const region = player.regions.find((r) => r.id === li.dataset.id);
    if (!region) return;

    const key = field.dataset.field;
    if (key === "terrain") {
      region.terrain = normalizeTerrain(field.value);
    } else if (key === "tiles") {
      region.tiles = clampInt(field.value, 0, 25, 0);
    } else if (key === "crowns") {
      region.crowns = clampInt(field.value, 0, 25, 0);
    }

    persist();
    els.scoreTotal.textContent = String(playerScore(player));
    const sub = li.querySelector(".region__sub strong");
    if (sub) sub.textContent = String(regionScore(region));
  });

  els.regionsList.addEventListener("change", (event) => {
    const field = event.target.closest('[data-field="terrain"]');
    if (!field) return;
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });

  els.regionsList.addEventListener("click", (event) => {
    const btn = event.target.closest('[data-action="remove-region"]');
    if (!btn || btn.disabled) return;
    const li = btn.closest(".region");
    if (!li) return;
    removeRegion(li.dataset.id);
  });

  ensureStarterPlayers();
  const initial = state.lastView === "table" || state.lastView === "rules" ? state.lastView : "home";
  if (initial === "table") {
    showView("table");
    renderPlayers();
  } else if (initial === "rules") {
    rulesReturnView = "home";
    showView("rules");
  } else {
    showView("home");
  }
})();
