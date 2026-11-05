import test, { before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { config } from "dotenv";
import { Client } from "pg";

// Load environment from apps/api/.env
config({ path: "apps/api/.env" });

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  throw new Error("DATABASE_URL is not configured in apps/api/.env");
}

let app, origin;
const testTenant = process.env.DEFAULT_TENANT_ID || "default";
const otherTenant = "other-tenant";

async function cleanShifts() {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  await client.query('DELETE FROM "hr_shifts_schedules"."shift_schedules"');
  await client.query('DELETE FROM "hr_shifts_schedules"."shifts"');
  await client.end();
}

async function createSchedule(tenantId, shiftId, title = "Lịch phân ca test") {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  const res = await client.query(`
    INSERT INTO "hr_shifts_schedules"."shift_schedules" (
      "id", "tenantId", "shiftId", "title", "description",
      "startDate", "endDate", "startTime", "endTime", "timeZone",
      "allDay", "status", "priority", "assigneeId", "workMode",
      "workLocation", "breakMinutes", "lateGraceMinutes", "earlyLeaveGraceMinutes",
      "standardUnits", "version", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), '${tenantId}', '${shiftId}', '${title}', '',
      '2026-11-04', '2026-11-04', '1970-01-01 08:00:00', '1970-01-01 17:00:00', 'Asia/Ho_Chi_Minh',
      false, 'todo', 'medium', 'user-01', 'AT_OFFICE',
      '', 60, 15, 10,
      1.00, 1, NOW(), NOW()
    ) RETURNING id;
  `);
  await client.end();
  return res.rows[0].id;
}

async function request(path, options = {}) {
  const url = `${origin}/api/v1${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, body: data };
}

before(async () => {
  process.env.DEFAULT_TENANT_ID = testTenant;
  process.env.NODE_ENV = "test";

  const { createApp } = await import("../apps/api/dist/bootstrap.js");
  app = await createApp();
  await app.listen(0, "127.0.0.1");
  origin = await app.getUrl();
});

after(async () => {
  await cleanShifts();
  await app?.close();
});

beforeEach(async () => {
  process.env.DEFAULT_TENANT_ID = testTenant;
  await cleanShifts();
});

// ==========================================
// SHIFT-02: API Danh sách ca làm việc
// ==========================================
test("SHIFT-02: Danh sách rỗng khi chưa có ca làm việc", async () => {
  const res = await request("/shifts");
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.items, []);
  assert.equal(res.body.total, 0);
  assert.equal(res.body.page, 1);
  assert.equal(res.body.pageSize, 20);
});

test("SHIFT-02: Lấy danh sách ca làm việc thuộc tenant mặc định", async () => {
  // Tạo 2 ca làm cho default tenant
  await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-SANG",
      title: "Ca sáng",
      startTime: "08:00",
      endTime: "12:00",
      standardUnits: 0.5,
    },
  });
  await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-CHIEU",
      title: "Ca chiều",
      startTime: "13:00",
      endTime: "17:00",
      standardUnits: 0.5,
    },
  });

  const res = await request("/shifts");
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 2);
  assert.equal(res.body.items.length, 2);
  assert.equal(res.body.items[0].tenantId, testTenant);
  assert.equal(res.body.items[1].tenantId, testTenant);
});

test("SHIFT-02: Không trả về dữ liệu của tenant khác", async () => {
  // Tạo 1 ca cho default tenant
  await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-DEFAULT",
      title: "Ca thuộc default tenant",
      startTime: "08:00",
      endTime: "16:00",
    },
  });

  // Chèn thủ công 1 ca cho tenant khác vào database
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  await client.query(`
    INSERT INTO "hr_shifts_schedules"."shifts" (
      "id", "tenantId", "code", "codeKey", "title", "description",
      "startTime", "endTime", "endDayOffset", "breakMinutes",
      "lateGraceMinutes", "earlyLeaveGraceMinutes", "standardUnits",
      "isActive", "version", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), '${otherTenant}', 'CA-OTHER', 'CA-OTHER', 'Ca tenant khác', '',
      '1970-01-01 08:00:00', '1970-01-01 17:00:00', 0, 60,
      15, 15, 1.00, true, 1, NOW(), NOW()
    )
  `);
  await client.end();

  // Query bằng default tenant
  const res = await request("/shifts");
  assert.equal(res.status, 200);
  assert.equal(res.body.total, 1);
  assert.equal(res.body.items.length, 1);
  assert.equal(res.body.items[0].code, "CA-DEFAULT");
  assert.equal(res.body.items[0].tenantId, testTenant);
});

test("SHIFT-02: Tìm kiếm theo mã ca hoặc tên ca", async () => {
  await request("/shifts", {
    method: "POST",
    body: {
      code: "HC-01",
      title: "Ca Hành Chính",
      startTime: "08:00",
      endTime: "17:00",
      breakMinutes: 60,
    },
  });
  await request("/shifts", {
    method: "POST",
    body: {
      code: "DEM-01",
      title: "Ca Đêm",
      startTime: "22:00",
      endTime: "06:00",
      endDayOffset: 1,
      breakMinutes: 30,
    },
  });

  // Tìm theo mã
  const resByCode = await request("/shifts?q=HC");
  assert.equal(resByCode.status, 200);
  assert.equal(resByCode.body.total, 1);
  assert.equal(resByCode.body.items[0].code, "HC-01");

  // Tìm theo tên
  const resByName = await request("/shifts?q=Đêm");
  assert.equal(resByName.status, 200);
  assert.equal(resByName.body.total, 1);
  assert.equal(resByName.body.items[0].code, "DEM-01");

  // Tìm không khớp
  const resEmpty = await request("/shifts?q=XYZ");
  assert.equal(resEmpty.status, 200);
  assert.equal(resEmpty.body.total, 0);
});

test("SHIFT-02: Lọc theo trạng thái hoạt động (isActive)", async () => {
  await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-ACTIVE",
      title: "Ca đang dùng",
      startTime: "08:00",
      endTime: "17:00",
      isActive: true,
    },
  });
  await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-INACTIVE",
      title: "Ca ngưng dùng",
      startTime: "08:00",
      endTime: "17:00",
      isActive: false,
    },
  });

  const resActive = await request("/shifts?isActive=true");
  assert.equal(resActive.status, 200);
  assert.equal(resActive.body.total, 1);
  assert.equal(resActive.body.items[0].code, "CA-ACTIVE");

  const resInactive = await request("/shifts?isActive=false");
  assert.equal(resInactive.status, 200);
  assert.equal(resInactive.body.total, 1);
  assert.equal(resInactive.body.items[0].code, "CA-INACTIVE");
});

test("SHIFT-02: Phân trang danh sách", async () => {
  for (let i = 1; i <= 5; i++) {
    await request("/shifts", {
      method: "POST",
      body: {
        code: `CA-${i.toString().padStart(2, "0")}`,
        title: `Ca số ${i}`,
        startTime: "08:00",
        endTime: "17:00",
      },
    });
  }

  // Trang 1, pageSize 2
  const p1 = await request(
    "/shifts?page=1&pageSize=2&sortBy=code&sortOrder=asc",
  );
  assert.equal(p1.status, 200);
  assert.equal(p1.body.total, 5);
  assert.equal(p1.body.items.length, 2);
  assert.equal(p1.body.items[0].code, "CA-01");
  assert.equal(p1.body.items[1].code, "CA-02");

  // Trang 2, pageSize 2
  const p2 = await request(
    "/shifts?page=2&pageSize=2&sortBy=code&sortOrder=asc",
  );
  assert.equal(p2.status, 200);
  assert.equal(p2.body.total, 5);
  assert.equal(p2.body.items.length, 2);
  assert.equal(p2.body.items[0].code, "CA-03");
  assert.equal(p2.body.items[1].code, "CA-04");

  // Trang 3, pageSize 2
  const p3 = await request(
    "/shifts?page=3&pageSize=2&sortBy=code&sortOrder=asc",
  );
  assert.equal(p3.status, 200);
  assert.equal(p3.body.total, 5);
  assert.equal(p3.body.items.length, 1);
  assert.equal(p3.body.items[0].code, "CA-05");
});

test("SHIFT-02: Thiếu DEFAULT_TENANT_ID trả về lỗi 500", async () => {
  delete process.env.DEFAULT_TENANT_ID;
  const res = await request("/shifts");
  assert.equal(res.status, 500);
  assert.match(res.body.message, /DEFAULT_TENANT_ID/);
});

test("SHIFT-02: Query parameter không hợp lệ bị từ chối với 400", async () => {
  const pInvalid = await request("/shifts?page=-1");
  assert.equal(pInvalid.status, 400);

  const sizeInvalid = await request("/shifts?pageSize=500");
  assert.equal(sizeInvalid.status, 400);

  const activeInvalid = await request("/shifts?isActive=not_boolean");
  assert.equal(activeInvalid.status, 400);
});

test("SHIFT-02: Client truyền tenantId trong query bị từ chối với 400", async () => {
  const res = await request("/shifts?tenantId=other");
  assert.equal(res.status, 400);
});

// ==========================================
// SHIFT-03: API Tạo và Cập nhật ca làm việc
// ==========================================
test("SHIFT-03: Tạo ca làm việc thành công và tự động gán tenantId", async () => {
  const res = await request("/shifts", {
    method: "POST",
    body: {
      code: "HC",
      title: "Ca Hành Chính Chuẩn",
      description: "Ca làm việc 8 tiếng",
      startTime: "08:00",
      endTime: "17:00",
      breakMinutes: 60,
      lateGraceMinutes: 15,
      earlyLeaveGraceMinutes: 10,
      standardUnits: 1,
      isActive: true,
    },
  });

  assert.equal(res.status, 201);
  assert.ok(res.body.id);
  assert.equal(res.body.tenantId, testTenant);
  assert.equal(res.body.code, "HC");
  assert.equal(res.body.title, "Ca Hành Chính Chuẩn");
  assert.equal(res.body.startTime, "08:00");
  assert.equal(res.body.endTime, "17:00");
  assert.equal(res.body.breakMinutes, 60);
  assert.equal(res.body.standardUnits, 1);
  assert.equal(res.body.version, 1);
  assert.ok(res.body.createdAt);
  assert.ok(res.body.updatedAt);
});

test("SHIFT-03: Tạo ca làm qua đêm (endDayOffset = 1)", async () => {
  const res = await request("/shifts", {
    method: "POST",
    body: {
      code: "DEM",
      title: "Ca trực đêm",
      startTime: "22:00",
      endTime: "06:00",
      endDayOffset: 1,
      breakMinutes: 60,
      standardUnits: 1.5,
    },
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.endDayOffset, 1);
  assert.equal(res.body.standardUnits, 1.5);
});

test("SHIFT-03: Thiếu trường bắt buộc bị từ chối với 400", async () => {
  const res = await request("/shifts", {
    method: "POST",
    body: {
      description: "Ca thiếu trường",
    },
  });
  assert.equal(res.status, 400);
});

test("SHIFT-03: Giờ kết thúc <= giờ bắt đầu đối với ca trong ngày bị từ chối 400", async () => {
  const res = await request("/shifts", {
    method: "POST",
    body: {
      code: "SAI-GIO",
      title: "Ca sai giờ",
      startTime: "17:00",
      endTime: "08:00",
      endDayOffset: 0,
    },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /kết thúc phải sau thời gian bắt đầu/);
});

test("SHIFT-03: Thời gian nghỉ >= tổng thời lượng ca bị từ chối 400", async () => {
  const res = await request("/shifts", {
    method: "POST",
    body: {
      code: "SAI-NGHI",
      title: "Ca nghỉ quá dài",
      startTime: "08:00",
      endTime: "10:00",
      breakMinutes: 120,
    },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /nghỉ giữa ca phải nhỏ hơn tổng thời lượng/);
});

test("SHIFT-03: Client truyền tenantId trong body bị từ chối 400", async () => {
  const res = await request("/shifts", {
    method: "POST",
    body: {
      code: "TEST-TENANT",
      title: "Ca test",
      startTime: "08:00",
      endTime: "17:00",
      tenantId: "client-supplied-tenant",
    },
  });
  assert.equal(res.status, 400);
});

test("SHIFT-03: Trùng mã ca (codeKey) trong cùng tenant bị từ chối 409", async () => {
  await request("/shifts", {
    method: "POST",
    body: {
      code: "TRUNG-MA",
      title: "Ca lần 1",
      startTime: "08:00",
      endTime: "12:00",
    },
  });

  const dup = await request("/shifts", {
    method: "POST",
    body: {
      code: "trung-ma",
      title: "Ca lần 2",
      startTime: "13:00",
      endTime: "17:00",
    },
  });

  assert.equal(dup.status, 409);
});

test("SHIFT-03: Cập nhật ca làm việc thành công", async () => {
  const created = await request("/shifts", {
    method: "POST",
    body: {
      code: "UPDATE-ME",
      title: "Tên ban đầu",
      startTime: "08:00",
      endTime: "16:00",
      standardUnits: 1,
    },
  });

  const shiftId = created.body.id;
  const version = created.body.version;

  const updated = await request(`/shifts/${shiftId}`, {
    method: "PATCH",
    body: {
      title: "Tên sau khi sửa",
      endTime: "17:00",
      breakMinutes: 45,
      version,
    },
  });

  assert.equal(updated.status, 200);
  assert.equal(updated.body.title, "Tên sau khi sửa");
  assert.equal(updated.body.endTime, "17:00");
  assert.equal(updated.body.breakMinutes, 45);
  assert.equal(updated.body.version, version + 1);
});

test("SHIFT-03: Cập nhật thất bại khi sai version (Optimistic locking 409)", async () => {
  const created = await request("/shifts", {
    method: "POST",
    body: {
      code: "VERSION-LOCK",
      title: "Kiểm tra version",
      startTime: "08:00",
      endTime: "17:00",
    },
  });

  const shiftId = created.body.id;

  const failedUpdate = await request(`/shifts/${shiftId}`, {
    method: "PATCH",
    body: {
      title: "Sửa sai version",
      version: 999,
    },
  });

  assert.equal(failedUpdate.status, 409);
});

test("SHIFT-03: Cập nhật ca không tồn tại trả về 404", async () => {
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const res = await request(`/shifts/${fakeId}`, {
    method: "PATCH",
    body: {
      title: "Không tìm thấy",
      version: 1,
    },
  });
  assert.equal(res.status, 404);
});

test("SHIFT-03: Không thể cập nhật ca làm của tenant khác (404)", async () => {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  const insertRes = await client.query(`
    INSERT INTO "hr_shifts_schedules"."shifts" (
      "id", "tenantId", "code", "codeKey", "title", "description",
      "startTime", "endTime", "endDayOffset", "breakMinutes",
      "lateGraceMinutes", "earlyLeaveGraceMinutes", "standardUnits",
      "isActive", "version", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), '${otherTenant}', 'CA-OTHER-2', 'CA-OTHER-2', 'Ca tenant khác', '',
      '1970-01-01 08:00:00', '1970-01-01 17:00:00', 0, 60,
      15, 15, 1.00, true, 1, NOW(), NOW()
    ) RETURNING id;
  `);
  await client.end();

  const otherId = insertRes.rows[0].id;

  const res = await request(`/shifts/${otherId}`, {
    method: "PATCH",
    body: {
      title: "Cố tình sửa ca tenant khác",
      version: 1,
    },
  });

  assert.equal(res.status, 404);
});

test("SHIFT-03: Lấy chi tiết ca làm việc (GET /shifts/:id)", async () => {
  const created = await request("/shifts", {
    method: "POST",
    body: {
      code: "CHI-TIET",
      title: "Xem chi tiết ca",
      startTime: "09:00",
      endTime: "18:00",
    },
  });

  const res = await request(`/shifts/${created.body.id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.id, created.body.id);
  assert.equal(res.body.code, "CHI-TIET");
});

// ==========================================
// SHIFT-04: API Xóa / Vô hiệu hóa ca làm việc
// ==========================================
test("SHIFT-04: Xóa ca chưa có lịch phân công -> bản ghi bị xóa vật lý (204 No Content)", async () => {
  const created = await request("/shifts", {
    method: "POST",
    body: {
      code: "HARD-DEL",
      title: "Ca chưa có lịch",
      startTime: "08:00",
      endTime: "17:00",
    },
  });
  const shiftId = created.body.id;

  // Thực hiện DELETE
  const delRes = await request(`/shifts/${shiftId}`, { method: "DELETE" });
  assert.equal(delRes.status, 204);

  // Kiểm tra ca không còn tồn tại qua GET
  const getRes = await request(`/shifts/${shiftId}`);
  assert.equal(getRes.status, 404);

  // Kiểm tra trực tiếp trong PostgreSQL
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  const dbRes = await client.query(
    'SELECT * FROM "hr_shifts_schedules"."shifts" WHERE "id" = $1',
    [shiftId],
  );
  await client.end();
  assert.equal(dbRes.rows.length, 0);
});

test("SHIFT-04: Xóa ca đã có lịch phân công -> bản ghi vẫn tồn tại, chuyển isActive = false (soft delete)", async () => {
  const created = await request("/shifts", {
    method: "POST",
    body: {
      code: "SOFT-DEL",
      title: "Ca đã có lịch",
      startTime: "08:00",
      endTime: "17:00",
      isActive: true,
    },
  });
  const shiftId = created.body.id;

  // Phân lịch cho ca này
  const scheduleId = await createSchedule(
    testTenant,
    shiftId,
    "Lịch ca ngày 4/11",
  );

  // Thực hiện DELETE
  const delRes = await request(`/shifts/${shiftId}`, { method: "DELETE" });
  assert.equal(delRes.status, 204);

  // Kiểm tra ca vẫn tồn tại qua GET nhưng isActive = false
  const getRes = await request(`/shifts/${shiftId}`);
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.id, shiftId);
  assert.equal(getRes.body.isActive, false);

  // Kiểm tra bản ghi lịch phân công vẫn còn nguyên vẹn
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  const schedRes = await client.query(
    'SELECT * FROM "hr_shifts_schedules"."shift_schedules" WHERE "id" = $1',
    [scheduleId],
  );
  await client.end();
  assert.equal(schedRes.rows.length, 1);
  assert.equal(schedRes.rows[0].shiftId, shiftId);
});

test("SHIFT-04: Sau khi vô hiệu hóa, các bản ghi HrShiftSchedule vẫn còn nguyên", async () => {
  const created = await request("/shifts", {
    method: "POST",
    body: {
      code: "KEEP-SCHED",
      title: "Ca có nhiều lịch",
      startTime: "08:00",
      endTime: "17:00",
    },
  });
  const shiftId = created.body.id;

  const s1 = await createSchedule(testTenant, shiftId, "Lịch ca 1");
  const s2 = await createSchedule(testTenant, shiftId, "Lịch ca 2");

  const delRes = await request(`/shifts/${shiftId}`, { method: "DELETE" });
  assert.equal(delRes.status, 204);

  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  const scheds = await client.query(
    'SELECT * FROM "hr_shifts_schedules"."shift_schedules" WHERE "shiftId" = $1',
    [shiftId],
  );
  await client.end();
  assert.equal(scheds.rows.length, 2);
  const ids = scheds.rows.map((r) => r.id);
  assert.ok(ids.includes(s1));
  assert.ok(ids.includes(s2));
});

test("SHIFT-04: Gọi DELETE lần hai với ca đã vô hiệu hóa và có lịch -> xử lý idempotent", async () => {
  const created = await request("/shifts", {
    method: "POST",
    body: {
      code: "IDEMPOTENT",
      title: "Ca kiểm tra idempotent",
      startTime: "08:00",
      endTime: "17:00",
    },
  });
  const shiftId = created.body.id;

  await createSchedule(testTenant, shiftId, "Lịch phân ca");

  // Xóa lần 1
  const del1 = await request(`/shifts/${shiftId}`, { method: "DELETE" });
  assert.equal(del1.status, 204);

  // Xóa lần 2
  const del2 = await request(`/shifts/${shiftId}`, { method: "DELETE" });
  assert.equal(del2.status, 204);

  // Trạng thái vẫn là isActive = false
  const getRes = await request(`/shifts/${shiftId}`);
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.isActive, false);
});

test("SHIFT-04: ID không tồn tại -> 404 Not Found", async () => {
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const res = await request(`/shifts/${fakeId}`, { method: "DELETE" });
  assert.equal(res.status, 404);
});

test("SHIFT-04: Ca thuộc tenant khác -> 404 Not Found, không thay đổi dữ liệu", async () => {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  const insertRes = await client.query(`
    INSERT INTO "hr_shifts_schedules"."shifts" (
      "id", "tenantId", "code", "codeKey", "title", "description",
      "startTime", "endTime", "endDayOffset", "breakMinutes",
      "lateGraceMinutes", "earlyLeaveGraceMinutes", "standardUnits",
      "isActive", "version", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), '${otherTenant}', 'CA-OTHER-DEL', 'CA-OTHER-DEL', 'Ca tenant khác', '',
      '1970-01-01 08:00:00', '1970-01-01 17:00:00', 0, 60,
      15, 15, 1.00, true, 1, NOW(), NOW()
    ) RETURNING id;
  `);
  await client.end();

  const otherId = insertRes.rows[0].id;

  // Cố xóa bằng default tenant
  const res = await request(`/shifts/${otherId}`, { method: "DELETE" });
  assert.equal(res.status, 404);

  // Kiểm tra ca của other tenant vẫn còn nguyên vẹn trong DB
  const client2 = new Client({ connectionString: dbUrl });
  await client2.connect();
  const checkRes = await client2.query(
    'SELECT * FROM "hr_shifts_schedules"."shifts" WHERE "id" = $1',
    [otherId],
  );
  await client2.end();
  assert.equal(checkRes.rows.length, 1);
  assert.equal(checkRes.rows[0].code, "CA-OTHER-DEL");
});

test("SHIFT-04: Thiếu DEFAULT_TENANT_ID -> trả về lỗi cấu hình 500", async () => {
  delete process.env.DEFAULT_TENANT_ID;
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const res = await request(`/shifts/${fakeId}`, { method: "DELETE" });
  assert.equal(res.status, 500);
  assert.match(res.body.message, /DEFAULT_TENANT_ID/);
});

test("SHIFT-04: ID không đúng định dạng UUID -> 400 Bad Request", async () => {
  const res = await request("/shifts/not-a-valid-uuid", { method: "DELETE" });
  assert.equal(res.status, 400);
});

// ==========================================
// SHIFT-05: API Phân công ca làm việc (Shift Assignments)
// ==========================================

test("SHIFT-05: 1. Phân công ca hợp lệ thành công (201 Created)", async () => {
  const createdShift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-HC",
      title: "Ca hành chính",
      description: "Ca từ 8h đến 17h",
      startTime: "08:00",
      endTime: "17:00",
      breakMinutes: 60,
      standardUnits: 1,
    },
  });
  const shiftId = createdShift.body.id;

  const res = await request(`/shifts/${shiftId}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-01",
      date: "2026-11-10",
      workMode: "AT_OFFICE",
      workLocation: "Tầng 5",
    },
  });

  assert.equal(res.status, 201);
  assert.equal(res.body.shiftId, shiftId);
  assert.equal(res.body.tenantId, testTenant);
  assert.equal(res.body.assigneeId, "user-01");
  assert.equal(res.body.startDate, "2026-11-10");
  assert.equal(res.body.endDate, "2026-11-10");
  assert.equal(res.body.startTime, "08:00");
  assert.equal(res.body.endTime, "17:00");
  assert.equal(res.body.title, "Ca hành chính");
  assert.equal(res.body.description, "Ca từ 8h đến 17h");
  assert.equal(res.body.workMode, "AT_OFFICE");
  assert.equal(res.body.workLocation, "Tầng 5");
  assert.equal(res.body.status, "todo");
  assert.equal(res.body.standardUnits, 1);
  assert.equal(res.body.allDay, false);
});

test("SHIFT-05: 2. Ca không tồn tại trả về 404", async () => {
  const fakeId = "00000000-0000-0000-0000-000000000000";
  const res = await request(`/shifts/${fakeId}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-01",
      date: "2026-11-10",
    },
  });
  assert.equal(res.status, 404);
  assert.match(res.body.message, /Không tìm thấy/);
});

test("SHIFT-05: 3. Ca thuộc tenant khác trả về 404", async () => {
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  const insertRes = await client.query(`
    INSERT INTO "hr_shifts_schedules"."shifts" (
      "id", "tenantId", "code", "codeKey", "title", "description",
      "startTime", "endTime", "endDayOffset", "breakMinutes",
      "lateGraceMinutes", "earlyLeaveGraceMinutes", "standardUnits",
      "isActive", "version", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), '${otherTenant}', 'CA-OTHER-ASS', 'CA-OTHER-ASS', 'Ca của other tenant', '',
      '1970-01-01 08:00:00', '1970-01-01 17:00:00', 0, 60,
      15, 15, 1.00, true, 1, NOW(), NOW()
    ) RETURNING id;
  `);
  await client.end();
  const otherShiftId = insertRes.rows[0].id;

  const res = await request(`/shifts/${otherShiftId}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-01",
      date: "2026-11-10",
    },
  });
  assert.equal(res.status, 404);
});

test("SHIFT-05: 4. Ca đã vô hiệu hóa không thể được phân công (400 Bad Request)", async () => {
  const createdShift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-INACTIVE",
      title: "Ca vô hiệu hóa",
      startTime: "08:00",
      endTime: "17:00",
      isActive: false,
    },
  });
  const shiftId = createdShift.body.id;

  const res = await request(`/shifts/${shiftId}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-01",
      date: "2026-11-10",
    },
  });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /vô hiệu hóa/);
});

test("SHIFT-05: 5. Thiếu thông tin bắt buộc trả về 400", async () => {
  const createdShift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-THIEU-TT",
      title: "Ca kiểm tra thiếu thông tin",
      startTime: "08:00",
      endTime: "17:00",
    },
  });
  const shiftId = createdShift.body.id;

  // Thiếu cả date lẫn startDate
  const res1 = await request(`/shifts/${shiftId}/assignments`, {
    method: "POST",
    body: { assigneeId: "user-01" },
  });
  assert.equal(res1.status, 400);

  // Thiếu cả assigneeId lẫn employeeId
  const res2 = await request(`/shifts/${shiftId}/assignments`, {
    method: "POST",
    body: { date: "2026-11-10" },
  });
  assert.equal(res2.status, 400);
});

test("SHIFT-05: 6. Dữ liệu đầu vào sai định dạng trả về 400", async () => {
  const createdShift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-SAI-DF",
      title: "Ca kiểm tra sai định dạng",
      startTime: "08:00",
      endTime: "17:00",
    },
  });
  const shiftId = createdShift.body.id;

  // Sai định dạng ngày
  const res1 = await request(`/shifts/${shiftId}/assignments`, {
    method: "POST",
    body: { assigneeId: "user-01", date: "2026-13-45" },
  });
  assert.equal(res1.status, 400);

  // ID ca không phải UUID
  const res2 = await request("/shifts/not-a-uuid/assignments", {
    method: "POST",
    body: { assigneeId: "user-01", date: "2026-11-10" },
  });
  assert.equal(res2.status, 400);

  // Client truyền tenantId trong body
  const res3 = await request(`/shifts/${shiftId}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-01",
      date: "2026-11-10",
      tenantId: "hack-tenant",
    },
  });
  assert.equal(res3.status, 400);
});

test("SHIFT-05: 7. Phân công trùng lặp bị từ chối (409 Conflict)", async () => {
  const createdShift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-TRUNG",
      title: "Ca kiểm tra trùng",
      startTime: "08:00",
      endTime: "12:00",
    },
  });
  const shiftId = createdShift.body.id;

  // Lần 1: thành công
  const res1 = await request(`/shifts/${shiftId}/assignments`, {
    method: "POST",
    body: { assigneeId: "user-01", date: "2026-11-10" },
  });
  assert.equal(res1.status, 201);

  // Lần 2: trùng lặp hoàn toàn -> 409 Conflict
  const res2 = await request(`/shifts/${shiftId}/assignments`, {
    method: "POST",
    body: { assigneeId: "user-01", date: "2026-11-10" },
  });
  assert.equal(res2.status, 409);
  assert.match(res2.body.message, /khoảng thời gian/);
});

test("SHIFT-05: 8. Nhân viên có lịch chồng lấn bị từ chối (409 Conflict)", async () => {
  const shift1 = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-S1",
      title: "Ca 1",
      startTime: "08:00",
      endTime: "12:00",
    },
  });
  const shift2 = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-S2",
      title: "Ca 2 chồng lấn",
      startTime: "10:00",
      endTime: "14:00",
    },
  });

  // Phân công Ca 1 cho user-01 ngày 2026-11-10
  const res1 = await request(`/shifts/${shift1.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: "user-01", date: "2026-11-10" },
  });
  assert.equal(res1.status, 201);

  // Phân công Ca 2 (10:00-14:00) cho cùng user-01 ngày 2026-11-10 -> 409 Conflict
  const res2 = await request(`/shifts/${shift2.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: "user-01", date: "2026-11-10" },
  });
  assert.equal(res2.status, 409);
  assert.match(res2.body.message, /khoảng thời gian/);
});

test("SHIFT-05: 9. Nhân viên có lịch không chồng lấn được phép phân công (201 Created)", async () => {
  const shiftMorning = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-SANG-9",
      title: "Ca sáng",
      startTime: "08:00",
      endTime: "12:00",
    },
  });
  const shiftAfternoon = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-CHIEU-9",
      title: "Ca chiều tiếp giáp",
      startTime: "12:00",
      endTime: "16:00",
    },
  });
  const shiftEvening = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-TOI-9",
      title: "Ca tối cách biệt",
      startTime: "17:00",
      endTime: "21:00",
    },
  });

  // Ca sáng (08:00 - 12:00)
  const res1 = await request(`/shifts/${shiftMorning.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: "user-02", date: "2026-11-10" },
  });
  assert.equal(res1.status, 201);

  // Ca chiều tiếp giáp (12:00 - 16:00) -> Allowed!
  const res2 = await request(`/shifts/${shiftAfternoon.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: "user-02", date: "2026-11-10" },
  });
  assert.equal(res2.status, 201);

  // Ca tối cách biệt (17:00 - 21:00) -> Allowed!
  const res3 = await request(`/shifts/${shiftEvening.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: "user-02", date: "2026-11-10" },
  });
  assert.equal(res3.status, 201);
});

test("SHIFT-05: 10. Kiểm tra ca qua đêm (endDayOffset = 1)", async () => {
  const nightShift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-DEM-10",
      title: "Ca đêm qua ngày",
      startTime: "22:00",
      endTime: "06:00",
      endDayOffset: 1,
    },
  });
  const morningShift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-SANG-10",
      title: "Ca sáng tiếp giáp",
      startTime: "06:00",
      endTime: "14:00",
    },
  });
  const earlyMorningShift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-SOM-10",
      title: "Ca sáng sớm chồng lấn",
      startTime: "05:00",
      endTime: "13:00",
    },
  });

  // Phân công ca đêm ngày 2026-11-10 (kết thúc 06:00 ngày 2026-11-11)
  const resNight = await request(`/shifts/${nightShift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: "user-03", date: "2026-11-10" },
  });
  assert.equal(resNight.status, 201);
  assert.equal(resNight.body.startDate, "2026-11-10");
  assert.equal(resNight.body.endDate, "2026-11-11");

  // Ca sớm (05:00 - 13:00) ngày 2026-11-11 chồng lấn từ 05:00 - 06:00 -> 409 Conflict
  const resConflict = await request(
    `/shifts/${earlyMorningShift.body.id}/assignments`,
    {
      method: "POST",
      body: { assigneeId: "user-03", date: "2026-11-11" },
    },
  );
  assert.equal(resConflict.status, 409);

  // Ca sáng (06:00 - 14:00) ngày 2026-11-11 tiếp giáp ngay 06:00 -> Allowed (201)
  const resAdjacent = await request(
    `/shifts/${morningShift.body.id}/assignments`,
    {
      method: "POST",
      body: { assigneeId: "user-03", date: "2026-11-11" },
    },
  );
  assert.equal(resAdjacent.status, 201);
});

test("SHIFT-05: 11. Không thể truy cập hoặc thao tác dữ liệu tenant khác (Tenant Isolation)", async () => {
  const shift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-TENANT-11",
      title: "Ca kiểm tra tenant",
      startTime: "08:00",
      endTime: "17:00",
    },
  });
  const shiftId = shift.body.id;

  // Tạo một lịch phân công ở other-tenant cho cùng user-04 cùng ngày giờ
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  await client.query(`
    INSERT INTO "hr_shifts_schedules"."shift_schedules" (
      "id", "tenantId", "title", "description",
      "startDate", "endDate", "startTime", "endTime", "timeZone",
      "allDay", "status", "priority", "assigneeId", "workMode",
      "workLocation", "breakMinutes", "lateGraceMinutes", "earlyLeaveGraceMinutes",
      "standardUnits", "version", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), '${otherTenant}', 'Lịch tenant khác', '',
      '2026-11-10', '2026-11-10', '1970-01-01 08:00:00', '1970-01-01 17:00:00', 'Asia/Ho_Chi_Minh',
      false, 'todo', 'medium', 'user-04', 'AT_OFFICE',
      '', 60, 15, 15,
      1.00, 1, NOW(), NOW()
    );
  `);
  await client.end();

  // Phân công ở default tenant cho user-04 phải thành công vì hoàn toàn độc lập với other-tenant
  const res = await request(`/shifts/${shiftId}/assignments`, {
    method: "POST",
    body: { assigneeId: "user-04", date: "2026-11-10" },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.tenantId, testTenant);
});

test("SHIFT-05: 12. Thiếu DEFAULT_TENANT_ID xử lý đúng lỗi cấu hình (500)", async () => {
  const shift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-ENV-12",
      title: "Ca kiểm tra thiếu ENV",
      startTime: "08:00",
      endTime: "17:00",
    },
  });
  const shiftId = shift.body.id;

  delete process.env.DEFAULT_TENANT_ID;

  const res = await request(`/shifts/${shiftId}/assignments`, {
    method: "POST",
    body: { assigneeId: "user-01", date: "2026-11-10" },
  });
  assert.equal(res.status, 500);
  assert.match(res.body.message, /DEFAULT_TENANT_ID/);
});

test("SHIFT-05: 13. Hai request đồng thời tạo phân công xung đột không thể cùng thành công", async () => {
  const shift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-RACE-13",
      title: "Ca kiểm tra concurrency race",
      startTime: "08:00",
      endTime: "17:00",
    },
  });
  const shiftId = shift.body.id;

  // Gửi 2 request đồng thời cho cùng 1 nhân viên cùng 1 ngày
  const [res1, res2] = await Promise.all([
    request(`/shifts/${shiftId}/assignments`, {
      method: "POST",
      body: { assigneeId: "user-concurrent", date: "2026-11-15" },
    }),
    request(`/shifts/${shiftId}/assignments`, {
      method: "POST",
      body: { assigneeId: "user-concurrent", date: "2026-11-15" },
    }),
  ]);

  const statuses = [res1.status, res2.status].sort();
  // Một request phải thành công (201), request kia phải bị từ chối với 409
  assert.equal(statuses[0], 201);
  assert.equal(statuses[1], 409);

  // Xác nhận trong database chỉ có duy nhất 1 bản ghi được tạo
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  const dbCheck = await client.query(
    'SELECT count(*) FROM "hr_shifts_schedules"."shift_schedules" WHERE "tenantId" = $1 AND "assigneeId" = $2 AND "startDate" = $3',
    [testTenant, "user-concurrent", "2026-11-15"],
  );
  await client.end();
  assert.equal(Number(dbCheck.rows[0].count), 1);
});

test("SHIFT-05: 14. Các trường hợp biên liên quan đến trạng thái phân công (cancelled, archived)", async () => {
  const shift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-BIEN-14",
      title: "Ca kiểm tra trạng thái biên",
      startTime: "08:00",
      endTime: "17:00",
    },
  });
  const shiftId = shift.body.id;

  // 14a. Tạo 1 lịch đã bị cancelled trong DB
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  await client.query(`
    INSERT INTO "hr_shifts_schedules"."shift_schedules" (
      "id", "tenantId", "title", "description",
      "startDate", "endDate", "startTime", "endTime", "timeZone",
      "allDay", "status", "priority", "assigneeId", "workMode",
      "workLocation", "breakMinutes", "lateGraceMinutes", "earlyLeaveGraceMinutes",
      "standardUnits", "version", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), '${testTenant}', 'Lịch đã hủy', '',
      '2026-11-20', '2026-11-20', '1970-01-01 08:00:00', '1970-01-01 17:00:00', 'Asia/Ho_Chi_Minh',
      false, 'cancelled', 'medium', 'user-status', 'AT_OFFICE',
      '', 60, 15, 15,
      1.00, 1, NOW(), NOW()
    );
  `);
  await client.end();

  // Phân công trùng giờ với lịch đã cancelled -> Phải thành công (201)
  const resCancelled = await request(`/shifts/${shiftId}/assignments`, {
    method: "POST",
    body: { assigneeId: "user-status", date: "2026-11-20" },
  });
  assert.equal(resCancelled.status, 201);

  // 14b. Tạo 1 lịch đã bị archived (archivedAt != null) trong DB
  const client2 = new Client({ connectionString: dbUrl });
  await client2.connect();
  await client2.query(`
    INSERT INTO "hr_shifts_schedules"."shift_schedules" (
      "id", "tenantId", "title", "description",
      "startDate", "endDate", "startTime", "endTime", "timeZone",
      "allDay", "status", "priority", "assigneeId", "workMode",
      "workLocation", "breakMinutes", "lateGraceMinutes", "earlyLeaveGraceMinutes",
      "standardUnits", "archivedAt", "version", "createdAt", "updatedAt"
    ) VALUES (
      gen_random_uuid(), '${testTenant}', 'Lịch đã lưu trữ', '',
      '2026-11-21', '2026-11-21', '1970-01-01 08:00:00', '1970-01-01 17:00:00', 'Asia/Ho_Chi_Minh',
      false, 'completed', 'medium', 'user-status', 'AT_OFFICE',
      '', 60, 15, 15,
      1.00, NOW(), 1, NOW(), NOW()
    );
  `);
  await client2.end();

  // Phân công trùng giờ với lịch đã archived -> Phải thành công (201)
  const resArchived = await request(`/shifts/${shiftId}/assignments`, {
    method: "POST",
    body: { assigneeId: "user-status", date: "2026-11-21" },
  });
  assert.equal(resArchived.status, 201);
});
