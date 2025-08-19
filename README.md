# BootstrapTreeTable

**BootstrapTreeTable** is a flexible, modern JavaScript plugin for hierarchical tables built with Bootstrap 5.  
It enables collapsible rows, multi-level hierarchy, a global toggle-all button, live search with highlighting, and full styling/customization - perfect for organization structures, product trees, menus, and more.

---

## Features

- **Hierarchical tables** (unlimited levels using `level-x` classes or `data-level="x"`)
- **Collapsible rows**
- **Global Toggle-All button** in the table header (optionally hideable)
- **Search field** (custom position, highlighting, reset, ESC support)
- **No results found** message
- **Restrict search to certain levels** (`searchMaxLevel`)
- **Supports multiple tables/instances** per page
- **Fully themeable & customizable** via utility/your own classes
- **i18n** - all labels and texts can be translated

---

## Requirements

- **Bootstrap 5** (CSS & JS)
- **Font Awesome** (icons, v6+ recommended)
- **BootstrapTreeTable.js**

---

## Usage

**1. Include the libraries**

```html
<link
  href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
  rel="stylesheet"
/>
<link
  href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"
  rel="stylesheet"
/>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="BootstrapTreeTable.js"></script>
```

---

## BootstrapTreeTable Options

### Main Options

| Option                         | Type             | Default       | Description                                                                                              |
| ------------------------------ | ---------------- | ------------- | -------------------------------------------------------------------------------------------------------- |
| `tableSelectorId`              | String           | `"treeTable"` | The ID of your table (without `#`). Required.                                                            |
| `searchContainerId`            | String or `null` | `null`        | The ID of the container for the search field (without `#`). Optional.                                    |
| `showToggleAllButton`          | Boolean          | `true`        | Show the Toggle-All button in the table header.                                                          |
| `highlightSearchMatches`       | Boolean          | `true`        | Highlight matches in search results.                                                                     |
| `searchHighlightColor`         | String           | `"#ffff8b"`   | Background color for highlighting search matches.                                                        |
| `searchMaxLevel`               | Number or `null` | `null`        | Maximum level to search (e.g. `1` for `level-0` and `level-1` only, `null` for all levels).              |
| `toggleColumnIndex`            | Number           | `0`           | Column index where the row toggle button should be placed.                                               |
| `startExpanded`                | Boolean          | `false`       | Expand all rows at start (`true`) or collapse (`false`).                                                 |
| `rememberState`                | Boolean          | `false`       | Persist expanded/collapsed state in `localStorage`.                                                      |
| `restorePreSearchStateOnClear` | Boolean          | `false`       | If `true`, restores the state before search when search is cleared. If `false`, resets to default state. |

### Styling Classes (`classes`)

| Key                  | Default value                                                            | Description                                                                        |
| -------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `searchInput`        | `"pe-5"`                                                                 | Extra classes for search `<input>` (always includes `form-control`).               |
| `searchWrapper`      | `"mb-3 position-relative"`                                               | Classes for the `<div>` wrapping the search field.                                 |
| `searchWrapperStyle` | `"max-width:400px;"`                                                     | Additional CSS style for the search wrapper (string).                              |
| `resetBtn`           | `"btn-sm position-absolute top-50 end-0 translate-middle-y me-2 d-none"` | Extra classes for the reset button (always includes `btn`).                        |
| `noResults`          | `"alert alert-warning small d-none mt-2"`                                | Extra classes for the "no results" message (always includes `table-search-empty`). |
| `toggleRowBtn`       | `"btn-primary btn-sm"`                                                   | Extra classes for row toggle buttons (always includes `btn toggle-row-btn`).       |
| `toggleAllBtn`       | `"btn-outline-secondary btn-sm"`                                         | Extra classes for the Toggle-All button (always includes `btn`).                   |

---

### Internationalization (`i18n`)

| Key                 | Default value                 | Description                           |
| ------------------- | ----------------------------- | ------------------------------------- |
| `searchPlaceholder` | `"In allen Ebenen suchen..."` | Placeholder text in the search field. |
| `searchResetAria`   | `"Zurücksetzen"`              | ARIA label for the reset button.      |
| `toggleAllBtnTitle` | `"Alle ein-/ausklappen"`      | Tooltip for the Toggle-All button.    |
| `noResults`         | `"Keine Ergebnisse gefunden"` | Message when no results are found.    |

---

### Icon Classes (`iconClasses`)

| Key              | Default value                       | Description                                        |
| ---------------- | ----------------------------------- | -------------------------------------------------- |
| `toggleRowOpen`  | `"fa-solid fa-chevron-right fa-fw"` | Icon for row toggle button when open               |
| `toggleRowClose` | `"fa-solid fa-chevron-up fa-fw"`    | Icon for row toggle button when closed             |
| `toggleAllOpen`  | `"fa-solid fa-plus fa-fw"`          | Icon for Toggle-All button when table is collapsed |
| `toggleAllClose` | `"fa-solid fa-minus fa-fw"`         | Icon for Toggle-All button when table is expanded  |
| `reset`          | `"fa-solid fa-xmark"`               | Icon for the reset/clear search button             |

---

### Usage Example

```js
BootstrapTreeTable.init({
  tableSelectorId: "treeTable",
  searchContainerId: "searchfield",
  showToggleAllButton: true,
  searchMaxLevel: 2,
  highlightSearchMatches: true,
  searchHighlightColor: "#ffe066",
  startExpanded: false,
  rememberState: true,
  restorePreSearchStateOnClear: false,

  classes: {
    searchInput: "form-control-lg custom-search",
    searchWrapper: "searchbox-wrap",
    searchWrapperStyle: "max-width:600px;background:#f8f9fa;",
    resetBtn: "btn-outline-danger",
    noResults: "alert-info my-3",
    toggleRowBtn: "btn-outline-dark btn-sm",
    toggleAllBtn: "btn-secondary btn-sm",
  },

  iconClasses: {
    toggleRowOpen: "fa-solid fa-chevron-right fa-fw",
    toggleRowClose: "fa-solid fa-chevron-up fa-fw",
    toggleAllOpen: "fa-solid fa-plus fa-fw",
    toggleAllClose: "fa-solid fa-minus fa-fw",
    reset: "fa-solid fa-xmark",
  },

  i18n: {
    searchPlaceholder: "Search table ...",
    searchResetAria: "Clear",
    toggleAllBtnTitle: "Expand/collapse all",
    noResults: "No results found",
  },
});
```

---
