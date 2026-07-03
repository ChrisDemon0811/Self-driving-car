from flask import Flask, jsonify, render_template, request

from algorithms.astar import astar
from algorithms.bfs import bfs
from algorithms.grid_utils import TERRAIN_COSTS, get_cell_type, is_walkable
from algorithms.ucs import ucs

app = Flask(__name__)

ALGORITHMS = {
    "bfs": bfs,
    "ucs": ucs,
    "astar": astar,
}

COMPARISON_ORDER = [
    ("bfs", "BFS"),
    ("ucs", "UCS"),
    ("astar", "A*"),
]


@app.route("/")
def index():
    return render_template("index.html")


def _normalize_grid(raw_grid):
    if not isinstance(raw_grid, list) or not raw_grid:
        raise ValueError("Grid không hợp lệ: cần ma trận 2D không rỗng.")

    normalized = []
    expected_cols = None

    for row in raw_grid:
        if not isinstance(row, list) or not row:
            raise ValueError("Grid không hợp lệ: mỗi hàng phải là list không rỗng.")

        if expected_cols is None:
            expected_cols = len(row)
        elif len(row) != expected_cols:
            raise ValueError("Grid không hợp lệ: các hàng phải có cùng số cột.")

        normalized_row = []
        for cell in row:
            cell_type = get_cell_type(cell)
            if cell_type not in TERRAIN_COSTS:
                cell_type = "normal"

            normalized_row.append({
                "type": cell_type,
                "cost": TERRAIN_COSTS[cell_type],
            })
        normalized.append(normalized_row)

    return normalized


def _parse_point(name, value, rows, cols):
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        raise ValueError(f"{name} không hợp lệ: cần dạng [row, col].")

    row, col = value
    if not isinstance(row, (int, float)) or not isinstance(col, (int, float)):
        raise ValueError(f"{name} không hợp lệ: tọa độ phải là số.")

    row = int(row)
    col = int(col)

    if row < 0 or row >= rows or col < 0 or col >= cols:
        raise ValueError(f"{name} ngoài phạm vi grid.")

    return row, col


def _parse_solve_payload(data):
    grid = _normalize_grid(data.get("grid"))
    rows = len(grid)
    cols = len(grid[0])
    start = _parse_point("Start", data.get("start"), rows, cols)
    end = _parse_point("Goal", data.get("end"), rows, cols)

    if not is_walkable(grid, start[0], start[1]) or not is_walkable(grid, end[0], end[1]):
        raise ValueError("Start/Goal đang nằm trên vật cản.")

    return grid, start, end


@app.route("/solve", methods=["POST"])
def solve():
    data = request.get_json(silent=True) or {}
    algorithm_name = str(data.get("algorithm", "")).strip().lower()

    if algorithm_name not in ALGORITHMS:
        return jsonify({"message": "Thuật toán không hợp lệ. Chọn: bfs, ucs hoặc astar."}), 400

    try:
        grid, start, end = _parse_solve_payload(data)
    except ValueError as error:
        return jsonify({"message": str(error)}), 400

    result = ALGORITHMS[algorithm_name](grid=grid, start=start, end=end)
    return jsonify(result), 200


@app.route("/compare", methods=["POST"])
def compare_algorithms():
    data = request.get_json(silent=True) or {}

    try:
        grid, start, end = _parse_solve_payload(data)
    except ValueError as error:
        return jsonify({"message": str(error)}), 400

    results = []
    for algorithm_key, algorithm_label in COMPARISON_ORDER:
        result = ALGORITHMS[algorithm_key](grid=grid, start=start, end=end)
        result["algorithm"] = algorithm_label
        result["algorithm_key"] = algorithm_key
        results.append(result)

    return jsonify({"results": results}), 200


if __name__ == "__main__":
    app.run(debug=True)
