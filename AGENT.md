# AGENT.md

## 1. Project Context
- **Tên dự án:** Self-Driving Car Pathfinding Simulation.
- **Mục tiêu:** Xây dựng ứng dụng web mô phỏng thuật toán tìm đường cho xe tự lái trong môn Trí Tuệ Nhân Tạo.
- **Tech Stack:**
  - **Backend:** Python (Flask).
  - **Frontend:** Vanilla HTML, CSS, JavaScript.
  - **Dữ liệu:** Client và Server giao tiếp qua REST API (JSON).

## 2. Directory Structure
Dự án phải tuân thủ cấu trúc thư mục sau:

```text
self-driving-car/
├── app.py
├── algorithms/
│   ├── dfs.py
│   ├── astar.py
│   └── bfs.py
├── static/
│   ├── style.css
│   └── script.js
├── templates/
│   └── index.html
└── maps/
    └── (Lưu trữ các file config map nếu có)
```

## 3. Core Features & Requirements
- **Mô phỏng Bản đồ (Grid Map):** Giao diện dạng lưới (Grid). Người dùng có thể click để tạo Start, End và Obstacles.
- **Random Map:** Nút "Generate Random Map" tự động sinh vật cản ngẫu nhiên.
- **Thuật toán:** Backend phải hỗ trợ DFS, A*, BFS.
- **Visualization:**
  - Node đang được duyệt: **Màu vàng (Yellow)**.
  - Node đã duyệt xong: **Màu xanh dương (Blue)**.
  - Đường đi tìm được: **Màu đỏ (Red)**.
- **Animation Xe chạy:**
  - Một icon hoặc khối đại diện cho xe sẽ di chuyển từng bước dọc theo đường đi màu đỏ.
  - Xe phải tự động rotate hướng về phía node tiếp theo.
  - Slider điều chỉnh tốc độ animation và tốc độ xe.
- **Statistics:**
  - Số node đã duyệt (Visited nodes).
  - Thời gian chạy thuật toán (Execution time, ms).
  - Độ dài đường đi (Path length).

## 4. Working Agreements
- **Luôn kiểm tra dữ liệu đầu vào:** Backend phải bắt lỗi nếu không có đường đi (Path not found) và trả về message rõ ràng.
- **Cấu trúc JSON Backend trả về:**
  ```json
  {
    "visited_nodes": [[0, 0], [0, 1]],
    "path": [[0, 0], [0, 1]],
    "execution_time": 1.2,
    "visited_count": 45,
    "path_length": 12
  }
  ```
- **Tách biệt logic:** Frontend chỉ chịu trách nhiệm render và animation. Logic thuật toán nằm trong thư mục `algorithms/`.
- **Ngôn ngữ:** Luôn trả lời bằng tiếng Việt.
