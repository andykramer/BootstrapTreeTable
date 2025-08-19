class BootstrapTreeTable {
  //  Default options
  static DEFAULTS = {
    tableSelectorId: "treeTable",
    searchContainerId: null,
    showToggleAllButton: true,
    highlightSearchMatches: true,
    searchHighlightColor: "#ffff8b",
    searchMaxLevel: null,
    toggleColumnIndex: 0,
    startExpanded: false,
    rememberState: false,
    restorePreSearchStateOnClear: false,
    classes: {
      searchInput: "pe-5",
      searchWrapper: "mb-3 position-relative",
      searchWrapperStyle: "max-width:400px;",
      resetBtn:
        "btn-sm position-absolute top-50 end-0 translate-middle-y me-2 d-none",
      noResults: "alert alert-warning small d-none mt-2",
      toggleRowBtn: "btn-primary btn-sm",
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
      searchPlaceholder: "Search all levels...",
      searchResetAria: "Reset",
      toggleAllBtnTitle: "Expand/collapse all",
      noResults: "No results found",
    },
  };

  //  Constructor
  constructor(selectorOrElement, userOptions = {}) {
    this.options = this._mergeOptions(BootstrapTreeTable.DEFAULTS, userOptions);
    this.table = this._resolveTable(selectorOrElement);
    if (!this.table) {
      console.error("BootstrapTreeTable: Table element not found.");
      return;
    }

    if (this.table.id) {
      this.storageKey = `btt-state:${this.table.id}`;
    } else {
      const allTables = Array.from(document.querySelectorAll("table"));
      const idx = allTables.indexOf(this.table);
      this.storageKey = `btt-state:table-${idx}`;
    }

    this.rows = Array.from(this.table.querySelectorAll("tr"));
    this.searchInput = null;
    this.resetBtn = null;
    this.noResultsDiv = null;
    this.toggleAllBtn = null;

    this._preSearchSnapshot = null;
    this._hadSnapshotThisSearch = false;

    this._init();
  }

  //  Initialize table
  _init() {
    this._cacheCellHtml();
    this._initVisibility();
    this._ensureToggleButtons();
    this._setupSearchUI();
    this._setupToggleAllBtn();

    if (!this._restoreState()) {
      this._updateAllToggleButtonStates();
      this._updateToggleAllBtnIcon();
    }
    this._setupRowClickHandler();
  }

  //  Merge user options with defaults
  _mergeOptions(defaults, options) {
    const out = { ...defaults };
    for (const key in options || {}) {
      if (
        typeof options[key] === "object" &&
        options[key] !== null &&
        !Array.isArray(options[key])
      ) {
        out[key] = this._mergeOptions(defaults[key] || {}, options[key]);
      } else {
        out[key] = options[key];
      }
    }
    return out;
  }

  //  Resolve table element
  _resolveTable(sel) {
    if (typeof sel === "string") {
      return document.querySelector(sel.startsWith("#") ? sel : `#${sel}`);
    }
    return sel instanceof HTMLElement ? sel : null;
  }

  //  Get hierarchy level of a row
  _getLevel(tr) {
    const match = Array.from(tr.classList).find((c) => c.startsWith("level-"));
    return match ? parseInt(match.replace("level-", ""), 10) : 0;
  }

  //  Check if row is a data row
  _isDataRow(tr) {
    return (
      tr.closest("tbody") &&
      Array.from(tr.classList).some((c) => c.startsWith("level-"))
    );
  }

  //  Set row visibility
  _setVisible(tr, visible) {
    tr.dataset.visible = visible ? "true" : "false";
    tr.style.display = visible ? "" : "none";
  }

  //  Cache original cell HTML for search restore
  _cacheCellHtml() {
    this.rows.forEach((tr) => {
      if (!this._isDataRow(tr)) return;
      Array.from(tr.cells).forEach((td) => {
        if (!td.querySelector(".btt-content")) {
          const content = document.createElement("span");
          content.className = "btt-content";
          while (td.firstChild) content.appendChild(td.firstChild);
          td.appendChild(content);
        }
        const content = td.querySelector(".btt-content");
        if (content && !content.hasAttribute("data-orig-html")) {
          content.setAttribute("data-orig-html", content.innerHTML);
        }
      });
    });
  }

  //  Restore original cell HTML
  _restoreCellHtml(tr) {
    Array.from(tr.cells).forEach((td) => {
      const content = td.querySelector(".btt-content");
      if (!content) return;
      const orig = content.getAttribute("data-orig-html");
      if (orig !== null) content.innerHTML = orig;
    });
  }

  //  Initialize default visibility
  _initVisibility() {
    this.rows.forEach((tr) => {
      if (!this._isDataRow(tr)) return;
      const isRoot = this._getLevel(tr) === 0;
      const visible = this.options.startExpanded || isRoot;
      this._setVisible(tr, visible);
    });
  }

  //  Add row toggle buttons
  _ensureToggleButtons() {
    this.rows.forEach((tr, idx) => {
      if (!this._isDataRow(tr)) return;
      Array.from(tr.cells).forEach((td) => {
        if (!td.querySelector(".btt-content")) {
          const content = document.createElement("span");
          content.className = "btt-content";
          while (td.firstChild) content.appendChild(td.firstChild);
          td.appendChild(content);
        }
        const content = td.querySelector(".btt-content");
        if (content && !content.hasAttribute("data-orig-html")) {
          content.setAttribute("data-orig-html", content.innerHTML);
        }
      });

      const thisLevel = this._getLevel(tr);
      const next = this.rows[idx + 1];
      if (!(next && this._getLevel(next) > thisLevel)) return;

      const td = tr.cells[this.options.toggleColumnIndex] || tr.cells[0];
      if (!td || td.querySelector(".toggle-row-btn")) return;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "btn toggle-row-btn " + (this.options.classes.toggleRowBtn || "");
      btn.setAttribute("data-open", "false");
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-label", "Toggle row");
      btn.innerHTML = `<i class="${this.options.iconClasses.toggleRowClose}"></i>`;

      const content = td.querySelector(".btt-content");
      td.insertBefore(btn, content);
      td.style.whiteSpace = "nowrap";
      td.classList.add("btt-cell");
    });
  }

  //  Check if any child rows are visible
  _isAnyChildRowVisible() {
    return this.rows.some(
      (tr) =>
        this._isDataRow(tr) &&
        this._getLevel(tr) > 0 &&
        tr.dataset.visible === "true"
    );
  }

  //  Update toggle-all button icon
  _updateToggleAllBtnIcon() {
    if (!this.toggleAllBtn) return;
    const anyVisible = this._isAnyChildRowVisible();
    const nextClasses = anyVisible
      ? this.options.iconClasses.toggleAllClose
      : this.options.iconClasses.toggleAllOpen;
    this.toggleAllBtn.innerHTML = `<i class="${nextClasses}"></i>`;
  }

  //  Update row toggle button icon
  _updateRowToggleIcon(btn, open) {
    if (!btn) return;
    const nextClasses = open
      ? this.options.iconClasses.toggleRowOpen
      : this.options.iconClasses.toggleRowClose;
    btn.innerHTML = `<i class="${nextClasses}"></i>`;
  }

  //  Refresh all row toggle states
  _updateAllToggleButtonStates() {
    this.rows.forEach((tr, idx) => {
      if (!this._isDataRow(tr)) return;
      const btn = tr.querySelector(".toggle-row-btn");
      if (!btn) return;
      const thisLevel = this._getLevel(tr);
      let hasVisibleChild = false;
      for (let j = idx + 1; j < this.rows.length; j++) {
        const nextTr = this.rows[j];
        if (!this._isDataRow(nextTr)) continue;
        const nextLevel = this._getLevel(nextTr);
        if (nextLevel <= thisLevel) break;
        if (nextLevel === thisLevel + 1 && nextTr.dataset.visible === "true") {
          hasVisibleChild = true;
          break;
        }
      }
      btn.setAttribute("data-open", hasVisibleChild ? "true" : "false");
      btn.classList.toggle("open", hasVisibleChild);
      btn.setAttribute("aria-expanded", hasVisibleChild ? "true" : "false");
      this._updateRowToggleIcon(btn, hasVisibleChild);
    });
  }

  //  Expand or collapse a branch
  _setBranch(tr, open) {
    const thisLevel = this._getLevel(tr);
    let reached = false;
    for (const row of this.rows) {
      if (row === tr) {
        reached = true;
        continue;
      }
      if (!reached || !this._isDataRow(row)) continue;
      const rowLevel = this._getLevel(row);
      if (rowLevel <= thisLevel) break;
      if (!open) {
        this._setVisible(row, false);
        const btnInRow = row.querySelector(".toggle-row-btn");
        if (btnInRow) {
          btnInRow.setAttribute("data-open", "false");
          btnInRow.classList.remove("open");
          btnInRow.setAttribute("aria-expanded", "false");
          this._updateRowToggleIcon(btnInRow, false);
        }
      } else {
        if (rowLevel === thisLevel + 1) this._setVisible(row, true);
      }
    }
    const btn = tr.querySelector(".toggle-row-btn");
    if (btn) {
      btn.setAttribute("data-open", open ? "true" : "false");
      btn.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      this._updateRowToggleIcon(btn, open);
    }
    this._updateAllToggleButtonStates();
    this._updateToggleAllBtnIcon();
    this._persistState();
  }

  //  Build search UI
  _setupSearchUI() {
    if (!this.options.searchContainerId) return;
    const container = document.getElementById(this.options.searchContainerId);
    if (!container) return;

    const wrapper = document.createElement("div");
    wrapper.className = this.options.classes.searchWrapper;
    wrapper.style = this.options.classes.searchWrapperStyle;

    const input = document.createElement("input");
    input.type = "text";
    input.className =
      "form-control " + (this.options.classes.searchInput || "");
    input.placeholder = this.options.i18n.searchPlaceholder;
    input.setAttribute("aria-label", this.options.i18n.searchPlaceholder);
    wrapper.appendChild(input);

    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "btn " + this.options.classes.resetBtn;
    reset.setAttribute("aria-label", this.options.i18n.searchResetAria);
    reset.innerHTML = `<i class="${this.options.iconClasses.reset}"></i>`;
    wrapper.appendChild(reset);

    const noResults = document.createElement("div");
    noResults.className =
      "table-search-empty " + (this.options.classes.noResults || "");
    noResults.textContent = this.options.i18n.noResults;
    container.appendChild(wrapper);
    container.appendChild(noResults);

    this.searchInput = input;
    this.resetBtn = reset;
    this.noResultsDiv = noResults;

    input.addEventListener("input", () => {
      const term = input.value.trim().toLowerCase();
      this._performSearch(term);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        input.value = "";
        this._performSearch("");
        reset.classList.add("d-none");
        noResults.classList.add("d-none");
      }
    });

    reset.addEventListener("click", () => {
      input.value = "";
      this._performSearch("");
      reset.classList.add("d-none");
      noResults.classList.add("d-none");
    });
  }

  //  Perform search
  _performSearch(term) {
    let matches = 0;
    if (!term) {
      if (
        this.options.restorePreSearchStateOnClear &&
        this._preSearchSnapshot
      ) {
        this._applyState(this._preSearchSnapshot);
        this._preSearchSnapshot = null;
      } else {
        this._initVisibility();
        this._ensureToggleButtons();
        this._updateAllToggleButtonStates();
        this._updateToggleAllBtnIcon();
      }
      this.noResultsDiv.classList.add("d-none");
      this.resetBtn.classList.add("d-none");
      return;
    }

    if (!this._hadSnapshotThisSearch) {
      this._preSearchSnapshot = this._collectState();
      this._hadSnapshotThisSearch = true;
    }

    this.rows.forEach((tr) => {
      if (!this._isDataRow(tr)) return;
      this._restoreCellHtml(tr);
      if (!term) {
        this._setVisible(tr, this._getLevel(tr) === 0);
        return;
      }
      const html = tr.innerText.toLowerCase();
      if (html.includes(term)) {
        matches++;
        this._setVisible(tr, true);
        if (this.options.highlightSearchMatches) {
          Array.from(tr.cells).forEach((td) => {
            const content = td.querySelector(".btt-content");
            if (!content) return;
            const orig =
              content.getAttribute("data-orig-html") ?? content.innerHTML;
            const regex = new RegExp(`(${term})`, "gi");
            content.innerHTML = orig.replace(
              regex,
              `<span style="background:${this.options.searchHighlightColor}">$1</span>`
            );
          });
        }
      } else {
        this._setVisible(tr, false);
      }
    });

    this._ensureToggleButtons();
    this.resetBtn.classList.toggle("d-none", !term);
    this.noResultsDiv.classList.toggle("d-none", matches > 0);
    this._updateAllToggleButtonStates();
    this._updateToggleAllBtnIcon();
  }

  //  Setup toggle-all button
  _setupToggleAllBtn() {
    if (!this.options.showToggleAllButton) return;
    const th = this.table.querySelector("thead tr th");
    if (!th) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn " + (this.options.classes.toggleAllBtn || "");
    btn.title = this.options.i18n.toggleAllBtnTitle;
    btn.innerHTML = `<i class="${this.options.iconClasses.toggleAllOpen}"></i>`;
    th.appendChild(btn);
    this.toggleAllBtn = btn;

    btn.addEventListener("click", () => {
      const anyVisible = this._isAnyChildRowVisible();
      if (anyVisible) {
        this.rows.forEach((tr) => {
          if (this._isDataRow(tr) && this._getLevel(tr) > 0) {
            this._setVisible(tr, false);
          }
        });
      } else {
        this.rows.forEach((tr) => {
          if (this._isDataRow(tr)) this._setVisible(tr, true);
        });
      }
      this._updateAllToggleButtonStates();
      this._updateToggleAllBtnIcon();
      this._persistState();
    });
  }

  //  Setup row toggle click handler
  _setupRowClickHandler() {
    this.table.addEventListener("click", (e) => {
      const btn = e.target.closest(".toggle-row-btn");
      if (!btn) return;
      const tr = btn.closest("tr");
      const isOpen = btn.getAttribute("data-open") === "true";
      this._setBranch(tr, !isOpen);
    });
  }

  //  Collect current state snapshot
  _collectState() {
    return this.rows.map((tr) => ({
      visible: tr.dataset.visible === "true",
    }));
  }

  //  Apply state snapshot
  _applyState(state) {
    if (!Array.isArray(state) || state.length !== this.rows.length) return;
    state.forEach((s, idx) => {
      const tr = this.rows[idx];
      if (this._isDataRow(tr)) {
        this._setVisible(tr, s.visible);
      }
    });
    this._ensureToggleButtons();
    this._updateAllToggleButtonStates();
    this._updateToggleAllBtnIcon();
  }

  //  Save state to localStorage
  _persistState() {
    if (!this.options.rememberState) return;
    try {
      const state = this._collectState();
      localStorage.setItem(this.storageKey, JSON.stringify(state));
    } catch (e) {
      console.warn("BootstrapTreeTable: Could not persist state.", e);
    }
  }

  //  Restore state from localStorage
  _restoreState() {
    if (!this.options.rememberState) return false;
    try {
      const str = localStorage.getItem(this.storageKey);
      if (!str) return false;
      const state = JSON.parse(str);
      this._applyState(state);
      return true;
    } catch (e) {
      console.warn("BootstrapTreeTable: Could not restore state.", e);
      return false;
    }
  }
}
