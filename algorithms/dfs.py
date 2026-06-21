import time


DIRECTIONS = ((1, 0), (-1, 0), (0, 1), (0, -1))


def _in_bounds(row, col, rows, cols):
    return 0 <= row < rows and 0 <= col < cols


def _is_valid_cell(grid, row, col):
    return _in_bounds(row, col, len(grid), len(grid[0])) and grid[row][col] == 0


def _to_output_path(path):
    return [[row, col] for row, col in path]


def dfs(grid, start, end):
    start_time = time.perf_counter()

    rows = len(grid)
    cols = len(grid[0]) if rows else 0

    if rows == 0 or cols == 0:
        return {
            "visited_nodes": [],
            "path": [],
            "execution_time": 0.0,
            "path_length": 0,
            "visited_count": 0,
        }

    start_row, start_col = start
    end_row, end_col = end

    if not _is_valid_cell(grid, start_row, start_col) or not _is_valid_cell(grid, end_row, end_col):
        return {
            "visited_nodes": [],
            "path": [],
            "execution_time": round((time.perf_counter() - start_time) * 1000, 3),
            "path_length": 0,
            "visited_count": 0,
        }

    stack = [start]
    visited = set()
    parent = {}
    visited_nodes = []

    while stack:
        current = stack.pop()

        if current in visited:
            continue

        visited.add(current)
        visited_nodes.append(current)

        if current == end:
            break

        current_row, current_col = current
        for dr, dc in reversed(DIRECTIONS):
            nr, nc = current_row + dr, current_col + dc
            neighbor = (nr, nc)

            if _is_valid_cell(grid, nr, nc) and neighbor not in visited:
                if neighbor not in parent:
                    parent[neighbor] = current
                stack.append(neighbor)

    path = []
    if end in visited:
        node = end
        while node != start:
            path.append(node)
            node = parent[node]
        path.append(start)
        path.reverse()

    execution_time = round((time.perf_counter() - start_time) * 1000, 3)

    return {
        "visited_nodes": _to_output_path(visited_nodes),
        "path": _to_output_path(path),
        "execution_time": execution_time,
        "path_length": max(len(path) - 1, 0),
        "visited_count": len(visited_nodes),
    }
