const GRID_SIZE = 20;
const CELL_TYPES = {
  normal: { cost: 1, label: "Đường thường" },
  rough: { cost: 3, label: "Đường xấu" },
  traffic: { cost: 5, label: "Kẹt xe" },
  danger: { cost: 8, label: "Vùng nguy hiểm" },
  obstacle: { cost: null, label: "Vật cản" },
};
const TERRAIN_CLASSES = Object.keys(CELL_TYPES);
const VISUAL_CLASSES = ["visited-current", "visited-done", "path"];

const PRESET_MAPS = {
  demo1: (() => {
    const grid = createPresetGrid("normal");

    for (let col = 2; col <= 17; col += 1) {
      setPresetCell(grid, 10, col, col % 3 === 0 ? "danger" : "traffic");
    }

    return {
      name: "Demo 1: BFS ngắn hơn nhưng chi phí cao",
      description: "Đường thẳng ở giữa rất ngắn nhưng đi qua nhiều ô kẹt xe/vùng nguy hiểm.",
      grid,
      start: [10, 1],
      end: [10, 18],
      recommendedAlgorithm: "bfs",
      demoGoal: "Chạy BFS để thấy đường ít bước nhưng cost cao, sau đó nhìn bảng so sánh UCS/A* chọn đường vòng rẻ hơn.",
    };
  })(),
  demo2: (() => {
    const grid = createPresetGrid("obstacle");

    for (let col = 1; col <= 18; col += 1) {
      setPresetCell(grid, 10, col, "normal");
    }

    [2, 4, 6, 8, 12, 14, 16].forEach((col) => {
      for (let row = 2; row <= 9; row += 1) {
        setPresetCell(grid, row, col, "normal");
      }
    });

    [3, 5, 7, 11, 13, 15, 17].forEach((col) => {
      for (let row = 11; row <= 17; row += 1) {
        setPresetCell(grid, row, col, "normal");
      }
    });

    for (let row = 7; row <= 13; row += 1) {
      setPresetCell(grid, row, 9, "normal");
    }

    for (let col = 9; col <= 12; col += 1) {
      setPresetCell(grid, 7, col, "normal");
      setPresetCell(grid, 13, col, "normal");
    }

    return {
      name: "Demo 2: A* duyệt ít node hơn UCS",
      description: "Một hành lang chính có nhiều nhánh cụt như mê cung nhỏ để UCS phải mở rộng nhiều node hơn.",
      grid,
      start: [10, 1],
      end: [10, 18],
      recommendedAlgorithm: "astar",
      demoGoal: "Chạy A* và xem bảng so sánh: A* thường đến goal với số node duyệt ít hơn UCS nhờ Manhattan heuristic.",
    };
  })(),
  demo3: (() => {
    const grid = createPresetGrid("normal");

    [9, 11].forEach((row) => {
      for (let col = 2; col <= 17; col += 1) {
        if (![5, 14].includes(col)) {
          setPresetCell(grid, row, col, "obstacle");
        }
      }
    });

    for (let col = 5; col <= 14; col += 1) {
      setPresetCell(grid, 8, col, "rough");
      setPresetCell(grid, 12, col, "rough");
    }

    for (let col = 1; col <= 18; col += 1) {
      setPresetCell(grid, 10, col, "normal");
    }

    return {
      name: "Demo 3: Vật cản động và tính lại đường",
      description: "Đường chính ban đầu rất rõ, hai bên có lối vòng để xe có thể replan khi đường bị chặn.",
      grid,
      start: [10, 1],
      end: [10, 18],
      recommendedAlgorithm: "astar",
      demoGoal: "Cho xe chạy rồi bấm thêm vật cản động để thấy xe dừng, tính lại đường từ vị trí hiện tại và đi tiếp.",
    };
  })(),
};

const gridEl = document.getElementById("grid");
const speedSlider = document.getElementById("speedSlider");
const speedValueEl = document.getElementById("speedValue");

const setStartBtn = document.getElementById("setStartBtn");
const setEndBtn = document.getElementById("setEndBtn");
const drawObstacleBtn = document.getElementById("drawObstacleBtn");
const randomMapBtn = document.getElementById("randomMapBtn");
const clearBoardBtn = document.getElementById("clearBoardBtn");
const startSimBtn = document.getElementById("startSimBtn");
const pauseSimBtn = document.getElementById("pauseSimBtn");
const resumeSimBtn = document.getElementById("resumeSimBtn");
const resetSimBtn = document.getElementById("resetSimBtn");
const dynamicObstacleBtn = document.getElementById("dynamicObstacleBtn");
const algorithmSelect = document.getElementById("algorithm");
const terrainTypeSelect = document.getElementById("terrainType");
const presetMapSelect = document.getElementById("presetMapSelect");
const loadPresetBtn = document.getElementById("loadPresetBtn");
const presetDescriptionEl = document.getElementById("presetDescription");

const statTimeEl = document.getElementById("statTime");
const statVisitedEl = document.getElementById("statVisited");
const statPathLengthEl = document.getElementById("statPathLength");
const statTotalCostEl = document.getElementById("statTotalCost");
const simStatusEl = document.getElementById("simStatus");
const comparisonBodyEl = document.getElementById("comparisonBody");
const explanationTextEl = document.getElementById("explanationText");

const editingControls = [
  setStartBtn,
  setEndBtn,
  drawObstacleBtn,
  randomMapBtn,
  clearBoardBtn,
  algorithmSelect,
  terrainTypeSelect,
];

let currentTool = "terrain";
let startCell = null;
let endCell = null;
let isMouseDown = false;
let isAnimating = false;
let isCarMoving = false;
let isReplanning = false;
let isPaused = false;
let carEl = null;
let carState = null;
let currentPath = [];
let currentPathIndex = 0;
let movementToken = 0;
let lastSingleExplanation = "";

const cells = [];

function createPresetGrid(fillType = "normal") {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ type: fillType }))
  );
}

function setPresetCell(grid, row, col, type) {
  if (
    row < 0 ||
    row >= GRID_SIZE ||
    col < 0 ||
    col >= GRID_SIZE ||
    !CELL_TYPES[type]
  ) {
    return;
  }

  grid[row][col] = { type };
}

function getPresetCellType(cellData) {
  const type = typeof cellData === "string" ? cellData : cellData?.type;
  return CELL_TYPES[type] ? type : "normal";
}

function formatAlgorithmName(algorithmKey) {
  const names = {
    bfs: "BFS",
    ucs: "UCS",
    astar: "A*",
  };

  return names[algorithmKey] ?? algorithmKey;
}

function createGrid() {
  gridEl.innerHTML = "";

  for (let row = 0; row < GRID_SIZE; row += 1) {
    cells[row] = [];

    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell normal";
      cell.dataset.row = row;
      cell.dataset.col = col;
      cell.dataset.type = "normal";
      cell.dataset.cost = "1";

      cell.addEventListener("mousedown", () => {
        if (isAnimating) return;
        isMouseDown = true;
        paintCell(cell);
      });

      cell.addEventListener("mouseenter", () => {
        if (isAnimating) return;
        if (isMouseDown && currentTool === "terrain") {
          paintCell(cell);
        }
      });

      cells[row][col] = cell;
      gridEl.appendChild(cell);
    }
  }
}

function getCell(row, col) {
  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return null;
  return cells[row][col];
}

function setStatus(message) {
  simStatusEl.textContent = message;
}

function setCellTerrain(cell, type, options = {}) {
  if (!cell || !CELL_TYPES[type]) return;

  cell.classList.remove(...TERRAIN_CLASSES, "dynamic-obstacle");
  cell.classList.add(type);
  if (options.dynamic) {
    cell.classList.add("dynamic-obstacle");
  }
  cell.dataset.type = type;
  cell.dataset.cost = CELL_TYPES[type].cost ?? "";
}

function isObstacleCell(cell) {
  return cell?.dataset.type === "obstacle";
}

function ensureCarElement() {
  if (carEl && carEl.isConnected) return carEl;

  carEl = document.createElement("div");
  carEl.className = "car";
  carEl.hidden = true;
  gridEl.appendChild(carEl);
  return carEl;
}

function hideCar() {
  if (carEl) {
    carEl.hidden = true;
  }
  carState = null;
}

function getCellCenterInGrid(cell) {
  const cellRect = cell.getBoundingClientRect();
  const gridRect = gridEl.getBoundingClientRect();

  return {
    x: cellRect.left - gridRect.left + cellRect.width / 2,
    y: cellRect.top - gridRect.top + cellRect.height / 2,
    width: cellRect.width,
    height: cellRect.height,
  };
}

function placeCarAtCell(cell, angleDeg = 0) {
  if (!cell) return;

  const car = ensureCarElement();
  const center = getCellCenterInGrid(cell);

  car.style.width = `${Math.max(10, center.width * 0.72)}px`;
  car.style.height = `${Math.max(8, center.height * 0.46)}px`;
  car.style.left = `${center.x}px`;
  car.style.top = `${center.y}px`;
  car.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;
  car.hidden = false;

  carState = {
    row: Number(cell.dataset.row),
    col: Number(cell.dataset.col),
    angle: angleDeg,
  };
}

function rotateCar(angleDeg) {
  if (!carState) return;
  const cell = getCell(carState.row, carState.col);
  if (!cell) return;
  placeCarAtCell(cell, angleDeg);
}

function getCurrentCarCell() {
  if (!carState) return null;
  return getCell(carState.row, carState.col);
}

function getCurrentCarCoordinate() {
  const cell = getCurrentCarCell();
  if (!cell) return null;
  return [Number(cell.dataset.row), Number(cell.dataset.col)];
}

function clearCellRole(cell) {
  if (!cell) return;
  if (cell === startCell) startCell = null;
  if (cell === endCell) endCell = null;
  cell.classList.remove("start", "end");
}

function clearCellVisuals() {
  const allCells = gridEl.querySelectorAll(".cell");
  allCells.forEach((cell) => {
    cell.classList.remove(...VISUAL_CLASSES);
  });
}

function clearVisualization() {
  clearCellVisuals();
  hideCar();
}

function resetMovementState() {
  currentPath = [];
  currentPathIndex = 0;
  isCarMoving = false;
  isReplanning = false;
  isPaused = false;
  movementToken += 1;
}

function pauseAnimation() {
  if (!isAnimating && !isCarMoving) return;
  isPaused = true;
  setStatus("Tạm dừng");
}

function resumeAnimation() {
  if (!isPaused) return;
  isPaused = false;
  setStatus(isReplanning ? "Đang tính lại đường" : "Đang di chuyển");
}

function resetAnimation() {
  resetMovementState();
  isAnimating = false;
  clearCellVisuals();
  hideCar();

  if (startCell) {
    placeCarAtCell(startCell, 0);
  }

  resetStats();
  setControlsDisabled(false);
  resetExplanation();
  setStatus("Chưa chạy");
}

function paintCell(cell) {
  if (!cell || isAnimating) return;

  if (currentTool === "start") {
    if (startCell) startCell.classList.remove("start");
    clearCellRole(cell);
    if (isObstacleCell(cell)) setCellTerrain(cell, "normal");
    cell.classList.add("start");
    startCell = cell;
    placeCarAtCell(startCell, 0);
    return;
  }

  if (currentTool === "end") {
    if (endCell) endCell.classList.remove("end");
    clearCellRole(cell);
    if (isObstacleCell(cell)) setCellTerrain(cell, "normal");
    cell.classList.add("end");
    endCell = cell;
    return;
  }

  if (currentTool === "terrain") {
    if (cell === startCell || cell === endCell) return;
    setCellTerrain(cell, terrainTypeSelect.value);
    cell.classList.remove(...VISUAL_CLASSES);
  }
}

function setActiveTool(tool) {
  if (isAnimating) return;

  currentTool = tool;
  [setStartBtn, setEndBtn, drawObstacleBtn].forEach((btn) => {
    btn.classList.remove("active-tool");
  });

  if (tool === "start") setStartBtn.classList.add("active-tool");
  if (tool === "end") setEndBtn.classList.add("active-tool");
  if (tool === "terrain") drawObstacleBtn.classList.add("active-tool");
}

function resetStats() {
  statTimeEl.textContent = "-";
  statVisitedEl.textContent = "-";
  statPathLengthEl.textContent = "-";
  statTotalCostEl.textContent = "-";
}

function updateStats(result) {
  statTimeEl.textContent = `${result.elapsed_ms ?? result.execution_time ?? 0} ms`;
  statVisitedEl.textContent = result.visited_count ?? 0;
  statPathLengthEl.textContent = result.path_length ?? 0;
  statTotalCostEl.textContent = result.total_cost ?? 0;
}

function resetComparisonTable() {
  comparisonBodyEl.innerHTML = '<tr><td colspan="6">-</td></tr>';
}

function showComparisonError(message) {
  comparisonBodyEl.innerHTML = `<tr><td colspan="6">${message}</td></tr>`;
}

function renderComparisonTable(results) {
  if (!Array.isArray(results) || results.length === 0) {
    resetComparisonTable();
    return;
  }

  comparisonBodyEl.innerHTML = results.map((result) => {
    const success = Boolean(result.success);
    const statusClass = success ? "status-success" : "status-failed";
    const statusText = success ? "Tìm thấy" : "Không tìm thấy đường";

    return `
      <tr>
        <td>${result.algorithm ?? "-"}</td>
        <td>${success ? result.path_length : "-"}</td>
        <td>${success ? result.total_cost : "-"}</td>
        <td>${result.visited_count ?? 0}</td>
        <td>${result.elapsed_ms ?? 0} ms</td>
        <td class="${statusClass}">${statusText}</td>
      </tr>
    `;
  }).join("");
}

function setExplanation(text) {
  explanationTextEl.textContent = text || "Chưa có kết quả để giải thích.";
}

function resetExplanation() {
  lastSingleExplanation = "";
  setExplanation("Chưa có kết quả để giải thích.");
}

function getResultElapsed(result) {
  return result?.elapsed_ms ?? result?.execution_time ?? 0;
}

function getAlgorithmKey(resultOrKey) {
  const rawValue = typeof resultOrKey === "string"
    ? resultOrKey
    : resultOrKey?.algorithm_key ?? resultOrKey?.algorithm ?? "";
  const normalized = String(rawValue).trim().toLowerCase();

  if (normalized === "a*" || normalized === "astar" || normalized === "a-star") return "astar";
  if (normalized === "ucs") return "ucs";
  if (normalized === "bfs") return "bfs";
  return normalized;
}

function getAlgorithmDisplayName(resultOrKey) {
  return formatAlgorithmName(getAlgorithmKey(resultOrKey));
}

function getSuccessResults(results) {
  return Array.isArray(results) ? results.filter((result) => result.success) : [];
}

function findBestResults(results, metricName) {
  const successfulResults = getSuccessResults(results);
  if (successfulResults.length === 0) {
    return { value: null, winners: [] };
  }

  const value = Math.min(...successfulResults.map((result) => Number(result[metricName] ?? Infinity)));
  return {
    value,
    winners: successfulResults.filter((result) => Number(result[metricName] ?? Infinity) === value),
  };
}

function formatWinnerNames(results) {
  return results.map((result) => getAlgorithmDisplayName(result)).join(" và ");
}

function findAlgorithmResult(results, algorithmKey) {
  return Array.isArray(results)
    ? results.find((result) => getAlgorithmKey(result) === algorithmKey)
    : null;
}

function generateSingleExplanation(result, algorithmKey) {
  const algorithmName = getAlgorithmDisplayName(algorithmKey);

  if (!result?.success) {
    return `${algorithmName} không tìm thấy đường đi từ Start đến Goal. Nguyên nhân thường là vật cản đã chặn toàn bộ lối đi hoặc Start/Goal bị đặt ở vị trí khó kết nối. Hãy thử đổi map, xóa bớt obstacle hoặc chọn lại Start/Goal rồi chạy lại mô phỏng.`;
  }

  const visitedCount = result.visited_count ?? 0;
  const pathLength = result.path_length ?? 0;
  const totalCost = result.total_cost ?? 0;
  const elapsedMs = getResultElapsed(result);

  if (getAlgorithmKey(algorithmKey) === "bfs") {
    return `BFS đã tìm thấy đường đi với ${pathLength} bước, tổng chi phí ${totalCost}, duyệt ${visitedCount} node trong ${elapsedMs} ms. BFS tìm đường theo số bước và coi các ô đi được gần như có chi phí như nhau trong quá trình tìm kiếm. Vì vậy BFS phù hợp khi mọi ô có chi phí bằng nhau, nhưng trên bản đồ có trọng số thì đường ít bước chưa chắc là đường có tổng chi phí thấp nhất.`;
  }

  if (getAlgorithmKey(algorithmKey) === "ucs") {
    return `UCS đã tìm thấy đường đi với tổng chi phí ${totalCost}, độ dài ${pathLength} bước, duyệt ${visitedCount} node trong ${elapsedMs} ms. UCS ưu tiên mở rộng đường có tổng chi phí thấp nhất nên phù hợp với bản đồ có trọng số như đường xấu, kẹt xe hoặc vùng nguy hiểm. UCS có thể chọn đường dài hơn BFS nếu đường đó an toàn hơn và có cost thấp hơn.`;
  }

  if (getAlgorithmKey(algorithmKey) === "astar") {
    return `A* đã tìm thấy đường đi với tổng chi phí ${totalCost}, độ dài ${pathLength} bước, duyệt ${visitedCount} node trong ${elapsedMs} ms. A* dùng công thức f(n) = g(n) + h(n), trong đó g(n) là chi phí đã đi và h(n) là heuristic ước lượng khoảng cách đến Goal. Với grid 4 hướng, heuristic đang dùng là Manhattan Distance, nên A* thường tìm được đường tốt như UCS nhưng duyệt ít node hơn nhờ tìm kiếm có định hướng.`;
  }

  return `${algorithmName} đã tìm thấy đường đi với ${pathLength} bước, tổng chi phí ${totalCost}, duyệt ${visitedCount} node trong ${elapsedMs} ms.`;
}

function generateComparisonExplanation(results) {
  const successfulResults = getSuccessResults(results);
  const failedResults = Array.isArray(results) ? results.filter((result) => !result.success) : [];

  if (successfulResults.length === 0) {
    return "So sánh thuật toán: Không thuật toán nào tìm thấy đường từ Start đến Goal. Có thể vật cản đang chặn toàn bộ lối đi, vì vậy hãy thử đổi map, xóa bớt obstacle hoặc chọn Start/Goal khác.";
  }

  const bestCost = findBestResults(results, "total_cost");
  const bestLength = findBestResults(results, "path_length");
  const bestVisited = findBestResults(results, "visited_count");
  const lines = [
    `So sánh thuật toán: ${formatWinnerNames(bestCost.winners)} có tổng chi phí thấp nhất là ${bestCost.value}. ${formatWinnerNames(bestLength.winners)} có đường đi ngắn nhất với ${bestLength.value} bước. ${formatWinnerNames(bestVisited.winners)} duyệt ít node nhất với ${bestVisited.value} node.`,
  ];

  const bfsResult = findAlgorithmResult(results, "bfs");
  const ucsResult = findAlgorithmResult(results, "ucs");
  const astarResult = findAlgorithmResult(results, "astar");
  const weightedResults = [ucsResult, astarResult].filter((result) => result?.success);
  const bestWeightedCost = weightedResults.length > 0
    ? Math.min(...weightedResults.map((result) => Number(result.total_cost ?? Infinity)))
    : null;
  const bestWeightedLength = weightedResults.length > 0
    ? Math.min(...weightedResults.map((result) => Number(result.path_length ?? Infinity)))
    : null;

  if (
    bfsResult?.success &&
    bestWeightedCost !== null &&
    Number(bfsResult.total_cost) > bestWeightedCost &&
    Number(bfsResult.path_length) <= bestWeightedLength
  ) {
    lines.push("Nhận xét: BFS chọn đường ngắn theo số bước, nhưng tổng chi phí cao hơn vì có thể đi qua nhiều ô kẹt xe hoặc vùng nguy hiểm. Với xe tự lái trên map có trọng số, UCS/A* phù hợp hơn vì ưu tiên tổng chi phí thấp.");
  }

  if (
    ucsResult?.success &&
    astarResult?.success &&
    Number(astarResult.total_cost) === Number(ucsResult.total_cost) &&
    Number(astarResult.visited_count) < Number(ucsResult.visited_count)
  ) {
    lines.push("Nhận xét: A* tìm được đường có chi phí tương đương UCS nhưng duyệt ít node hơn. Điều này cho thấy heuristic Manhattan giúp A* tìm kiếm có định hướng hơn.");
  }

  if (failedResults.length > 0) {
    lines.push(`${formatWinnerNames(failedResults)} không tìm thấy đường trong lần chạy này, nhưng giao diện vẫn giữ kết quả hợp lệ để dễ so sánh.`);
  }

  return lines.join("\n\n");
}

function clearBoard() {
  if (isAnimating) return;

  const allCells = gridEl.querySelectorAll(".cell");
  allCells.forEach((cell) => {
    cell.classList.remove("start", "end", ...VISUAL_CLASSES, "dynamic-obstacle");
    setCellTerrain(cell, "normal");
  });

  startCell = null;
  endCell = null;
  hideCar();
  resetMovementState();
  resetStats();
  resetComparisonTable();
  resetExplanation();
  setStatus("Sẵn sàng");
}

function resetForNewMap() {
  isAnimating = false;
  isMouseDown = false;
  resetMovementState();
  clearCellVisuals();
  hideCar();
  resetStats();
  resetComparisonTable();
  setControlsDisabled(false);
  resetExplanation();
}

function applyGridToUI(grid) {
  if (!Array.isArray(grid) || grid.length !== GRID_SIZE) {
    throw new Error("Map mẫu không đúng số dòng 20x20.");
  }

  startCell = null;
  endCell = null;

  for (let row = 0; row < GRID_SIZE; row += 1) {
    if (!Array.isArray(grid[row]) || grid[row].length !== GRID_SIZE) {
      throw new Error("Map mẫu không đúng số cột 20x20.");
    }

    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cell = getCell(row, col);
      const type = getPresetCellType(grid[row][col]);

      cell.classList.remove("start", "end", ...VISUAL_CLASSES, "dynamic-obstacle");
      setCellTerrain(cell, type);
    }
  }
}

function setStartFromCoordinate(row, col) {
  const cell = getCell(Number(row), Number(col));
  if (!cell) return false;

  if (startCell) {
    startCell.classList.remove("start");
  }

  clearCellRole(cell);
  if (isObstacleCell(cell)) {
    setCellTerrain(cell, "normal");
  }

  cell.classList.add("start");
  startCell = cell;
  placeCarAtCell(cell, 0);
  return true;
}

function setEndFromCoordinate(row, col) {
  const cell = getCell(Number(row), Number(col));
  if (!cell) return false;

  if (endCell) {
    endCell.classList.remove("end");
  }

  clearCellRole(cell);
  if (isObstacleCell(cell)) {
    setCellTerrain(cell, "normal");
  }

  cell.classList.add("end");
  endCell = cell;
  return true;
}

function updatePresetDescription(presetKey = presetMapSelect.value) {
  const preset = PRESET_MAPS[presetKey];

  if (!preset) {
    presetDescriptionEl.textContent = "Chọn một map mẫu để xem mục tiêu demo.";
    return;
  }

  presetDescriptionEl.textContent = `${preset.description} Mục tiêu: ${preset.demoGoal} Thuật toán gợi ý: ${formatAlgorithmName(preset.recommendedAlgorithm)}.`;
}

function loadPresetMap(presetKey) {
  const preset = PRESET_MAPS[presetKey];
  if (!preset) return;

  try {
    resetForNewMap();
    applyGridToUI(preset.grid);

    const startOk = setStartFromCoordinate(preset.start[0], preset.start[1]);
    const endOk = setEndFromCoordinate(preset.end[0], preset.end[1]);

    if (!startOk || !endOk) {
      throw new Error("Start hoặc Goal của map mẫu không hợp lệ.");
    }

    if (algorithmSelect.querySelector(`option[value="${preset.recommendedAlgorithm}"]`)) {
      algorithmSelect.value = preset.recommendedAlgorithm;
    }

    setActiveTool("terrain");
    updatePresetDescription(presetKey);
    setStatus(`Đã tải ${preset.name}`);
  } catch (error) {
    alert(error.message || "Không thể tải map mẫu.");
  }
}

function pickRandomTerrain() {
  const randomValue = Math.random();

  if (randomValue < 0.58) return "normal";
  if (randomValue < 0.76) return "rough";
  if (randomValue < 0.88) return "traffic";
  if (randomValue < 0.96) return "danger";
  return "obstacle";
}

function generateRandomMap() {
  if (isAnimating) return;

  clearVisualization();
  resetMovementState();
  resetStats();
  resetComparisonTable();
  resetExplanation();
  setStatus("Đã tạo map random");

  const allCells = gridEl.querySelectorAll(".cell");

  allCells.forEach((cell) => {
    if (cell === startCell || cell === endCell) return;
    setCellTerrain(cell, pickRandomTerrain());
  });

  if (startCell) {
    placeCarAtCell(startCell, 0);
  }
}

function getGridMatrix() {
  const matrix = [];
  for (let row = 0; row < GRID_SIZE; row += 1) {
    const matrixRow = [];
    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cell = cells[row][col];
      const type = cell.dataset.type || "normal";
      matrixRow.push({
        type,
        cost: CELL_TYPES[type].cost,
      });
    }
    matrix.push(matrixRow);
  }
  return matrix;
}

function ensureStartAndEnd() {
  if (!startCell || !endCell) {
    alert("Hãy đặt cả Start và Goal trước khi chạy mô phỏng.");
    return false;
  }

  return true;
}

function buildSolvePayload(algorithm = algorithmSelect.value, startOverride = null) {
  return {
    algorithm,
    grid: getGridMatrix(),
    start: startOverride ?? [Number(startCell.dataset.row), Number(startCell.dataset.col)],
    end: [Number(endCell.dataset.row), Number(endCell.dataset.col)],
  };
}

function getAnimationDelay() {
  const speed = Number(speedSlider.value);
  return Math.max(20, 230 - speed * 2);
}

function getCarMoveDelay() {
  const speed = Number(speedSlider.value);
  return Math.max(45, 340 - speed * 2.8);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isStartOrEndCell(cell) {
  return cell === startCell || cell === endCell;
}

function setControlsDisabled(disabled) {
  editingControls.forEach((control) => {
    control.disabled = disabled;
  });
  startSimBtn.disabled = disabled;
  // Keep dynamic obstacle available while the car is moving.
  dynamicObstacleBtn.disabled = false;
  pauseSimBtn.disabled = false;
  resumeSimBtn.disabled = false;
  resetSimBtn.disabled = false;
}

function getRotationAngle(fromRow, fromCol, toRow, toCol) {
  if (toCol > fromCol) return 0;
  if (toRow > fromRow) return 90;
  if (toCol < fromCol) return 180;
  if (toRow < fromRow) return -90;
  return 0;
}

function sameCoordinate(a, b) {
  return Array.isArray(a) && Array.isArray(b) && Number(a[0]) === Number(b[0]) && Number(a[1]) === Number(b[1]);
}

function isCellProtected(cell) {
  const currentCell = getCurrentCarCell();
  return !cell || cell === currentCell || cell === startCell || cell === endCell || isObstacleCell(cell);
}

function isCoordinateOnRemainingPath(row, col) {
  const target = [Number(row), Number(col)];
  return currentPath.slice(currentPathIndex + 1).some((coordinate) => sameCoordinate(coordinate, target));
}

function chooseDynamicObstacleCell() {
  const pathCandidates = currentPath
    .slice(currentPathIndex + 1)
    .map(([row, col]) => getCell(Number(row), Number(col)))
    .filter((cell) => !isCellProtected(cell));

  if (pathCandidates.length > 0) {
    return pathCandidates[Math.min(1, pathCandidates.length - 1)];
  }

  const allCells = Array.from(gridEl.querySelectorAll(".cell"));
  const fallbackCandidates = allCells.filter((cell) => !isCellProtected(cell));

  if (fallbackCandidates.length === 0) {
    return null;
  }

  return fallbackCandidates[Math.floor(Math.random() * fallbackCandidates.length)];
}

async function waitWhileReplanning(token) {
  while (isReplanning && token === movementToken) {
    await sleep(50);
  }
}

async function waitWhilePaused(token) {
  while (isPaused && token === movementToken) {
    await sleep(50);
  }
}

async function controlledSleep(ms, token) {
  const slice = 25;
  let remaining = ms;

  while (remaining > 0 && token === movementToken) {
    await waitWhilePaused(token);
    if (token !== movementToken) return;

    const currentSlice = Math.min(slice, remaining);
    await sleep(currentSlice);
    remaining -= currentSlice;
  }
}

async function animateVisitedNodes(visitedNodes, token = movementToken) {
  for (const coordinate of visitedNodes) {
    await waitWhilePaused(token);
    if (token !== movementToken) return;

    const [row, col] = coordinate;
    const cell = getCell(Number(row), Number(col));

    if (!cell || isStartOrEndCell(cell) || isObstacleCell(cell)) {
      continue;
    }

    const delay = getAnimationDelay();
    const activeTime = Math.max(10, Math.floor(delay * 0.4));
    const doneTime = Math.max(10, delay - activeTime);

    cell.classList.remove("visited-done", "path");
    cell.classList.add("visited-current");

    await controlledSleep(activeTime, token);
    if (token !== movementToken) return;

    cell.classList.remove("visited-current");
    cell.classList.add("visited-done");

    await controlledSleep(doneTime, token);
  }
}

async function drawPath(path, token = movementToken) {
  for (const coordinate of path) {
    await waitWhilePaused(token);
    if (token !== movementToken) return;

    const [row, col] = coordinate;
    const cell = getCell(Number(row), Number(col));

    if (!cell || isStartOrEndCell(cell) || isObstacleCell(cell)) {
      continue;
    }

    cell.classList.remove("visited-current", "visited-done");
    cell.classList.add("path");

    await controlledSleep(Math.max(8, Math.floor(getAnimationDelay() * 0.35)), token);
  }
}

async function replanFromCurrent(statusMessage = "Đang tính lại đường") {
  if (isReplanning) return;

  const currentCoordinate = getCurrentCarCoordinate();
  if (!currentCoordinate || !endCell) return;

  isReplanning = true;
  setStatus(statusMessage);

  try {
    const response = await fetch("/solve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildSolvePayload(algorithmSelect.value, currentCoordinate)),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Không thể tính lại đường.");
    }

    if (!result.success || !Array.isArray(result.path) || result.path.length === 0) {
      currentPath = [];
      currentPathIndex = 0;
      isCarMoving = false;
      movementToken += 1;
      updateStats(result);
      setStatus("Không tìm thấy đường mới");
      alert("Không tìm thấy đường mới.");
      return;
    }

    currentPath = result.path;
    currentPathIndex = 0;
    clearCellVisuals();
    updateStats(result);
    await drawPath(currentPath);
    setStatus("Đã tìm thấy đường mới");
  } catch (error) {
    currentPath = [];
    currentPathIndex = 0;
    isCarMoving = false;
    movementToken += 1;
    setStatus("Không tìm thấy đường mới");
    alert(error.message || "Không tìm thấy đường mới.");
  } finally {
    isReplanning = false;
  }
}

async function moveCarAlongPath(path) {
  if (!Array.isArray(path) || path.length === 0) return;

  movementToken += 1;
  const token = movementToken;
  currentPath = path;
  currentPathIndex = 0;
  isCarMoving = true;
  setStatus("Đang di chuyển");

  const [firstRow, firstCol] = currentPath[0];
  const firstCell = getCell(Number(firstRow), Number(firstCol));
  if (!firstCell) return;

  placeCarAtCell(firstCell, 0);

  while (token === movementToken && currentPathIndex < currentPath.length - 1) {
    await waitWhileReplanning(token);
    await waitWhilePaused(token);
    if (token !== movementToken || !isCarMoving) break;

    const [fromRow, fromCol] = currentPath[currentPathIndex];
    const [toRow, toCol] = currentPath[currentPathIndex + 1];
    const targetCell = getCell(Number(toRow), Number(toCol));

    if (!targetCell) {
      break;
    }

    if (isObstacleCell(targetCell)) {
      await replanFromCurrent("Phát hiện vật cản, đang tính lại đường");
      continue;
    }

    const angle = getRotationAngle(Number(fromRow), Number(fromCol), Number(toRow), Number(toCol));
    const stepDelay = getCarMoveDelay();
    const rotateDelay = Math.max(40, Math.floor(stepDelay * 0.35));

    rotateCar(angle);
    await controlledSleep(rotateDelay, token);
    await waitWhileReplanning(token);
    await waitWhilePaused(token);

    if (token !== movementToken || !isCarMoving) break;

    if (isObstacleCell(targetCell)) {
      await replanFromCurrent("Phát hiện vật cản, đang tính lại đường");
      continue;
    }

    placeCarAtCell(targetCell, angle);
    currentPathIndex += 1;
    await controlledSleep(Math.max(20, stepDelay - rotateDelay), token);
  }

  if (token === movementToken && isCarMoving && currentPathIndex >= currentPath.length - 1) {
    isCarMoving = false;
    setStatus("Đã đến Goal");
  }
}

async function solveAndVisualize() {
  if (isAnimating) return;
  if (!ensureStartAndEnd()) return;

  clearVisualization();
  resetMovementState();
  const token = movementToken;
  resetStats();
  resetComparisonTable();
  resetExplanation();
  setStatus("Đang tìm đường");

  isAnimating = true;
  setControlsDisabled(true);

  try {
    const response = await fetch("/solve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildSolvePayload()),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Không thể xử lý yêu cầu.");
    }

    lastSingleExplanation = generateSingleExplanation(result, algorithmSelect.value);
    setExplanation(lastSingleExplanation);

    updateComparisonTable(buildSolvePayload(), token).catch((error) => {
      console.error(error);
      if (token === movementToken) {
        showComparisonError("Không thể tự động so sánh thuật toán.");
      }
    });

    const visitedNodes = Array.isArray(result.visited_order) ? result.visited_order : result.visited_nodes ?? [];
    const path = Array.isArray(result.path) ? result.path : [];

    if (token !== movementToken) return;

    await animateVisitedNodes(visitedNodes, token);
    if (token !== movementToken) return;

    updateStats(result);

    if (path.length > 0) {
      await drawPath(path, token);
      if (token !== movementToken) return;

      await moveCarAlongPath(path);
    }

    if (!result.success) {
      setStatus("Không tìm thấy đường");
      alert("Không tìm thấy đường đi từ Start đến Goal.");
    }
  } catch (error) {
    setStatus("Có lỗi khi chạy mô phỏng");
    alert(error.message || "Có lỗi xảy ra khi chạy mô phỏng.");
  } finally {
    isAnimating = false;
    setControlsDisabled(false);
  }
}

async function updateComparisonTable(payload = buildSolvePayload(), token = null) {
  const response = await fetch("/compare", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Không thể so sánh thuật toán.");
  }

  if (token !== null && token !== movementToken) return;

  renderComparisonTable(data.results);
  const comparisonExplanation = generateComparisonExplanation(data.results);
  setExplanation([lastSingleExplanation, comparisonExplanation].filter(Boolean).join("\n\n"));
}

async function addDynamicObstacle() {
  if (!isCarMoving || currentPath.length === 0 || !carState) {
    alert("Hãy chạy mô phỏng để xe đang di chuyển trước khi thêm vật cản động.");
    return;
  }

  const cell = chooseDynamicObstacleCell();
  if (!cell) {
    setStatus("Không còn ô hợp lệ để thêm vật cản động");
    return;
  }

  const row = Number(cell.dataset.row);
  const col = Number(cell.dataset.col);
  const blocksRemainingPath = isCoordinateOnRemainingPath(row, col);

  setCellTerrain(cell, "obstacle", { dynamic: true });
  cell.classList.remove(...VISUAL_CLASSES);

  if (blocksRemainingPath) {
    setStatus("Phát hiện vật cản");
    await replanFromCurrent("Đã phát hiện vật cản, đang tính lại đường");
  } else {
    setStatus("Vật cản không chặn path hiện tại, xe tiếp tục");
  }
}

setStartBtn.addEventListener("click", () => setActiveTool("start"));
setEndBtn.addEventListener("click", () => setActiveTool("end"));
drawObstacleBtn.addEventListener("click", () => setActiveTool("terrain"));

randomMapBtn.addEventListener("click", generateRandomMap);
clearBoardBtn.addEventListener("click", clearBoard);
startSimBtn.addEventListener("click", solveAndVisualize);
pauseSimBtn.addEventListener("click", pauseAnimation);
resumeSimBtn.addEventListener("click", resumeAnimation);
resetSimBtn.addEventListener("click", resetAnimation);
dynamicObstacleBtn.addEventListener("click", addDynamicObstacle);
presetMapSelect.addEventListener("change", () => updatePresetDescription());
loadPresetBtn.addEventListener("click", () => loadPresetMap(presetMapSelect.value));
terrainTypeSelect.addEventListener("change", () => {
  if (currentTool === "terrain") {
    setStatus(`Đang vẽ: ${CELL_TYPES[terrainTypeSelect.value].label}`);
  }
});

speedSlider.addEventListener("input", () => {
  speedValueEl.textContent = speedSlider.value;
});

window.addEventListener("resize", () => {
  if (!carState || isAnimating) return;
  const currentCell = getCell(carState.row, carState.col);
  if (currentCell) {
    placeCarAtCell(currentCell, carState.angle);
  }
});

document.addEventListener("mouseup", () => {
  isMouseDown = false;
});

createGrid();
setActiveTool("terrain");
resetStats();
resetComparisonTable();
resetExplanation();
updatePresetDescription();
setStatus("Sẵn sàng");
