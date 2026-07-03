import heapq
import time

from algorithms.grid_utils import build_result, get_cell_cost, is_walkable


DIRECTIONS = ((1, 0), (-1, 0), (0, 1), (0, -1))
MIN_TERRAIN_COST = 1


def _manhattan(a, b):
    return abs(a[0] - b[0]) + abs(a[1] - b[1])


def astar(grid, start, end):
    start_time = time.perf_counter()

    rows = len(grid)
    cols = len(grid[0]) if rows else 0

    if rows == 0 or cols == 0:
        return build_result(grid, [], [], 0.0, "Grid không hợp lệ")

    start_row, start_col = start
    end_row, end_col = end

    if not is_walkable(grid, start_row, start_col) or not is_walkable(grid, end_row, end_col):
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 3)
        return build_result(grid, [], [], elapsed_ms, "Start hoặc Goal không đi được")

    g_score = {start: 0}
    parent = {}
    visited = set()
    visited_nodes = []

    min_heap = [(_manhattan(start, end) * MIN_TERRAIN_COST, 0, start)]

    while min_heap:
        _, current_g, current = heapq.heappop(min_heap)

        if current in visited:
            continue

        visited.add(current)
        visited_nodes.append(current)

        if current == end:
            break

        current_row, current_col = current
        for dr, dc in DIRECTIONS:
            nr, nc = current_row + dr, current_col + dc
            neighbor = (nr, nc)

            if not is_walkable(grid, nr, nc) or neighbor in visited:
                continue

            tentative_g = current_g + get_cell_cost(grid[nr][nc])
            if tentative_g < g_score.get(neighbor, float("inf")):
                g_score[neighbor] = tentative_g
                parent[neighbor] = current
                f_score = tentative_g + (_manhattan(neighbor, end) * MIN_TERRAIN_COST)
                heapq.heappush(min_heap, (f_score, tentative_g, neighbor))

    path = []
    if end in visited:
        node = end
        while node != start:
            path.append(node)
            node = parent[node]
        path.append(start)
        path.reverse()

    execution_time = round((time.perf_counter() - start_time) * 1000, 3)

    return build_result(grid, path, visited_nodes, execution_time)
