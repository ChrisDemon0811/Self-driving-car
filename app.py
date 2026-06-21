from flask import Flask, jsonify, render_template, request

from algorithms.astar import astar
from algorithms.bfs import bfs
from algorithms.dfs import dfs

app = Flask(__name__)

ALGORITHMS = {
    "bfs": bfs,
    "dfs": dfs,
    "astar": astar,
}


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
            if isinstance(cell, str):
                value = cell.strip().lower()
                normalized_row.append(1 if value in {"1", "true", "t", "x", "#", "obstacle"} else 0)
            elif isinstance(cell, (int, float, bool)):
                normalized_row.append(1 if bool(cell) else 0)
            else:
                normalized_row.append(1 if cell else 0)
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


@app.route("/solve", methods=["POST"])
def solve():
    data = request.get_json(silent=True) or {}
    algorithm_name = str(data.get("algorithm", "")).strip().lower()

    if algorithm_name not in ALGORITHMS:
        return jsonify({"message": "Thuật toán không hợp lệ. Chọn: bfs, dfs hoặc astar."}), 400

    try:
        grid = _normalize_grid(data.get("grid"))
        rows = len(grid)
        cols = len(grid[0])
        start = _parse_point("Start", data.get("start"), rows, cols)
        end = _parse_point("End", data.get("end"), rows, cols)
    except ValueError as error:
        return jsonify({"message": str(error)}), 400

    if grid[start[0]][start[1]] == 1 or grid[end[0]][end[1]] == 1:
        return jsonify({"message": "Start/End đang nằm trên vật cản."}), 400

    solver = ALGORITHMS[algorithm_name]
    result = solver(grid=grid, start=start, end=end)

    result["message"] = "Success" if result["path"] else "Path not found"
    return jsonify(result), 200


if __name__ == "__main__":
    app.run(debug=True)
