const GRID_SIZE = 20;

const gridEl = document.getElementById("grid");
const speedSlider = document.getElementById("speedSlider");
const speedValueEl = document.getElementById("speedValue");

const setStartBtn = document.getElementById("setStartBtn");
const setEndBtn = document.getElementById("setEndBtn");
const drawObstacleBtn = document.getElementById("drawObstacleBtn");
const randomMapBtn = document.getElementById("randomMapBtn");
const clearBoardBtn = document.getElementById("clearBoardBtn");
const startSimBtn = document.getElementById("startSimBtn");
const algorithmSelect = document.getElementById("algorithm");

const statTimeEl = document.getElementById("statTime");
const statVisitedEl = document.getElementById("statVisited");
const statPathLengthEl = document.getElementById("statPathLength");

const editingControls = [
  setStartBtn,
  setEndBtn,
  drawObstacleBtn,
  randomMapBtn,
  clearBoardBtn,
  algorithmSelect,
];

let currentTool = "obstacle";
let startCell = null;
let endCell = null;
let isMouseDown = false;
let isAnimating = false;
let carEl = null;
let carState = null;

const cells = [];

function createGrid() {
  gridEl.innerHTML = "";

  for (let row = 0; row < GRID_SIZE; row += 1) {
    cells[row] = [];

    for (let col = 0; col < GRID_SIZE; col += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = row;
      cell.dataset.col = col;

      cell.addEventListener("mousedown", () => {
        if (isAnimating) return;
        isMouseDown = true;
        paintCell(cell);
      });

      cell.addEventListener("mouseenter", () => {
        if (isAnimating) return;
        if (isMouseDown && currentTool === "obstacle") {
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

function clearCellRole(cell) {
  if (!cell) return;
  if (cell === startCell) startCell = null;
  if (cell === endCell) endCell = null;
  cell.classList.remove("start", "end", "obstacle");
}

function clearVisualization() {
  const allCells = document.querySelectorAll(".cell");
  allCells.forEach((cell) => {
    cell.classList.remove("visited-current", "visited-done", "path");
  });
  hideCar();
}

function paintCell(cell) {
  if (!cell || isAnimating) return;

  if (currentTool === "start") {
    if (startCell) startCell.classList.remove("start");
    clearCellRole(cell);
    cell.classList.add("start");
    startCell = cell;
    placeCarAtCell(startCell, 0);
    return;
  }

  if (currentTool === "end") {
    if (endCell) endCell.classList.remove("end");
    clearCellRole(cell);
    cell.classList.add("end");
    endCell = cell;
    return;
  }

  if (currentTool === "obstacle") {
    if (cell === startCell || cell === endCell) return;
    cell.classList.toggle("obstacle");
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
  if (tool === "obstacle") drawObstacleBtn.classList.add("active-tool");
}

function resetStats() {
  statTimeEl.textContent = "-";
  statVisitedEl.textContent = "-";
  statPathLengthEl.textContent = "-";
}

function updateStats(result) {
  statTimeEl.textContent = `${result.execution_time ?? 0} ms`;
  statVisitedEl.textContent = result.visited_count ?? 0;
  statPathLengthEl.textContent = result.path_length ?? 0;
}

function clearBoard() {
  if (isAnimating) return;

  const allCells = document.querySelectorAll(".cell");
  allCells.forEach((cell) => {
    cell.classList.remove("start", "end", "obstacle", "visited-current", "visited-done", "path");
  });

  startCell = null;
  endCell = null;
  hideCar();
  resetStats();
}

function generateRandomMap() {
  if (isAnimating) return;

  clearVisualization();
  resetStats();

  const occupancy = 0.2 + Math.random() * 0.1;
  const allCells = document.querySelectorAll(".cell");

  allCells.forEach((cell) => {
    if (cell === startCell || cell === endCell) return;
    cell.classList.remove("obstacle");
    if (Math.random() < occupancy) {
      cell.classList.add("obstacle");
    }
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
      matrixRow.push(cells[row][col].classList.contains("obstacle") ? 1 : 0);
    }
    matrix.push(matrixRow);
  }
  return matrix;
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
}

function getRotationAngle(fromRow, fromCol, toRow, toCol) {
  if (toCol > fromCol) return 0;
  if (toRow > fromRow) return 90;
  if (toCol < fromCol) return 180;
  if (toRow < fromRow) return -90;
  return 0;
}

async function animateVisitedNodes(visitedNodes) {
  for (const coordinate of visitedNodes) {
    const [row, col] = coordinate;
    const cell = getCell(Number(row), Number(col));

    if (!cell || isStartOrEndCell(cell) || cell.classList.contains("obstacle")) {
      continue;
    }

    const delay = getAnimationDelay();
    const activeTime = Math.max(10, Math.floor(delay * 0.4));
    const doneTime = Math.max(10, delay - activeTime);

    cell.classList.remove("visited-done", "path");
    cell.classList.add("visited-current");

    await sleep(activeTime);

    cell.classList.remove("visited-current");
    cell.classList.add("visited-done");

    await sleep(doneTime);
  }
}

async function drawPath(path) {
  for (const coordinate of path) {
    const [row, col] = coordinate;
    const cell = getCell(Number(row), Number(col));

    if (!cell || isStartOrEndCell(cell) || cell.classList.contains("obstacle")) {
      continue;
    }

    cell.classList.remove("visited-current", "visited-done");
    cell.classList.add("path");

    await sleep(Math.max(8, Math.floor(getAnimationDelay() * 0.35)));
  }
}

async function moveCarAlongPath(path) {
  if (!Array.isArray(path) || path.length === 0) return;

  const [firstRow, firstCol] = path[0];
  const firstCell = getCell(Number(firstRow), Number(firstCol));
  if (!firstCell) return;

  placeCarAtCell(firstCell, 0);

  for (let i = 1; i < path.length; i += 1) {
    const [fromRow, fromCol] = path[i - 1];
    const [toRow, toCol] = path[i];

    const targetCell = getCell(Number(toRow), Number(toCol));
    if (!targetCell) continue;

    const angle = getRotationAngle(Number(fromRow), Number(fromCol), Number(toRow), Number(toCol));
    const stepDelay = getCarMoveDelay();
    const rotateDelay = Math.max(40, Math.floor(stepDelay * 0.35));

    rotateCar(angle);
    await sleep(rotateDelay);

    placeCarAtCell(targetCell, angle);
    await sleep(Math.max(20, stepDelay - rotateDelay));
  }
}

async function solveAndVisualize() {
  if (isAnimating) return;

  if (!startCell || !endCell) {
    alert("Hãy đặt cả Start và End trước khi chạy mô phỏng.");
    return;
  }

  clearVisualization();
  resetStats();

  const payload = {
    algorithm: algorithmSelect.value,
    grid: getGridMatrix(),
    start: [Number(startCell.dataset.row), Number(startCell.dataset.col)],
    end: [Number(endCell.dataset.row), Number(endCell.dataset.col)],
  };

  isAnimating = true;
  setControlsDisabled(true);

  try {
    const response = await fetch("/solve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Không thể xử lý yêu cầu.");
    }

    const visitedNodes = Array.isArray(result.visited_nodes) ? result.visited_nodes : [];
    const path = Array.isArray(result.path) ? result.path : [];

    await animateVisitedNodes(visitedNodes);
    updateStats(result);

    if (path.length > 0) {
      await drawPath(path);
      await moveCarAlongPath(path);
    }

    if (result.message === "Path not found") {
      alert("Không tìm thấy đường đi từ Start đến End.");
    }
  } catch (error) {
    alert(error.message || "Có lỗi xảy ra khi chạy mô phỏng.");
  } finally {
    isAnimating = false;
    setControlsDisabled(false);
  }
}

setStartBtn.addEventListener("click", () => setActiveTool("start"));
setEndBtn.addEventListener("click", () => setActiveTool("end"));
drawObstacleBtn.addEventListener("click", () => setActiveTool("obstacle"));

randomMapBtn.addEventListener("click", generateRandomMap);
clearBoardBtn.addEventListener("click", clearBoard);
startSimBtn.addEventListener("click", solveAndVisualize);

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
setActiveTool("obstacle");
resetStats();
