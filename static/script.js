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

const statTimeEl = document.getElementById("statTime");
const statVisitedEl = document.getElementById("statVisited");
const statPathLengthEl = document.getElementById("statPathLength");
const statTotalCostEl = document.getElementById("statTotalCost");
const simStatusEl = document.getElementById("simStatus");
const comparisonBodyEl = document.getElementById("comparisonBody");

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

const cells = [];

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
  setStatus("Sẵn sàng");
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
setStatus("Sẵn sàng");
