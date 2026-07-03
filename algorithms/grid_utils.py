TERRAIN_COSTS = {
    "normal": 1,
    "rough": 3,
    "traffic": 5,
    "danger": 8,
    "obstacle": None,
}


def in_bounds(row, col, rows, cols):
    return 0 <= row < rows and 0 <= col < cols


def get_cell_type(cell):
    if isinstance(cell, dict):
        return str(cell.get("type", "normal")).lower()

    if isinstance(cell, str):
        value = cell.strip().lower()
        if value in TERRAIN_COSTS:
            return value
        return "obstacle" if value in {"1", "true", "t", "x", "#"} else "normal"

    if isinstance(cell, (int, float, bool)):
        return "obstacle" if bool(cell) else "normal"

    return "normal"


def is_walkable(grid, row, col):
    rows = len(grid)
    cols = len(grid[0]) if rows else 0
    if not in_bounds(row, col, rows, cols):
        return False

    return get_cell_type(grid[row][col]) != "obstacle"


def get_cell_cost(cell):
    cell_type = get_cell_type(cell)
    if cell_type == "obstacle":
        return float("inf")

    if isinstance(cell, dict):
        try:
            return int(cell.get("cost", TERRAIN_COSTS.get(cell_type, 1)))
        except (TypeError, ValueError):
            return TERRAIN_COSTS.get(cell_type, 1)

    return TERRAIN_COSTS.get(cell_type, 1)


def get_path_cost(grid, path):
    if not path:
        return 0

    # Cost is counted when entering each next cell; the start cell itself is free.
    return sum(get_cell_cost(grid[row][col]) for row, col in path[1:])


def to_output_path(path):
    return [[row, col] for row, col in path]


def build_result(grid, path, visited_order, elapsed_ms, message=None):
    success = bool(path)
    total_cost = get_path_cost(grid, path)
    path_length = max(len(path) - 1, 0)
    output_path = to_output_path(path)
    output_visited = to_output_path(visited_order)

    return {
        "success": success,
        "path": output_path,
        "visited_order": output_visited,
        "total_cost": total_cost,
        "path_length": path_length,
        "visited_count": len(visited_order),
        "elapsed_ms": elapsed_ms,
        "message": message or ("Success" if success else "Không tìm thấy đường"),
        # Backward-compatible aliases for the current frontend animation code.
        "visited_nodes": output_visited,
        "execution_time": elapsed_ms,
    }
