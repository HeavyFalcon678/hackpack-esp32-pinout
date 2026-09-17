'use strict';
var pinout = document.getElementById("pinout");

/* The diagram is pixel-perfect at its natural size (pin pads line up with
   their rows), so it can't be resized with fluid CSS widths without
   breaking that alignment. Instead, once it no longer fits the window,
   shrink it uniformly with `zoom` - board, tables and text all scale
   together, so the alignment holds at any size. */
var MIN_SCALE = 0.6;
var natural_width = null;

function fit_pinout() {
    if (natural_width === null) {
        pinout.style.zoom = "";
        natural_width = pinout.scrollWidth;
    }
    var available = document.documentElement.clientWidth - 20;
    var scale = Math.min(1, available / natural_width);
    scale = Math.max(scale, MIN_SCALE);
    /* Each row is a 20px cell; snap the scale so that comes out to a whole
       pixel. Otherwise the layout engine rounds every row independently,
       and the rounding drifts the pin-to-row alignment out over the
       length of the board (the SVG scales continuously and doesn't). */
    scale = Math.round(scale * 20) / 20;
    pinout.style.zoom = scale < 1 ? scale : "";
}

/* Deferred to the next frame so centring on load does not force layout. */
var centring = 0;

function center_board() {
    if (centring) window.cancelAnimationFrame(centring);
    centring = window.requestAnimationFrame(function () {
        centring = 0;
        var board = pinout.querySelector(".pico");
        if (!board) return;
        var box = board.getBoundingClientRect();
        var view = pinout.getBoundingClientRect();
        pinout.scrollLeft += (box.left + box.right - view.left - view.right) / 2;
    });
}

var fitting = 0;
function schedule_fit() {
    if (fitting) window.cancelAnimationFrame(fitting);
    fitting = window.requestAnimationFrame(function () {
        fitting = 0;
        fit_pinout();
        center_board();
    });
}

fit_pinout();
center_board();
window.addEventListener("resize", schedule_fit);

/* Keyboard navigation: one tab stop per table, arrow keys move between pins.
   Each row is just a pin-number cell and a name cell. */
Array.prototype.forEach.call(pinout.querySelectorAll("table.labels.left, table.labels.right"), function (table) {
    var grid = Array.prototype.map.call(table.querySelectorAll("tbody tr"), function (row) {
        return Array.prototype.slice.call(row.cells);
    });
    if (!grid.length) return;

    var desired_column = 0;
    var moving_focus = false;

    function locate(cell) {
        for (var row = 0; row < grid.length; row++) {
            var column = grid[row].indexOf(cell);
            if (column !== -1) return {row: row, column: column};
        }
        return null;
    }

    function set_tab_stop(cell) {
        grid.forEach(function (row) {
            row.forEach(function (other) { other.tabIndex = other === cell ? 0 : -1; });
        });
    }

    function focus_cell(row, column) {
        var cell = grid[row][column];
        if (!cell) return;
        set_tab_stop(cell);
        moving_focus = true;
        cell.focus();
        moving_focus = false;
    }

    table.addEventListener("keydown", function (event) {
        var cell = event.target.closest ? event.target.closest("th, td") : null;
        var position = cell && locate(cell);
        if (!position) return;

        switch (event.key) {
            case "ArrowRight": desired_column = 1; focus_cell(position.row, 1); break;
            case "ArrowLeft": desired_column = 0; focus_cell(position.row, 0); break;
            case "ArrowDown": focus_cell(Math.min(grid.length - 1, position.row + 1), desired_column); break;
            case "ArrowUp": focus_cell(Math.max(0, position.row - 1), desired_column); break;
            case "Home": desired_column = 0; focus_cell(0, 0); break;
            case "End": desired_column = 0; focus_cell(grid.length - 1, 0); break;
            default: return;
        }
        event.preventDefault();
    });

    table.addEventListener("focusin", function (event) {
        var cell = event.target.closest ? event.target.closest("th, td") : null;
        if (!cell || moving_focus) return;
        var position = locate(cell);
        if (!position) return;
        desired_column = position.column;
        set_tab_stop(cell);
    });

    grid.forEach(function (row) { row.forEach(function (cell) { cell.tabIndex = -1; }); });
    grid[0][0].tabIndex = 0;
});
