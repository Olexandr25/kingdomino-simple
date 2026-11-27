(function () {
  const {
    createPlayer,
    createRegion,
    loadState,
    saveState,
    clearState,
    PLAYER_COLORS,
    normalizeColor,
    takenColors,
    nextAvailableColor,
    assignUniqueColors,
  } = KingdominoStorage;
  const {
    TERRAINS,
    clampInt,
    normalizeTerrain,
    regionScore,
    playerScore,
    regionHasInput,
    playerHasInput,
    comparePlayers,
  } = KingdominoScoring;

  const MAX_PLAYERS = 4;
  const MIN_PLAYERS = 2;

  /** Fun Ukrainian royal / animal king nicknames. */
  const KING_NAMES = [
    "Король Бобер",
    "Цар Їжак",
    "Князь Кабан",
    "Король Гусак",
    "Імператор Хомʼяк",
    "Королева Лисиця",
    "Княгиня Сова",
    "Король Баран",
    "Цар Воробей",
    "Князь Ведмідь",
    "Король Качур",
    "Барон Їжачок",
    "Герцог Борсук",
    "Король Курка",
    "Цар Осел",
    "Князь Кріт",
    "Королева Качка",
    "Імператриця Білка",
    "Король Пес",
    "Цар Кіт",
    "Князь Заєць",
    "Король Вовк",
    "Баронеса Гуска",
    "Герцогиня Ластівка",
    "Король Їжачисько",
    "Цариця Миша",
    "Князь Бугай",
    "Король Кабанчик",
    "Граф Ховрах",
    "Королева Сорока",
  ];

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
    scoreHint: document.getElementById("score-hint"),
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
    let dirty = false;
    if (state.players.length === 0) {
      const p1 = createPlayer("Гравець 1", "pink", []);
      const p2 = createPlayer("Гравець 2", "yellow", [p1]);
      state.players = [p1, p2];
      dirty = true;
    }

    const needsColorFix = state.players.some((p, i, all) => {
      const color = normalizeColor(p.color);
      if (!color) return true;
      return all.some((other, j) => j !== i && other.color === color);
    });
    if (needsColorFix) {
      state.players = assignUniqueColors(state.players);
      dirty = true;
    }

    state.players.forEach((player) => {
      if (!Array.isArray(player.regions) || player.regions.length === 0) {
        player.regions = [createRegion()];
        dirty = true;
      }
      player.regions.forEach((region) => {
        const next = normalizeTerrain(region.terrain);
        if (region.terrain !== next) {
          region.terrain = next;
          dirty = true;
        }
      });
    });

    if (dirty) persist();
  }

  function randomKingName(excludeNames) {
    const taken = new Set((excludeNames || []).map((n) => String(n).trim().toLowerCase()));
    const pool = KING_NAMES.filter((n) => !taken.has(n.toLowerCase()));
    const list = pool.length > 0 ? pool : KING_NAMES;
    return list[Math.floor(Math.random() * list.length)];
  }

  function colorSwatchesHtml(player) {
    const taken = takenColors(state.players, player.id);
    return `
      <div class="player__colors" role="radiogroup" aria-label="Колір гравця">
        ${PLAYER_COLORS.map((c) => {
          const selected = player.color === c.id;
          const disabled = !selected && taken.has(c.id);
          return `
            <button
              type="button"
              class="color-swatch color-swatch--${c.id}${selected ? " is-selected" : ""}"
              data-action="color"
              data-color="${c.id}"
              role="radio"
              aria-checked="${selected ? "true" : "false"}"
              aria-label="${c.label}${disabled ? " (зайнято)" : ""}"
              ${disabled ? "disabled" : ""}
              title="${c.label}${disabled ? " — зайнято" : ""}"
            ></button>
          `;
        }).join("")}
      </div>
    `;
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
    const isHint = state.players.length === 0 || maxScore === 0;
    els.leaderBanner.classList.toggle("is-hint", isHint);
    els.leaderBanner.classList.toggle("is-tie", isTie && maxScore > 0);

    if (state.players.length === 0) {
      els.leaderBanner.textContent = "Додайте гравців, щоб почати.";
      return;
    }

    if (maxScore === 0) {
      els.leaderBanner.textContent = "Поки всі мають 0 — відкрийте «Підрахунок» і введіть області.";
      return;
    }

    if (isTie) {
      const names = leaders.map((l) => l.name).join(", ");
      els.leaderBanner.textContent = `Нічия: ${names} — по ${maxScore} оч.`;
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
      const color = normalizeColor(player.color) || "pink";
      player.color = color;
      const li = document.createElement("li");
      li.className =
        "player player--" +
        color +
        (maxScore > 0 && leaderIds.has(player.id) ? " is-leader" : "");
      li.dataset.id = player.id;

      const canRemove = state.players.length > MIN_PLAYERS;

      li.innerHTML = `
        <div class="player__head">
          <label class="player__label" for="player-name-${player.id}">Імʼя</label>
          <button
            type="button"
            class="btn btn--text btn--name-dice"
            data-action="random-name"
            aria-label="Випадкове королівське імʼя"
            title="Випадкове королівське імʼя"
          >Випадково</button>
        </div>
        <div class="player__name-row">
          <input
            id="player-name-${player.id}"
            class="player__name"
            type="text"
            maxlength="28"
            autocomplete="off"
            aria-label="Імʼя гравця ${index + 1}"
            value="${escapeAttr(player.name)}"
          />
        </div>
        <span class="player__score">${score}</span>
        ${colorSwatchesHtml(player)}
        <div class="player__meta">
          ${maxScore > 0 && leaderIds.has(player.id) ? '<span class="player__badge">Лідер</span>' : ""}
          <div class="player__actions">
            <button type="button" class="btn btn--secondary btn--compact" data-action="score">Підрахунок</button>
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
    updateScoreHint(player);
    els.regionsList.innerHTML = "";

    const canRemoveRegion = player.regions.length > 1;

    player.regions.forEach((region, index) => {
      const li = document.createElement("li");
      region.terrain = normalizeTerrain(region.terrain);
      li.className = `region region--${region.terrain}`;
      li.dataset.id = region.id;

      li.innerHTML = `
        <div class="field field--terrain">
          <label for="terrain-${region.id}">Місцевість</label>
          <select id="terrain-${region.id}" data-field="terrain" required aria-label="Місцевість області ${index + 1}">${terrainOptions(region.terrain)}</select>
        </div>
        <div class="field">
          <label for="tiles-${region.id}">Клітинки</label>
          <input id="tiles-${region.id}" data-field="tiles" type="number" inputmode="numeric" min="0" max="25" value="${clampInt(region.tiles, 0, 25, 0)}" aria-label="Клітинки області ${index + 1}" />
        </div>
        <div class="field">
          <label for="crowns-${region.id}">Корони</label>
          <input id="crowns-${region.id}" data-field="crowns" type="number" inputmode="numeric" min="0" max="25" value="${clampInt(region.crowns, 0, 25, 1)}" aria-label="Корони області ${index + 1}" />
        </div>
        <div class="region__points">
          <span>Очки</span>
          <strong>${regionScore(region)}</strong>
        </div>
        <button type="button" class="btn btn--icon" data-action="remove-region" aria-label="Видалити область ${index + 1}" ${canRemoveRegion ? "" : "disabled"}>×</button>
      `;

      els.regionsList.appendChild(li);
    });
  }

  function updateScoreHint(player) {
    if (!els.scoreHint) return;
    const hasAnyInput = (player.regions || []).some(regionHasInput) || playerScore(player) > 0;
    els.scoreHint.hidden = hasAnyInput;
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
    const color = nextAvailableColor(state.players);
    if (!color) return;
    const n = state.players.length + 1;
    state.players.push(createPlayer(`Гравець ${n}`, color, state.players));
    persist();
    renderPlayers();
  }

  function setPlayerColor(playerId, colorId) {
    const player = state.players.find((p) => p.id === playerId);
    const color = normalizeColor(colorId);
    if (!player || !color) return;
    if (takenColors(state.players, playerId).has(color)) return;
    player.color = color;
    persist();
    renderPlayers();
  }

  function assignRandomName(playerId) {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return;
    const others = state.players.filter((p) => p.id !== playerId).map((p) => p.name);
    player.name = randomKingName(others);
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
    const prev = player.regions[player.regions.length - 1];
    const next = createRegion();
    if (prev) next.terrain = normalizeTerrain(prev.terrain);
    player.regions.push(next);
    persist();
    renderRegions();
    const last = els.regionsList.lastElementChild;
    if (last) {
      last.scrollIntoView({ block: "nearest", behavior: "smooth" });
      const tilesInput = last.querySelector('[data-field="tiles"]');
      if (tilesInput) tilesInput.focus();
    }
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
    if (!btn || btn.disabled) return;
    const li = btn.closest(".player");
    if (!li) return;
    const id = li.dataset.id;
    if (btn.dataset.action === "score") openScore(id);
    if (btn.dataset.action === "remove") removePlayer(id);
    if (btn.dataset.action === "color") setPlayerColor(id, btn.dataset.color);
    if (btn.dataset.action === "random-name") assignRandomName(id);
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
      li.className = `region region--${region.terrain}`;
    } else if (key === "tiles") {
      region.tiles = clampInt(field.value, 0, 25, 0);
    } else if (key === "crowns") {
      region.crowns = clampInt(field.value, 0, 25, 1);
    }

    persist();
    els.scoreTotal.textContent = String(playerScore(player));
    updateScoreHint(player);
    const sub = li.querySelector(".region__points strong");
    if (sub) sub.textContent = String(regionScore(region));
  });

  els.regionsList.addEventListener("focusin", (event) => {
    const input = event.target.closest('input[type="number"]');
    if (!input) return;
    requestAnimationFrame(() => input.select());
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
