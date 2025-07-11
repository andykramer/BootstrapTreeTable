(function (window) {
  let treeTableInstanceCount = 0;

  const DEFAULTS = {
    tableSelectorId: "treeTable",
    searchContainerId: null,
    showToggleAllButton: true,
    highlightSearchMatches: true,
    searchHighlightColor: "#ffff8b",
    searchMaxLevel: null,
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
    for (const key in options) {
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

  function init(userOptions = {}) {
    const options = mergeOptions(DEFAULTS, userOptions);

    let tableSelector = options.tableSelectorId.startsWith("#")
      ? options.tableSelectorId
      : "#" + options.tableSelectorId;
    const table = document.querySelector(tableSelector);
    if (!table) return;

    const instanceId = ++treeTableInstanceCount;
    const rows = Array.from(table.querySelectorAll("tr"));

    function getLevel(tr) {
      const match = Array.from(tr.classList).find((c) =>
        c.startsWith("level-")
      );
      return match ? parseInt(match.replace("level-", ""), 10) : 0;
    }
    function hasChild(tr, idx) {
      const thisLevel = getLevel(tr);
      const next = rows[idx + 1];
      return !!(next && getLevel(next) > thisLevel);
    }
    function isDataRow(tr) {
      return (
        tr.closest("tbody") &&
        Array.from(tr.classList).some((c) => c.startsWith("level-"))
      );
    }

    // ToggleAll-Button im Table-Header-TH mit fixen und flexiblen Klassen & Icon
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

    // Suchfeld mit fixen und flexiblen Klassen & Reset-Icon
    let searchInput, resetBtn;
    const tableSearchId = "tableSearch" + instanceId;
    const resetSearchId = "resetSearch" + instanceId;

    let searchContainerId = options.searchContainerId
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

    // "Keine Ergebnisse gefunden"-Meldung, immer Hauptklasse plus Option
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

    // Toggle-Buttons für Parent-Zeilen mit Icon aus Option
    function ensureToggleButtons() {
      rows.forEach((tr, idx) => {
        if (
          isDataRow(tr) &&
          hasChild(tr, idx) &&
          !tr.querySelector(".toggle-btn")
        ) {
          tr.children[0].innerHTML = `
            <button class="btn toggle-btn ${
              options.classes.toggleBtn || ""
            }" data-open="false">
              <i class="${options.iconClasses.toggleRow}"></i>
            </button>
          `;
        }
      });
    }

    function attachToggleBtnListeners() {
      table.querySelectorAll(".toggle-btn").forEach((btn) => {
        if (!btn.hasAttribute("data-init")) {
          btn.setAttribute("data-init", "1");
          btn.addEventListener("click", function () {
            const tr = btn.closest("tr");
            const open = btn.getAttribute("data-open") !== "true";
            setBranch(tr, open);
            ensureToggleButtons();
            attachToggleBtnListeners();
            updateAllToggleButtonStates();
            updateToggleAllIcon();
          });
        }
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
        if (reached) {
          if (!isDataRow(row)) continue;
          const rowLevel = getLevel(row);
          if (rowLevel <= thisLevel) break;
          if (!open) {
            row.style.display = "none";
            const btnInRow = row.querySelector(".toggle-btn");
            if (btnInRow) {
              btnInRow.setAttribute("data-open", "false");
              btnInRow.classList.remove("open");
            }
          } else {
            if (rowLevel === thisLevel + 1) row.style.display = "";
          }
        }
      }
      const btn = tr.querySelector(".toggle-btn");
      if (btn) {
        btn.setAttribute("data-open", open ? "true" : "false");
        btn.classList.toggle("open", open);
      }
      updateAllToggleButtonStates();
    }

    function isAnyChildRowVisible() {
      return rows.some(
        (tr) => isDataRow(tr) && tr.style.display !== "none" && getLevel(tr) > 0
      );
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

    if (toggleAllBtn) {
      toggleAllBtn.addEventListener("click", function () {
        if (searchInput && searchInput.value !== "") {
          searchInput.value = "";
          performSearch("");
        }
        const anyVisible = isAnyChildRowVisible();
        rows.forEach((tr) => {
          if (isDataRow(tr) && getLevel(tr) > 0) {
            tr.style.display = anyVisible ? "none" : "";
            const btn = tr.querySelector(".toggle-btn");
            if (btn) {
              btn.setAttribute("data-open", anyVisible ? "false" : "true");
              btn.classList.toggle("open", !anyVisible);
            }
          }
        });
        ensureToggleButtons();
        attachToggleBtnListeners();
        updateAllToggleButtonStates();
        updateToggleAllIcon();
      });
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
      });
    }

    function resetHighlight() {
      rows.forEach((tr) => {
        if (!isDataRow(tr)) return;
        Array.from(tr.cells).forEach((td) => {
          td.innerHTML = td.textContent;
        });
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
          }
          thisLevel = lvl;
        }
        if (lvl === 0) break;
      }
    }
    function performSearch(val) {
      resetHighlight();
      const maxLevel =
        typeof options.searchMaxLevel === "number"
          ? options.searchMaxLevel
          : null;
      if (!val.trim()) {
        rows.forEach((tr) => {
          if (isDataRow(tr)) {
            tr.style.display = getLevel(tr) > 0 ? "none" : "";
            let btn = tr.querySelector(".toggle-btn");
            if (btn) {
              btn.setAttribute("data-open", "false");
              btn.classList.remove("open");
            }
          }
        });
        ensureToggleButtons();
        attachToggleBtnListeners();
        updateAllToggleButtonStates();
        updateToggleAllIcon();
        if (resetBtn) resetBtn.classList.add("d-none");
        if (searchEmptyMsg) searchEmptyMsg.classList.add("d-none");
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
          const text = td.textContent.trim();
          const idx = text.toLowerCase().indexOf(val.toLowerCase());
          if (idx >= 0) {
            if (options.highlightSearchMatches) {
              td.innerHTML =
                text.substring(0, idx) +
                `<mark style="background:${
                  options.searchHighlightColor
                };padding:0 2px;border-radius:2px">${text.substring(
                  idx,
                  idx + val.length
                )}</mark>` +
                text.substring(idx + val.length);
            }
            hit = true;
          }
        });
        tr.style.display = hit ? "" : "none";
        if (hit) foundRows.push(tr);
      });
      foundRows.forEach((tr) => showParentChain(tr));
      ensureToggleButtons();
      attachToggleBtnListeners();
      updateAllToggleButtonStates();
      updateToggleAllIcon();

      let hasVisibleRow = rows.some(
        (tr) => isDataRow(tr) && tr.style.display !== "none"
      );
      if (searchEmptyMsg) {
        if (!hasVisibleRow && searchInput && searchInput.value.trim() !== "") {
          searchEmptyMsg.classList.remove("d-none");
        } else {
          searchEmptyMsg.classList.add("d-none");
        }
      }

      if (resetBtn) resetBtn.classList.remove("d-none");
    }

    rows.forEach((tr) => {
      if (isDataRow(tr)) {
        tr.style.display = getLevel(tr) > 0 ? "none" : "";
        const btn = tr.querySelector(".toggle-btn");
        if (btn) {
          btn.setAttribute("data-open", "false");
          btn.classList.remove("open");
        }
      }
    });

    ensureToggleButtons();
    attachToggleBtnListeners();
    updateAllToggleButtonStates();
    updateToggleAllIcon();

    if (searchInput) {
      searchInput.addEventListener("input", function () {
        performSearch(searchInput.value);
      });
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
  }

  window.BootstrapTreeTable = { init };
})(window);
