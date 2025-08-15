(function (window) {
  let treeTableInstanceCount = 0;

  const DEFAULTS = {
    tableSelectorId: "treeTable",
    searchContainerId: null,
    showToggleAllButton: true,
    highlightSearchMatches: true,
    searchHighlightColor: "#ffff8b",
    searchMaxLevel: null,
    toggleColumnIndex: 0,
    startExpanded: false,
    rememberState: false,
    classes: {
      searchInput: "pe-5",
      searchWrapper: "mb-3 position-relative",
      searchWrapperStyle: "max-width:400px;",
      resetBtn:
        "btn-sm position-absolute top-50 end-0 translate-middle-y me-2 d-none",
      noResults: "alert alert-warning small d-none mt-2",
      toggleBtn: "btn-primary btn-sm",
      toggleAllBtn: "btn-outline-secondary btn-sm",
    },
    iconClasses: {
      toggleRowOpen: "fa-solid fa-chevron-up fa-fw",
      toggleRowClose: "fa-solid fa-chevron-down fa-fw",
      toggleAllOpen: "fa-solid fa-plus fa-fw",
      toggleAllClose: "fa-solid fa-minus fa-fw",
      reset: "fa-solid fa-xmark",
    },
    i18n: {
      searchPlaceholder: "In allen Ebenen suchen...",
      searchResetAria: "Zurücksetzen",
      toggleAllBtnTitle: "Alle ein-/ausklappen",
      noResults: "Keine Ergebnisse gefunden",
    },
  };

  function mergeOptions(defaults, options) {
    const out = { ...defaults };
    for (const key in options || {}) {
      if (
        typeof options[key] === "object" &&
        options[key] !== null &&
        !Array.isArray(options[key])
      ) {
        out[key] = mergeOptions(defaults[key] || {}, options[key]);
      } else {
        out[key] = options[key];
      }
    }
    return out;
  }

  function debounce(fn, wait = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  function updateFAIcon(element, openClasses, closeClasses, isCloseState) {
    if (!element) return;

    // Change all classes
    const openTokens = String(openClasses || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    const closeTokens = String(closeClasses || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    element.classList.remove(...openTokens, ...closeTokens);
    element.classList.add(...(isCloseState ? closeTokens : openTokens));
  }

  function init(userOptions = {}) {
    const options = mergeOptions(DEFAULTS, userOptions);
    const tableSelector = options.tableSelectorId.startsWith("#")
      ? options.tableSelectorId
      : "#" + options.tableSelectorId;
    const table = document.querySelector(tableSelector);
    if (!table) return;

    const instanceId = ++treeTableInstanceCount;
    const rows = Array.from(table.querySelectorAll("tr"));
    const storageKey = `btt-state:${options.tableSelectorId}:${instanceId}`;

    // ---------- Helpers ----------
    function getLevel(tr) {
      const match = Array.from(tr.classList).find((c) =>
        c.startsWith("level-")
      );
      return match ? parseInt(match.replace("level-", ""), 10) : 0;
    }
    function isDataRow(tr) {
      return (
        tr.closest("tbody") &&
        Array.from(tr.classList).some((c) => c.startsWith("level-"))
      );
    }
    function hasChild(tr, idx) {
      const thisLevel = getLevel(tr);
      const next = rows[idx + 1];
      return !!(next && getLevel(next) > thisLevel);
    }
    function setVisible(tr, visible) {
      tr.dataset.visible = visible ? "true" : "false";
      tr.style.display = visible ? "" : "none";
    }

    // Cache Original-HTML für Highlight
    function cacheCellHtml() {
      rows.forEach((tr) => {
        if (!isDataRow(tr)) return;
        Array.from(tr.cells).forEach((td) => {
          if (!td.hasAttribute("data-orig-html")) {
            td.setAttribute("data-orig-html", td.innerHTML);
          }
        });
      });
    }
    function restoreCellHtml(tr) {
      Array.from(tr.cells).forEach((td) => {
        const orig = td.getAttribute("data-orig-html");
        if (orig !== null) td.innerHTML = orig;
      });
    }

    // ToggleAll Button
    let toggleAllBtn = null;
    if (options.showToggleAllButton) {
      const th = table.querySelector("thead tr th");
      if (th && !th.querySelector("#toggleAll" + instanceId)) {
        const btn = document.createElement("button");
        btn.id = "toggleAll" + instanceId;
        btn.className = "btn " + (options.classes.toggleAllBtn || "");
        btn.title = options.i18n.toggleAllBtnTitle;
        btn.innerHTML = `<i id="toggleAllIcon${instanceId}" class="${options.iconClasses.toggleAllOpen}"></i>`;
        th.appendChild(btn);
      }
      toggleAllBtn = document.getElementById("toggleAll" + instanceId);
    }

    // Suche UI
    let searchInput, resetBtn;
    const tableSearchId = "tableSearch" + instanceId;
    const resetSearchId = "resetSearch" + instanceId;
    const searchContainerId = options.searchContainerId
      ? options.searchContainerId.startsWith("#")
        ? options.searchContainerId.slice(1)
        : options.searchContainerId
      : null;

    if (searchContainerId && document.getElementById(searchContainerId)) {
      if (!document.getElementById(tableSearchId)) {
        const searchDiv = document.createElement("div");
        searchDiv.className =
          "position-relative " + (options.classes.searchWrapper || "");
        searchDiv.style.cssText = options.classes.searchWrapperStyle || "";
        searchDiv.innerHTML = `
          <input type="text" id="${tableSearchId}" class="form-control ${
          options.classes.searchInput || ""
        }" placeholder="${options.i18n.searchPlaceholder}"/>
          <button id="${resetSearchId}" type="button" class="btn ${
          options.classes.resetBtn || ""
        }" style="z-index:2" aria-label="${options.i18n.searchResetAria}">
            <i class="${options.iconClasses.reset}"></i>
          </button>
        `;
        document.getElementById(searchContainerId).appendChild(searchDiv);
      }
      searchInput = document.getElementById(tableSearchId);
      resetBtn = document.getElementById(resetSearchId);
    }

    const tableSearchEmptyId = "tableSearchEmpty" + instanceId;
    if (!document.getElementById(tableSearchEmptyId)) {
      const emptyDiv = document.createElement("div");
      emptyDiv.id = tableSearchEmptyId;
      emptyDiv.className =
        "table-search-empty " + (options.classes.noResults || "");
      emptyDiv.textContent = options.i18n.noResults;
      table.after(emptyDiv);
    }
    const searchEmptyMsg = document.getElementById(tableSearchEmptyId);

    // Toggle-Buttons einsetzen
    function ensureToggleButtons() {
      rows.forEach((tr, idx) => {
        if (!isDataRow(tr) || !hasChild(tr, idx)) return;
        const td = tr.cells[options.toggleColumnIndex] || tr.cells[0];
        if (!td) return;
        if (!td.querySelector(".toggle-btn")) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn toggle-btn " + (options.classes.toggleBtn || "");
          btn.setAttribute("data-open", "false");
          btn.setAttribute("aria-expanded", "false");
          btn.setAttribute("aria-label", "Toggle row");
          btn.innerHTML = `<i class="${options.iconClasses.toggleRowClose}"></i>`;

          const wrapper = document.createElement("span");
          while (td.firstChild) wrapper.appendChild(td.firstChild);
          td.appendChild(btn);
          td.appendChild(wrapper);
          td.style.whiteSpace = "nowrap";
          td.classList.add("btt-cell");
        }
      });
    }

    function isAnyChildRowVisible() {
      return rows.some(
        (tr) =>
          isDataRow(tr) && getLevel(tr) > 0 && tr.dataset.visible === "true"
      );
    }

    function updateToggleAllBtnIcon() {
      const icon = document.getElementById("toggleAllIcon" + instanceId);
      if (!icon) return;
      const anyVisible = isAnyChildRowVisible();
      updateFAIcon(
        icon,
        options.iconClasses.toggleAllOpen,
        options.iconClasses.toggleAllClose,
        anyVisible
      );
    }

    function updateRowToggleIcon(btn, open) {
      const icon = btn.querySelector("[data-fa-i2svg], i, svg");
      if (!icon) return;
      updateFAIcon(
        icon,
        options.iconClasses.toggleRowOpen,
        options.iconClasses.toggleRowClose,
        open
      );
    }

    function updateAllToggleButtonStates() {
      rows.forEach((tr, idx) => {
        if (!isDataRow(tr)) return;
        const btn = tr.querySelector(".toggle-btn");
        if (!btn) return;
        const thisLevel = getLevel(tr);
        let hasVisibleChild = false;
        for (let j = idx + 1; j < rows.length; j++) {
          const nextTr = rows[j];
          if (!isDataRow(nextTr)) continue;
          const nextLevel = getLevel(nextTr);
          if (nextLevel <= thisLevel) break;
          if (
            nextLevel === thisLevel + 1 &&
            nextTr.dataset.visible === "true"
          ) {
            hasVisibleChild = true;
            break;
          }
        }
        btn.setAttribute("data-open", hasVisibleChild ? "true" : "false");
        btn.classList.toggle("open", hasVisibleChild);
        btn.setAttribute("aria-expanded", hasVisibleChild ? "true" : "false");
        updateRowToggleIcon(btn, hasVisibleChild);
      });
    }

    function setBranch(tr, open) {
      const thisLevel = getLevel(tr);
      let reached = false;

      for (const row of rows) {
        if (row === tr) {
          reached = true;
          continue;
        }
        if (!reached || !isDataRow(row)) continue;

        const rowLevel = getLevel(row);
        if (rowLevel <= thisLevel) break;

        if (!open) {
          setVisible(row, false);
          const btnInRow = row.querySelector(".toggle-btn");
          if (btnInRow) {
            btnInRow.setAttribute("data-open", "false");
            btnInRow.classList.remove("open");
            btnInRow.setAttribute("aria-expanded", "false");
          }
        } else {
          if (rowLevel === thisLevel + 1) setVisible(row, true);
        }
      }

      const btn = tr.querySelector(".toggle-btn");
      if (btn) {
        btn.setAttribute("data-open", open ? "true" : "false");
        btn.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
        updateRowToggleIcon(btn, open);
      }

      updateAllToggleButtonStates();
      updateToggleAllBtnIcon();
      persistState();
    }

    function resetHighlight() {
      rows.forEach((tr) => {
        if (isDataRow(tr)) restoreCellHtml(tr);
      });
    }

    function showParentChain(tr) {
      let thisLevel = getLevel(tr);
      let idx = rows.indexOf(tr);
      for (let i = idx - 1; i >= 0; i--) {
        let tr2 = rows[i];
        if (!isDataRow(tr2)) continue;
        let lvl = getLevel(tr2);
        if (lvl < thisLevel) {
          setVisible(tr2, true);
          let btn = tr2.querySelector(".toggle-btn");
          if (btn) {
            btn.setAttribute("data-open", "true");
            btn.classList.add("open");
            btn.setAttribute("aria-expanded", "true");
          }
          thisLevel = lvl;
        }
        if (lvl === 0) break;
      }
    }

    function highlightHtml(html, query) {
      if (!options.highlightSearchMatches || !query) return html;
      const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(esc(query), "ig");
      return html.replace(
        re,
        (m) =>
          `<mark style="background:${options.searchHighlightColor};padding:0 2px;border-radius:2px">${m}</mark>`
      );
    }

    function performSearch(val) {
      resetHighlight();
      const q = val.trim();
      const maxLevel =
        typeof options.searchMaxLevel === "number"
          ? options.searchMaxLevel
          : null;

      if (!q) {
        rows.forEach((tr) => {
          if (!isDataRow(tr)) return;
          const isRoot = getLevel(tr) === 0;
          const visible = options.startExpanded || isRoot;
          setVisible(tr, visible);
          const btn = tr.querySelector(".toggle-btn");
          if (btn) {
            const open = visible && !isRoot;
            btn.setAttribute("data-open", open ? "true" : "false");
            btn.classList.toggle("open", open);
            btn.setAttribute("aria-expanded", open ? "true" : "false");
          }
        });
        ensureToggleButtons();
        updateAllToggleButtonStates();
        updateToggleAllBtnIcon();
        if (resetBtn) resetBtn.classList.add("d-none");
        if (searchEmptyMsg) searchEmptyMsg.classList.add("d-none");
        persistState();
        return;
      }

      let foundRows = [];
      rows.forEach((tr) => {
        if (!isDataRow(tr)) return;
        const lvl = getLevel(tr);
        if (maxLevel !== null && lvl > maxLevel) {
          setVisible(tr, false);
          return;
        }
        let hit = false;
        Array.from(tr.cells).forEach((td) => {
          const orig = td.getAttribute("data-orig-html") ?? td.innerHTML;
          if (!orig) return;
          const plain = td.textContent || "";
          if (plain.toLowerCase().includes(q.toLowerCase())) {
            td.innerHTML = highlightHtml(orig, q);
            hit = true;
          }
        });
        setVisible(tr, hit);
        if (hit) foundRows.push(tr);
      });

      foundRows.forEach((tr) => showParentChain(tr));
      ensureToggleButtons();
      updateAllToggleButtonStates();
      updateToggleAllBtnIcon();

      const hasVisibleRow = rows.some(
        (tr) => isDataRow(tr) && tr.dataset.visible === "true"
      );
      if (searchEmptyMsg) {
        if (!hasVisibleRow) searchEmptyMsg.classList.remove("d-none");
        else searchEmptyMsg.classList.add("d-none");
      }
      if (resetBtn) resetBtn.classList.remove("d-none");
    }

    function expandAll() {
      rows.forEach((tr) => {
        if (isDataRow(tr)) setVisible(tr, true);
      });
      updateAllToggleButtonStates();
      updateToggleAllBtnIcon();
      persistState();
    }

    function collapseAll() {
      rows.forEach((tr) => {
        if (!isDataRow(tr)) return;
        const visible = getLevel(tr) === 0;
        setVisible(tr, visible);
        const btn = tr.querySelector(".toggle-btn");
        if (btn) {
          btn.setAttribute("data-open", "false");
          btn.classList.remove("open");
          btn.setAttribute("aria-expanded", "false");
        }
      });
      updateAllToggleButtonStates();
      updateToggleAllBtnIcon();
      persistState();
    }

    function persistState() {
      if (!options.rememberState) return;
      const state = rows
        .filter((tr) => isDataRow(tr))
        .map((tr) => ({
          idx: rows.indexOf(tr),
          visible: tr.dataset.visible === "true",
          open:
            !!tr.querySelector(".toggle-btn") &&
            tr.querySelector(".toggle-btn").classList.contains("open"),
        }));
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch (_) {}
    }
    function restoreState() {
      if (!options.rememberState) return false;
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return false;
        const state = JSON.parse(raw);
        if (!Array.isArray(state)) return false;
        state.forEach((s) => {
          const tr = rows[s.idx];
          if (!tr || !isDataRow(tr)) return;
          setVisible(tr, !!s.visible);
          const btn = tr.querySelector(".toggle-btn");
          if (btn) {
            btn.classList.toggle("open", !!s.open);
            btn.setAttribute("data-open", s.open ? "true" : "false");
            btn.setAttribute("aria-expanded", s.open ? "true" : "false");
          }
        });
        updateAllToggleButtonStates();
        updateToggleAllBtnIcon();
        return true;
      } catch (_) {
        return false;
      }
    }

    cacheCellHtml();
    rows.forEach((tr) => {
      if (!isDataRow(tr)) return;
      const isRoot = getLevel(tr) === 0;
      const visible = options.startExpanded || isRoot;
      setVisible(tr, visible);
    });

    ensureToggleButtons();
    if (!restoreState()) {
      updateAllToggleButtonStates();
      updateToggleAllBtnIcon();
    }

    table.addEventListener("click", function (e) {
      const btn = e.target.closest(".toggle-btn");
      if (!btn) return;
      const tr = btn.closest("tr");
      const open = btn.getAttribute("data-open") !== "true";
      setBranch(tr, open);
    });

    if (toggleAllBtn) {
      toggleAllBtn.addEventListener("click", function () {
        if (searchInput && searchInput.value !== "") {
          searchInput.value = "";
          performSearch("");
        }
        if (isAnyChildRowVisible()) collapseAll();
        else expandAll();
      });
    }

    if (searchInput && resetBtn) {
      searchInput.addEventListener(
        "input",
        debounce((e) => performSearch(e.target.value))
      );
      resetBtn.addEventListener("click", () => {
        searchInput.value = "";
        performSearch("");
      });
    }
  }

  window.BootstrapTreeTable = { init };
})(window);
