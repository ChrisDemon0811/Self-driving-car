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
│   ├── ucs.py
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
- **Thuật toán:** Backend phải hỗ trợ UCS, A*, BFS.
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



## 5. Chức năng nâng cao cần triển khai

Các chức năng dưới đây là phần mở rộng để project không chỉ là visualizer tìm đường đơn giản, mà trở thành mô phỏng xe tự lái có xét chi phí, so sánh thuật toán và phản ứng với môi trường thay đổi.

---

## 5.1. Bản đồ có trọng số

### Mục tiêu

Bản đồ không chỉ có ô trống và vật cản, mà phải có nhiều loại địa hình khác nhau. Mỗi loại ô có chi phí di chuyển riêng để mô phỏng tình huống xe tự lái phải chọn đường tối ưu theo chi phí, không chỉ theo số bước.

### Các loại ô bắt buộc

| Loại ô         | Tên trong code | Chi phí | Có thể đi qua |
| -------------- | -------------- | ------: | ------------- |
| Đường thường   | `normal`       |       1 | Có            |
| Đường xấu      | `rough`        |       3 | Có            |
| Kẹt xe         | `traffic`      |       5 | Có            |
| Vùng nguy hiểm | `danger`       |       8 | Có            |
| Vật cản        | `obstacle`     |  Vô cực | Không         |

### Yêu cầu backend

* Không nên chỉ lưu map theo kiểu `0` và `1` nếu cần hỗ trợ trọng số.
* Mỗi ô trên grid phải thể hiện được:

  * loại ô
  * chi phí di chuyển
  * trạng thái có đi qua được hay không
* Start và End luôn phải là ô đi được.
* Khi random map, không được sinh vật cản tại Start hoặc End.
* Nếu map sinh ra không có đường đi, backend phải trả về message rõ ràng thay vì lỗi hệ thống.

### Yêu cầu frontend

* Hiển thị màu khác nhau cho từng loại ô.
* Phải có phần chú thích bản đồ, gồm:

  * đường thường
  * đường xấu
  * kẹt xe
  * vùng nguy hiểm
  * vật cản
  * điểm bắt đầu
  * điểm kết thúc
  * đường đi
  * node đã duyệt
* Người dùng có thể nhận biết rõ loại ô nào có chi phí cao hơn.

### Gợi ý màu sắc

* Đường thường: trắng hoặc xám nhạt
* Đường xấu: nâu nhạt
* Kẹt xe: cam
* Vùng nguy hiểm: tím hoặc đỏ sẫm
* Vật cản: đen
* Start: xanh lá
* End: đỏ đậm
* Path: đỏ
* Visited: xanh dương
* Node đang xét: vàng

---

## 5.2. Chuẩn hóa kết quả thuật toán

Tất cả thuật toán BFS, UCS và A* phải trả về cùng một cấu trúc JSON để frontend dễ xử lý.

### Cấu trúc JSON mới khuyến nghị

```json
{
  "success": true,
  "algorithm": "A*",
  "visited_nodes": [[0, 0], [0, 1]],
  "path": [[0, 0], [0, 1], [0, 2]],
  "execution_time": 1.2,
  "visited_count": 45,
  "path_length": 12,
  "total_cost": 18,
  "message": "Tìm thấy đường đi"
}
```

### Ý nghĩa các trường

* `success`: cho biết thuật toán có tìm thấy đường hay không.
* `algorithm`: tên thuật toán đã chạy.
* `visited_nodes`: danh sách các node đã duyệt để phục vụ visualization.
* `path`: đường đi cuối cùng từ Start đến End.
* `execution_time`: thời gian chạy thuật toán, tính bằng milliseconds.
* `visited_count`: tổng số node đã duyệt.
* `path_length`: số bước đi trên đường tìm được.
* `total_cost`: tổng chi phí của đường đi dựa trên trọng số các ô.
* `message`: thông báo trạng thái rõ ràng cho frontend hiển thị.

### Lưu ý

* Nếu không tìm thấy đường, vẫn phải trả JSON hợp lệ.
* Không được để frontend bị lỗi vì thiếu field.
* Nếu không tìm thấy đường:

  * `success = false`
  * `path = []`
  * `message = "Không tìm thấy đường đi"`

---

## 5.3. Cập nhật BFS cho bản đồ trọng số

### Vai trò của BFS

BFS dùng làm thuật toán cơ sở để so sánh với UCS và A*.

### Yêu cầu

* BFS vẫn tìm đường theo số bước.
* Trong quá trình tìm kiếm, BFS xem mọi ô đi được có cùng chi phí.
* BFS không đi qua ô `obstacle`.
* Sau khi tìm được đường đi, vẫn phải tính `total_cost` thật dựa trên chi phí của từng ô trong path.

### Mục đích so sánh

BFS có thể tìm được đường ít bước nhất, nhưng chưa chắc là đường có chi phí thấp nhất.

Ví dụ:

* Đường A: 10 bước, đi qua nhiều ô kẹt xe, tổng cost = 35.
* Đường B: 14 bước, đi qua đường thường, tổng cost = 18.

Trong trường hợp này, BFS có thể chọn đường A, còn UCS hoặc A* nên chọn đường B.

---

## 5.4. Thêm thuật toán UCS

### Mục tiêu

UCS, Uniform Cost Search, được dùng để tìm đường có tổng chi phí thấp nhất trên bản đồ có trọng số.

### File cần có

Thuật toán UCS phải nằm trong:

```text
algorithms/ucs.py
```

### Yêu cầu thuật toán

* Dùng hàng đợi ưu tiên, priority queue.
* Ưu tiên mở rộng node có tổng chi phí từ Start đến node hiện tại thấp nhất.
* Chi phí đi vào một ô phụ thuộc vào loại ô đó:

  * `normal = 1`
  * `rough = 3`
  * `traffic = 5`
  * `danger = 8`
* Không đi qua `obstacle`.
* Trả về đường có tổng cost thấp nhất nếu tồn tại.
* Trả JSON theo format thống nhất của project.

### Lưu ý kỹ thuật

* Có thể dùng `heapq` của Python.
* Cần lưu:

  * cost hiện tại đến mỗi node
  * node cha để dựng lại path
  * thứ tự node đã duyệt
* Nếu gặp một đường mới đến cùng một node nhưng cost thấp hơn, phải cập nhật lại cost.

---

## 5.5. Cập nhật A* cho bản đồ trọng số

### Mục tiêu

A* phải hoạt động đúng trên map có trọng số, không chỉ map obstacle đơn giản.

### Công thức

```text
f(n) = g(n) + h(n)
```

Trong đó:

* `g(n)`: tổng chi phí thật từ Start đến node hiện tại.
* `h(n)`: chi phí ước lượng từ node hiện tại đến End.
* `f(n)`: độ ưu tiên để chọn node tiếp theo.

### Heuristic bắt buộc

Dùng Manhattan Distance cho grid 4 hướng:

```text
h(n) = (abs(x1 - x2) + abs(y1 - y2)) * min_cost
```

Trong đó:

```text
min_cost = 1
```

### Yêu cầu

* A* dùng priority queue.
* A* không đi qua `obstacle`.
* A* phải tính cost theo từng loại ô.
* A* phải trả về:

  * path
  * visited_nodes
  * total_cost
  * path_length
  * visited_count
  * execution_time
* Không dùng heuristic quá lớn vì có thể làm A* mất tính tối ưu.

---

## 5.6. Bảng so sánh BFS, UCS, A*

### Mục tiêu

Thêm bảng thống kê để so sánh kết quả của ba thuật toán trên cùng một bản đồ, cùng Start và cùng End.

### Nút chức năng

Frontend cần có nút:

```text
So sánh tất cả thuật toán
```

hoặc:

```text
Compare Algorithms
```

### Khi bấm nút

Hệ thống phải:

1. Lấy grid hiện tại.
2. Lấy Start và End hiện tại.
3. Chạy lần lượt:

   * BFS
   * UCS
   * A*
4. Không random lại map.
5. Không thay đổi Start và End.
6. Hiển thị kết quả trong bảng thống kê.

### Cột thống kê bắt buộc

| Thuật toán | Trạng thái | Số node đã duyệt | Thời gian chạy | Độ dài đường đi | Tổng chi phí |
| ---------- | ---------- | ---------------: | -------------: | --------------: | -----------: |

### Ý nghĩa khi demo

* BFS: tìm đường theo số bước, phù hợp khi mọi ô có chi phí bằng nhau.
* UCS: tìm đường có tổng chi phí thấp nhất.
* A*: thường tìm được đường tối ưu như UCS nhưng duyệt ít node hơn nhờ heuristic.

### Yêu cầu backend

Có thể tạo API mới, ví dụ:

```text
POST /compare
```

Request JSON:

```json
{
  "grid": [],
  "start": [0, 0],
  "end": [9, 9]
}
```

Response JSON:

```json
{
  "success": true,
  "results": [
    {
      "algorithm": "BFS",
      "success": true,
      "visited_count": 100,
      "execution_time": 2.1,
      "path_length": 20,
      "total_cost": 35,
      "message": "Tìm thấy đường đi"
    },
    {
      "algorithm": "UCS",
      "success": true,
      "visited_count": 80,
      "execution_time": 2.8,
      "path_length": 24,
      "total_cost": 22,
      "message": "Tìm thấy đường đi"
    },
    {
      "algorithm": "A*",
      "success": true,
      "visited_count": 45,
      "execution_time": 1.4,
      "path_length": 24,
      "total_cost": 22,
      "message": "Tìm thấy đường đi"
    }
  ]
}
```

### Yêu cầu frontend

* Render bảng so sánh rõ ràng.
* Nếu thuật toán không tìm thấy đường, hiển thị:

  * trạng thái: Không tìm thấy đường
  * path_length: `-`
  * total_cost: `-`
* Không được crash nếu một thuật toán thất bại.

---

## 5.7. Vật cản động và tự tính lại đường

### Mục tiêu

Mô phỏng tình huống xe tự lái đang chạy thì gặp vật cản bất ngờ, sau đó hệ thống tự tính lại đường từ vị trí hiện tại của xe đến End.

### Chức năng bắt buộc

Frontend cần có nút:

```text
Thêm vật cản động
```

hoặc:

```text
Mô phỏng vật cản bất ngờ
```

### Cách hoạt động

1. Xe đang di chuyển theo path hiện tại.
2. Người dùng bấm nút thêm vật cản động, hoặc hệ thống tự sinh vật cản sau vài bước.
3. Vật cản mới được đặt trên phần đường còn lại phía trước xe nếu có thể.
4. Nếu vật cản mới chặn path hiện tại:

   * tạm dừng xe
   * gọi lại thuật toán đang chọn
   * tính đường mới từ vị trí hiện tại của xe đến End
5. Nếu tìm được đường mới:

   * cập nhật path mới
   * tiếp tục animation
6. Nếu không tìm được đường mới:

   * dừng xe
   * hiển thị thông báo không tìm thấy đường mới.

### Quy tắc đặt vật cản động

Không được đặt vật cản động tại:

* vị trí hiện tại của xe
* Start
* End
* ô đã là obstacle
* ô nằm ngoài grid
* ô không hợp lệ

### Yêu cầu backend

Có thể tái sử dụng API chạy thuật toán hiện có bằng cách gửi:

```json
{
  "grid": [],
  "start": [currentRow, currentCol],
  "end": [endRow, endCol],
  "algorithm": "astar"
}
```

Trong đó `start` lúc replan chính là vị trí hiện tại của xe, không phải Start ban đầu.

### Yêu cầu frontend

Frontend phải lưu được:

* vị trí hiện tại của xe
* path hiện tại
* index bước hiện tại trên path
* thuật toán đang được chọn
* trạng thái animation đang chạy hay đang dừng

### Trạng thái cần hiển thị

* Đang di chuyển
* Phát hiện vật cản mới
* Đường hiện tại bị chặn
* Đang tính lại đường
* Đã tìm thấy đường mới
* Không tìm thấy đường mới

### Lưu ý quan trọng

* Không reset xe về Start khi tính lại đường.
* Không random lại map khi tính lại đường.
* Không xóa các vật cản cũ.
* Vật cản động phải được giữ lại trên map.
* Nếu có nhiều vật cản động, hệ thống vẫn phải xử lý ổn định.

---

## 5.8. Animation xe chạy từng bước

### Mục tiêu

Xe không chỉ hiện đường đi, mà phải di chuyển từng bước theo path để tạo cảm giác mô phỏng xe tự lái.

### Yêu cầu animation

* Sau khi tìm được path, xe di chuyển từng ô từ Start đến End.
* Xe không được nhảy thẳng đến End.
* Mỗi bước có delay để người xem thấy rõ.
* Có thể dùng icon xe, emoji hoặc khối màu đại diện cho xe.
* Xe phải hiển thị nổi bật hơn path và visited nodes.

### Điều khiển animation

Frontend nên có các nút:

* Bắt đầu chạy
* Tạm dừng
* Tiếp tục
* Reset

Nếu không đủ thời gian, ưu tiên:

* Bắt đầu chạy
* Reset

### Slider tốc độ

Phải có slider để chỉnh tốc độ animation.

Yêu cầu:

* Tốc độ thấp: xe chạy chậm, dễ quan sát.
* Tốc độ cao: xe chạy nhanh hơn.
* Slider không được làm lỗi animation đang chạy.

### Rotate hướng xe

Nếu dùng icon xe hoặc hình ảnh xe:

* Xe phải xoay theo hướng di chuyển.
* Đi lên: xoay lên.
* Đi xuống: xoay xuống.
* Đi trái: xoay trái.
* Đi phải: xoay phải.

Nếu dùng emoji hoặc khối đơn giản không xoay được, có thể bỏ rotate, nhưng phải ưu tiên làm rotate nếu code hiện tại hỗ trợ.

### Tích hợp với pathfinding

Luồng chuẩn:

1. Người dùng chọn thuật toán.
2. Người dùng bấm Run.
3. Backend trả về path và visited_nodes.
4. Frontend visualize visited nodes.
5. Frontend visualize path.
6. Xe bắt đầu chạy từng bước theo path.
7. Nếu đến End, hiển thị trạng thái hoàn thành.

### Tích hợp với vật cản động

Nếu vật cản động xuất hiện trên phần path còn lại:

1. Tạm dừng animation.
2. Gửi request replan lên backend.
3. Backend tính path mới từ vị trí hiện tại của xe đến End.
4. Frontend cập nhật path mới.
5. Xe tiếp tục chạy theo path mới.
6. Nếu không tìm được path mới, dừng animation và hiển thị lỗi.

---

## 5.9. API đề xuất

Nếu cấu trúc hiện tại chưa có API rõ ràng, ưu tiên dùng các API sau.

### API chạy một thuật toán

```text
POST /run_algorithm
```

Request:

```json
{
  "algorithm": "astar",
  "grid": [],
  "start": [0, 0],
  "end": [9, 9]
}
```

Response:

```json
{
  "success": true,
  "algorithm": "A*",
  "visited_nodes": [[0, 0], [0, 1]],
  "path": [[0, 0], [0, 1], [0, 2]],
  "execution_time": 1.2,
  "visited_count": 45,
  "path_length": 12,
  "total_cost": 18,
  "message": "Tìm thấy đường đi"
}
```

### API so sánh thuật toán

```text
POST /compare_algorithms
```

Request:

```json
{
  "grid": [],
  "start": [0, 0],
  "end": [9, 9]
}
```

Response:

```json
{
  "success": true,
  "results": []
}
```

### API random map có trọng số

```text
GET /generate_weighted_map
```

hoặc nếu cần cấu hình:

```text
POST /generate_weighted_map
```

Request:

```json
{
  "rows": 20,
  "cols": 20,
  "obstacle_rate": 0.2,
  "rough_rate": 0.15,
  "traffic_rate": 0.1,
  "danger_rate": 0.08
}
```

Response:

```json
{
  "success": true,
  "grid": [],
  "message": "Tạo bản đồ có trọng số thành công"
}
```

---

## 5.10. Validation và xử lý lỗi

Backend phải kiểm tra:

* Grid không được rỗng.
* Start và End phải tồn tại.
* Start và End phải nằm trong phạm vi grid.
* Start và End không được là obstacle.
* Algorithm phải thuộc danh sách:

  * `bfs`
  * `ucs`
  * `astar`
* Nếu không tìm thấy đường, trả về JSON hợp lệ, không throw lỗi ra frontend.
* Nếu grid sai định dạng, trả về lỗi rõ ràng.

Frontend phải kiểm tra:

* Người dùng đã chọn Start chưa.
* Người dùng đã chọn End chưa.
* Người dùng đã chọn thuật toán chưa.
* Không cho animation chạy nếu chưa có path.
* Không cho thêm vật cản động khi chưa có path hoặc xe chưa chạy, trừ khi có xử lý riêng.
* Khi reset, phải xóa:

  * path cũ
  * visited nodes cũ
  * vị trí xe cũ
  * trạng thái animation cũ
  * bảng thống kê cũ nếu cần

---

## 5.11. Thứ tự ưu tiên triển khai

Khi Codex triển khai, hãy làm theo thứ tự sau để tránh lỗi dây chuyền:

1. Chuẩn hóa cấu trúc grid có trọng số.
2. Cập nhật random map để sinh nhiều loại ô.
3. Cập nhật BFS để chạy được với grid mới.
4. Thêm UCS.
5. Cập nhật A* cho weighted map.
6. Chuẩn hóa JSON response.
7. Thêm bảng so sánh BFS, UCS, A*.
8. Thêm animation xe chạy.
9. Thêm vật cản động.
10. Thêm tự động tính lại đường khi path bị chặn.
11. Kiểm tra toàn bộ flow demo.

Không được làm vật cản động trước khi animation xe chạy ổn định.

---

## 5.12. Tiêu chí hoàn thành

Chức năng được xem là hoàn thành khi:

* Random map có đủ nhiều loại ô có trọng số.
* BFS, UCS và A* đều chạy được trên cùng một map.
* Bảng so sánh hiển thị đầy đủ:

  * số node đã duyệt
  * thời gian chạy
  * độ dài đường đi
  * tổng chi phí
  * trạng thái
* Xe di chuyển từng bước theo path.
* Có slider chỉnh tốc độ animation.
* Xe có thể xoay hướng theo bước di chuyển nếu dùng icon có thể rotate.
* Khi có vật cản động trên path phía trước, xe tự tính lại đường từ vị trí hiện tại.
* Nếu không tìm thấy đường mới, hệ thống dừng xe và báo lỗi rõ ràng.
* Không có lỗi JavaScript trên console.
* Không có lỗi backend Flask khi chạy API.
* Project vẫn chạy bằng lệnh hiện tại, ví dụ:

```bash
python app.py
```
