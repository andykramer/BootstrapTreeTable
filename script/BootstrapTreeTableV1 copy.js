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
      toggleBtn: "btn-primary",
      toggleAllBtn: "btn-outline-secondary",
    },
    iconClasses: {
      toggleRow: "fa-solid fa-chevron-right fa-fw rotate-icon",
      toggleAllOpen: "fa-solid fa-plus",
      toggleAllClose: "fa-solid fa-minus",
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

  // Simple debounce
  function debounce(fn, wait = 200) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
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

    // Cache Original-HTML je Zelle (sauberes Highlight)
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

    // Toggle-Buttons einfügen (ohne Zellinhalt zu überschreiben)
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
          btn.innerHTML = `<i class="${options.iconClasses.toggleRow}"></i>`;

          const wrapper = document.createElement("span");
          while (td.firstChild) wrapper.appendChild(td.firstChild);
          td.appendChild(btn);
          td.appendChild(wrapper);
          td.style.whiteSpace = "nowrap";
          td.classList.add("btt-cell");
        }
      });
    }

    // function isAnyChildRowVisible() {
    //   return rows.some(
    //     (tr) => isDataRow(tr) && tr.style.display !== "none" && getLevel(tr) > 0
    //   );
    // }
    function isAnyChildRowVisible() {
      console.log("Checking visibility of child rows...");
      return rows.some((tr) => {
        if (!isDataRow(tr) || getLevel(tr) <= 0) return false;
        const inlineVisible = tr.style.display !== "none";
        const computedVisible = window.getComputedStyle(tr).display !== "none";
        const hasOffsetParent = tr.offsetParent !== null;
        return inlineVisible && computedVisible && hasOffsetParent;
      });
    }

    function updateToggleAllIcon() {
      const toggleAllIcon = document.getElementById(
        "toggleAllIcon" + instanceId
      );

      if (!toggleAllIcon) return;
      toggleAllIcon.className = isAnyChildRowVisible()
        ? options.iconClasses.toggleAllClose
        : options.iconClasses.toggleAllOpen;
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
          if (nextLevel === thisLevel + 1 && nextTr.style.display !== "none") {
            hasVisibleChild = true;
            break;
          }
        }
        btn.setAttribute("data-open", hasVisibleChild ? "true" : "false");
        btn.classList.toggle("open", hasVisibleChild);
        btn.setAttribute("aria-expanded", hasVisibleChild ? "true" : "false");
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
        if (!reached) continue;
        if (!isDataRow(row)) continue;

        const rowLevel = getLevel(row);
        if (rowLevel <= thisLevel) break;

        if (!open) {
          row.style.display = "none";
          const btnInRow = row.querySelector(".toggle-btn");
          if (btnInRow) {
            btnInRow.setAttribute("data-open", "false");
            btnInRow.classList.remove("open");
            btnInRow.setAttribute("aria-expanded", "false");
          }
        } else {
          if (rowLevel === thisLevel + 1) row.style.display = "";
        }
      }

      const btn = tr.querySelector(".toggle-btn");
      if (btn) {
        btn.setAttribute("data-open", open ? "true" : "false");
        btn.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");
      }

      updateAllToggleButtonStates();
      updateToggleAllIcon();
      persistState();
    }

    function resetHighlight() {
      rows.forEach((tr) => {
        if (!isDataRow(tr)) return;
        restoreCellHtml(tr);
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
          tr2.style.display = "";
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
          if (isDataRow(tr)) {
            tr.style.display =
              getLevel(tr) > 0 && !options.startExpanded ? "none" : "";
            const btn = tr.querySelector(".toggle-btn");
            if (btn) {
              const open = options.startExpanded ? "true" : "false";
              btn.setAttribute("data-open", open);
              btn.classList.toggle("open", options.startExpanded);
              btn.setAttribute(
                "aria-expanded",
                options.startExpanded ? "true" : "false"
              );
            }
          }
        });
        ensureToggleButtons();
        updateAllToggleButtonStates();
        updateToggleAllIcon();
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
          tr.style.display = "none";
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
        tr.style.display = hit ? "" : "none";
        if (hit) foundRows.push(tr);
      });

      foundRows.forEach((tr) => showParentChain(tr));
      ensureToggleButtons();
      updateAllToggleButtonStates();
      updateToggleAllIcon();

      const hasVisibleRow = rows.some(
        (tr) => isDataRow(tr) && tr.style.display !== "none"
      );
      if (searchEmptyMsg) {
        if (!hasVisibleRow) searchEmptyMsg.classList.remove("d-none");
        else searchEmptyMsg.classList.add("d-none");
      }
      if (resetBtn) resetBtn.classList.remove("d-none");
    }

    function expandAll() {
      rows.forEach((tr) => {
        if (isDataRow(tr)) tr.style.display = "";
        const btn = tr.querySelector(".toggle-btn");
        if (btn) {
          btn.setAttribute("data-open", "true");
          btn.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
      updateAllToggleButtonStates();
      updateToggleAllIcon();
      persistState();
    }

    function collapseAll() {
      rows.forEach((tr) => {
        if (isDataRow(tr)) tr.style.display = getLevel(tr) > 0 ? "none" : "";
        const btn = tr.querySelector(".toggle-btn");
        if (btn) {
          const open =
            getLevel(tr) === 0
              ? options.startExpanded
                ? "true"
                : "false"
              : "false";
          btn.setAttribute("data-open", open);
          btn.classList.toggle("open", open === "true");
          btn.setAttribute("aria-expanded", open === "true" ? "true" : "false");
        }
      });
      updateAllToggleButtonStates();
      updateToggleAllIcon();
      persistState();
    }

    function persistState() {
      if (!options.rememberState) return;
      const state = rows
        .filter((tr) => isDataRow(tr))
        .map((tr) => ({
          idx: rows.indexOf(tr),
          visible: tr.style.display !== "none",
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
          tr.style.display = s.visible ? "" : "none";
          const btn = tr.querySelector(".toggle-btn");
          if (btn) {
            btn.classList.toggle("open", s.open);
            btn.setAttribute("data-open", s.open ? "true" : "false");
            btn.setAttribute("aria-expanded", s.open ? "true" : "false");
          }
        });
        updateAllToggleButtonStates();
        updateToggleAllIcon();
        return true;
      } catch (_) {
        return false;
      }
    }

    // Initialzustand
    cacheCellHtml();
    rows.forEach((tr) => {
      if (!isDataRow(tr)) return;
      const isRoot = getLevel(tr) === 0;
      const show = options.startExpanded || isRoot;
      tr.style.display = show ? "" : "none";
    });

    ensureToggleButtons();
    if (!restoreState()) {
      updateAllToggleButtonStates();
      updateToggleAllIcon();
    }

    // Delegierter Click-Handler (inkl. Icon-Update)
    table.addEventListener("click", function (e) {
      const btn = e.target.closest(".toggle-btn");
      if (!btn) return;
      const tr = btn.closest("tr");
      const open = btn.getAttribute("data-open") !== "true";
      setBranch(tr, open);
      updateToggleAllIcon();
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
      const runSearch = debounce(() => performSearch(searchInput.value), 180);
      searchInput.addEventListener("input", runSearch);
      resetBtn.addEventListener("click", function () {
        searchInput.value = "";
        performSearch("");
      });
      searchInput.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
          searchInput.value = "";
          performSearch("");
        }
      });
    }

    // API dieses Instances
    return {
      expandAll,
      collapseAll,
      search: (v) => performSearch(String(v ?? "")),
      resetSearch: () => performSearch(""),
    };
  }

  window.BootstrapTreeTable = { init };
})(window);
