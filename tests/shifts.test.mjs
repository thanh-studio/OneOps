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

// ==========================================
// SHIFT-05 (FIX REVIEW): TimeZone, Alias, Seconds Precision Tests
// ==========================================

test("SHIFT-05 (FIX): Alias assigneeId và employeeId cùng gửi với giá trị giống nhau -> 201 Created", async () => {
  const shift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-ALIAS-1",
      title: "Ca test alias 1",
      startTime: "08:00",
      endTime: "17:00",
    },
  });
  const res = await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-alias",
      employeeId: "user-alias",
      date: "2026-11-25",
    },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.assigneeId, "user-alias");
});

test("SHIFT-05 (FIX): Alias assigneeId và employeeId khác nhau -> 400 Bad Request", async () => {
  const shift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-ALIAS-2",
      title: "Ca test alias 2",
      startTime: "08:00",
      endTime: "17:00",
    },
  });
  const res = await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-alias-A",
      employeeId: "user-alias-B",
      date: "2026-11-25",
    },
  });
  assert.equal(res.status, 400);
  assert.ok(JSON.stringify(res.body).includes("khác nhau"));
});

test("SHIFT-05 (FIX): Alias date và startDate cùng gửi với giá trị giống nhau -> 201 Created", async () => {
  const shift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-ALIAS-3",
      title: "Ca test alias 3",
      startTime: "08:00",
      endTime: "17:00",
    },
  });
  const res = await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-alias-3",
      date: "2026-11-25",
      startDate: "2026-11-25",
    },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.startDate, "2026-11-25");
});

test("SHIFT-05 (FIX): Alias date và startDate khác nhau -> 400 Bad Request", async () => {
  const shift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-ALIAS-4",
      title: "Ca test alias 4",
      startTime: "08:00",
      endTime: "17:00",
    },
  });
  const res = await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-alias-4",
      date: "2026-11-25",
      startDate: "2026-11-26",
    },
  });
  assert.equal(res.status, 400);
  assert.ok(JSON.stringify(res.body).includes("khác nhau"));
});

test("SHIFT-05 (FIX): TimeZone không hợp lệ -> 400 Bad Request", async () => {
  const shift = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-TZ-INVALID",
      title: "Ca test timezone invalid",
      startTime: "08:00",
      endTime: "17:00",
    },
  });
  const res = await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-tz",
      date: "2026-11-25",
      timeZone: "Invalid/Not_A_Timezone",
    },
  });
  assert.equal(res.status, 400);
  assert.ok(JSON.stringify(res.body).includes("Múi giờ"));
});

test("SHIFT-05 (FIX): Hai lịch cùng thời điểm thực tế nhưng khác múi giờ -> Bị từ chối 409 Conflict", async () => {
  // Ca 1: 08:00 - 12:00 (Asia/Ho_Chi_Minh, UTC+7) -> 01:00 - 05:00 UTC
  const shiftVN = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-VN-TZ",
      title: "Ca Việt Nam",
      startTime: "08:00",
      endTime: "12:00",
    },
  });
  // Ca 2: 10:00 - 14:00 (Asia/Tokyo, UTC+9) -> 01:00 - 05:00 UTC
  const shiftTokyo = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-TOKYO-TZ",
      title: "Ca Tokyo",
      startTime: "10:00",
      endTime: "14:00",
    },
  });

  // Phân công Ca VN
  const res1 = await request(`/shifts/${shiftVN.body.id}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-multitz",
      date: "2026-11-25",
      timeZone: "Asia/Ho_Chi_Minh",
    },
  });
  assert.equal(res1.status, 201);

  // Phân công Ca Tokyo cho cùng người: dù giờ địa phương là 10h-14h nhưng cùng thời điểm 01h-05h UTC -> 409 Conflict!
  const res2 = await request(`/shifts/${shiftTokyo.body.id}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-multitz",
      date: "2026-11-25",
      timeZone: "Asia/Tokyo",
    },
  });
  assert.equal(res2.status, 409);
  assert.match(res2.body.message, /khoảng thời gian/);
});

test("SHIFT-05 (FIX): Hai lịch có giờ địa phương giống nhau nhưng thời điểm UTC khác nhau -> 201 Created", async () => {
  // Ca VN: 08:00 - 12:00 (Asia/Ho_Chi_Minh, UTC+7) -> 01:00 - 05:00 UTC
  const shiftVN = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-DIFF-UTC-1",
      title: "Ca VN 08-12",
      startTime: "08:00",
      endTime: "12:00",
    },
  });
  // Ca UTC: 08:00 - 12:00 (UTC, UTC+0) -> 08:00 - 12:00 UTC
  const shiftUTC = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-DIFF-UTC-2",
      title: "Ca UTC 08-12",
      startTime: "08:00",
      endTime: "12:00",
    },
  });

  // Phân công Ca VN
  const res1 = await request(`/shifts/${shiftVN.body.id}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-difftz",
      date: "2026-11-25",
      timeZone: "Asia/Ho_Chi_Minh",
    },
  });
  assert.equal(res1.status, 201);

  // Phân công Ca UTC: Cùng là 08:00 địa phương nhưng lệch nhau 7 tiếng UTC -> Không xung đột (201)!
  const res2 = await request(`/shifts/${shiftUTC.body.id}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-difftz",
      date: "2026-11-25",
      timeZone: "UTC",
    },
  });
  assert.equal(res2.status, 201);
});

test("SHIFT-05 (FIX): Phân công với múi giờ có DST (Daylight Saving Time)", async () => {
  const shiftNY = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-NY-DST",
      title: "Ca New York",
      startTime: "09:00",
      endTime: "17:00",
    },
  });

  // Phân công vào mùa hè (EDT, UTC-4)
  const resSummer = await request(`/shifts/${shiftNY.body.id}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-dst",
      date: "2026-07-15",
      timeZone: "America/New_York",
    },
  });
  assert.equal(resSummer.status, 201);

  // Phân công vào mùa đông (EST, UTC-5)
  const resWinter = await request(`/shifts/${shiftNY.body.id}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-dst",
      date: "2026-12-15",
      timeZone: "America/New_York",
    },
  });
  assert.equal(resWinter.status, 201);
});

test("SHIFT-05 (FIX): Giữ nguyên độ chính xác giây (HH:mm:ss)", async () => {
  // Ca có giây: 08:30:15 đến 17:00:45
  const shiftWithSeconds = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-SECONDS-PREC",
      title: "Ca chính xác từng giây",
      startTime: "08:30:15",
      endTime: "17:00:45",
    },
  });
  assert.equal(shiftWithSeconds.status, 201);
  assert.equal(shiftWithSeconds.body.startTime, "08:30:15");
  assert.equal(shiftWithSeconds.body.endTime, "17:00:45");

  // Phân công ca có giây
  const res = await request(`/shifts/${shiftWithSeconds.body.id}/assignments`, {
    method: "POST",
    body: {
      assigneeId: "user-seconds",
      date: "2026-11-25",
    },
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.startTime, "08:30:15");
  assert.equal(res.body.endTime, "17:00:45");

  // Ca tiếp giáp đúng giây 17:00:45 -> 20:00:00
  const shiftAdjacentSeconds = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-SECONDS-ADJ",
      title: "Ca tiếp giáp giây",
      startTime: "17:00:45",
      endTime: "20:00:00",
    },
  });
  const resAdj = await request(
    `/shifts/${shiftAdjacentSeconds.body.id}/assignments`,
    {
      method: "POST",
      body: {
        assigneeId: "user-seconds",
        date: "2026-11-25",
      },
    },
  );
  assert.equal(resAdj.status, 201);

  // Ca chồng lấn 1 giây (17:00:44 -> 20:00:00) -> 409 Conflict!
  const shiftOverlapSeconds = await request("/shifts", {
    method: "POST",
    body: {
      code: "CA-SECONDS-OVL",
      title: "Ca chồng lấn 1 giây",
      startTime: "17:00:44",
      endTime: "20:00:00",
    },
  });
  const resOvl = await request(
    `/shifts/${shiftOverlapSeconds.body.id}/assignments`,
    {
      method: "POST",
      body: {
        assigneeId: "user-seconds",
        date: "2026-11-25",
      },
    },
  );
  assert.equal(resOvl.status, 409);
});

// ========================================================
// SHIFT-06 TESTS: API TRUY VẤN LỊCH PHÂN CA (GET /shifts/schedules)
// ========================================================

test("SHIFT-06: 1. Truy vấn lịch phân ca thành công với khoảng ngày hợp lệ (200 OK)", async () => {
  const code = `CA-Q1-${Date.now()}`;
  const shift = await request("/shifts", {
    method: "POST",
    body: {
      code,
      title: "Ca truy vấn chuẩn",
      startTime: "08:30",
      endTime: "17:30",
    },
  });
  assert.equal(shift.status, 201);

  const assignee = `user-q1-${Date.now()}`;
  const assign = await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: {
      assigneeId: assignee,
      date: "2026-12-05",
      workMode: "AT_OFFICE",
    },
  });
  assert.equal(assign.status, 201);

  const res = await request("/shifts/schedules?from=2026-12-01&to=2026-12-10");
  assert.equal(res.status, 200);
  assert.equal(res.body.from, "2026-12-01");
  assert.equal(res.body.to, "2026-12-10");
  assert.ok(Array.isArray(res.body.items));
  assert.ok(res.body.total >= 1);
  assert.equal(res.body.page, 1);
  assert.equal(res.body.pageSize, 100);

  const found = res.body.items.find((item) => item.id === assign.body.id);
  assert.ok(found, "Phải tìm thấy lịch vừa phân công");
  assert.equal(found.assigneeId, assignee);
  assert.equal(found.startDate, "2026-12-05");
  assert.equal(found.endDate, "2026-12-05");
  assert.equal(found.startTime, "08:30");
  assert.equal(found.endTime, "17:30");
  assert.equal(found.workMode, "AT_OFFICE");
  assert.ok(found.shift, "Phải kèm theo thông tin chi tiết của mẫu ca");
  assert.equal(found.shift.id, shift.body.id);
  assert.equal(found.shift.code, code);
});

test("SHIFT-06: 2. Khoảng ngày không có dữ liệu trả về mảng rỗng và total = 0", async () => {
  const res = await request("/shifts/schedules?from=2099-01-01&to=2099-01-31");
  assert.equal(res.status, 200);
  assert.equal(res.body.from, "2099-01-01");
  assert.equal(res.body.to, "2099-01-31");
  assert.deepEqual(res.body.items, []);
  assert.equal(res.body.total, 0);
});

test("SHIFT-06: 3. Lọc theo assigneeId và alias employeeId", async () => {
  const code = `CA-Q3-${Date.now()}`;
  const shift = await request("/shifts", {
    method: "POST",
    body: {
      code,
      title: "Ca test lọc nhân viên",
      startTime: "09:00",
      endTime: "18:00",
    },
  });

  const empA = `emp-A-${Date.now()}`;
  const empB = `emp-B-${Date.now()}`;

  await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: empA, date: "2026-12-15" },
  });
  await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: empB, date: "2026-12-15" },
  });

  // Lọc theo assigneeId
  const resA = await request(
    `/shifts/schedules?from=2026-12-01&to=2026-12-31&assigneeId=${empA}`,
  );
  assert.equal(resA.status, 200);
  assert.equal(resA.body.items.length, 1);
  assert.equal(resA.body.items[0].assigneeId, empA);

  // Lọc theo alias employeeId
  const resB = await request(
    `/shifts/schedules?from=2026-12-01&to=2026-12-31&employeeId=${empB}`,
  );
  assert.equal(resB.status, 200);
  assert.equal(resB.body.items.length, 1);
  assert.equal(resB.body.items[0].assigneeId, empB);

  // Dùng startDate/endDate alias thay cho from/to
  const resAliasDates = await request(
    `/shifts/schedules?startDate=2026-12-01&endDate=2026-12-31&assigneeId=${empA}`,
  );
  assert.equal(resAliasDates.status, 200);
  assert.equal(resAliasDates.body.from, "2026-12-01");
  assert.equal(resAliasDates.body.to, "2026-12-31");
  assert.equal(resAliasDates.body.items.length, 1);
});

test("SHIFT-06: 4. Lọc theo shiftId", async () => {
  const code1 = `CA-S1-${Date.now()}`;
  const code2 = `CA-S2-${Date.now()}`;
  const shift1 = await request("/shifts", {
    method: "POST",
    body: { code: code1, title: "Ca 1", startTime: "08:00", endTime: "12:00" },
  });
  const shift2 = await request("/shifts", {
    method: "POST",
    body: { code: code2, title: "Ca 2", startTime: "13:00", endTime: "17:00" },
  });

  const emp = `emp-s-${Date.now()}`;
  await request(`/shifts/${shift1.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: emp, date: "2026-12-20" },
  });
  await request(`/shifts/${shift2.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: emp, date: "2026-12-20" },
  });

  const res = await request(
    `/shifts/schedules?from=2026-12-01&to=2026-12-31&shiftId=${shift1.body.id}`,
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 1);
  assert.equal(res.body.items[0].shiftId, shift1.body.id);
  assert.equal(res.body.items[0].shift.code, code1);
});

test("SHIFT-06: 5. Lọc theo status và workMode", async () => {
  const code = `CA-MODE-${Date.now()}`;
  const shift = await request("/shifts", {
    method: "POST",
    body: { code, title: "Ca Mode", startTime: "08:00", endTime: "16:00" },
  });

  const empOffice = `emp-off-${Date.now()}`;
  const empRemote = `emp-rem-${Date.now()}`;

  await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: empOffice, date: "2026-12-22", workMode: "AT_OFFICE" },
  });
  await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: empRemote, date: "2026-12-22", workMode: "REMOTE" },
  });

  // Lọc workMode = REMOTE
  const resRemote = await request(
    `/shifts/schedules?from=2026-12-20&to=2026-12-25&workMode=REMOTE`,
  );
  assert.equal(resRemote.status, 200);
  const foundRemote = resRemote.body.items.find(
    (i) => i.assigneeId === empRemote,
  );
  assert.ok(foundRemote);
  assert.equal(foundRemote.workMode, "REMOTE");
  const foundOffice = resRemote.body.items.find(
    (i) => i.assigneeId === empOffice,
  );
  assert.equal(foundOffice, undefined);

  // Lọc status = todo (mặc định)
  const resTodo = await request(
    `/shifts/schedules?from=2026-12-20&to=2026-12-25&status=todo`,
  );
  assert.equal(resTodo.status, 200);
  assert.ok(resTodo.body.items.some((i) => i.assigneeId === empOffice));
});

test("SHIFT-06: 6. Kiểm tra giao thoa khoảng ngày (Boundary & Overlap range)", async () => {
  const code = `CA-BOUND-${Date.now()}`;
  const shift = await request("/shifts", {
    method: "POST",
    body: { code, title: "Ca boundary", startTime: "08:00", endTime: "17:00" },
  });

  const emp = `emp-bound-${Date.now()}`;

  // Ca 1: 2026-12-10 (trước khoảng [12-12, 12-15]) -> Không được xuất hiện
  await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: emp, date: "2026-12-10" },
  });
  // Ca 2: 2026-12-12 (đúng ngày from) -> Phải xuất hiện
  const a2 = await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: emp, date: "2026-12-12" },
  });
  // Ca 3: 2026-12-14 (giữa khoảng) -> Phải xuất hiện
  const a3 = await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: emp, date: "2026-12-14" },
  });
  // Ca 4: 2026-12-15 (đúng ngày to) -> Phải xuất hiện
  const a4 = await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: emp, date: "2026-12-15" },
  });
  // Ca 5: 2026-12-18 (sau ngày to) -> Không được xuất hiện
  await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: emp, date: "2026-12-18" },
  });

  const res = await request(
    `/shifts/schedules?from=2026-12-12&to=2026-12-15&assigneeId=${emp}`,
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 3);
  const ids = res.body.items.map((i) => i.id);
  assert.ok(ids.includes(a2.body.id));
  assert.ok(ids.includes(a3.body.id));
  assert.ok(ids.includes(a4.body.id));
});

test("SHIFT-06: 7. Ca qua đêm giao thoa ở ngày biên (Overnight shifts span)", async () => {
  const code = `CA-NIGHT-Q-${Date.now()}`;
  const shift = await request("/shifts", {
    method: "POST",
    body: {
      code,
      title: "Ca qua đêm truy vấn",
      startTime: "22:00",
      endTime: "06:00",
      endDayOffset: 1,
    },
  });

  const empNight1 = `emp-n1-${Date.now()}`;
  const empNight2 = `emp-n2-${Date.now()}`;

  // Ca bắt đầu 2026-12-19, kết thúc 2026-12-20
  // Truy vấn khoảng [2026-12-20, 2026-12-25] -> Ca này kết thúc đúng ngày from (12-20) -> Phải xuất hiện!
  const a1 = await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: empNight1, date: "2026-12-19" },
  });

  // Ca bắt đầu 2026-12-25, kết thúc 2026-12-26
  // Truy vấn khoảng [2026-12-20, 2026-12-25] -> Ca này bắt đầu đúng ngày to (12-25) -> Phải xuất hiện!
  const a2 = await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: empNight2, date: "2026-12-25" },
  });

  const res = await request("/shifts/schedules?from=2026-12-20&to=2026-12-25");
  assert.equal(res.status, 200);
  const ids = res.body.items.map((i) => i.id);
  assert.ok(
    ids.includes(a1.body.id),
    "Ca qua đêm bắt đầu hôm trước kết thúc ngày from phải được bao gồm",
  );
  assert.ok(
    ids.includes(a2.body.id),
    "Ca qua đêm bắt đầu ngày to kết thúc hôm sau phải được bao gồm",
  );
});

test("SHIFT-06: 8. Bộ lọc includeArchived (mặc định không có lịch lưu trữ)", async () => {
  const code = `CA-ARCH-${Date.now()}`;
  const shift = await request("/shifts", {
    method: "POST",
    body: { code, title: "Ca Archive", startTime: "08:00", endTime: "12:00" },
  });

  const emp = `emp-arch-${Date.now()}`;
  const assign = await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: emp, date: "2026-12-28" },
  });

  // Đánh dấu archived trực tiếp trong DB bằng Client pg
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  await client.query(
    'UPDATE "hr_shifts_schedules"."shift_schedules" SET "archivedAt" = NOW() WHERE id = $1',
    [assign.body.id],
  );
  await client.end();

  // Mặc định includeArchived = false -> Không thấy
  const resDefault = await request(
    `/shifts/schedules?from=2026-12-25&to=2026-12-30&assigneeId=${emp}`,
  );
  assert.equal(resDefault.status, 200);
  assert.equal(resDefault.body.items.length, 0);

  // includeArchived = true -> Phải thấy
  const resArchived = await request(
    `/shifts/schedules?from=2026-12-25&to=2026-12-30&assigneeId=${emp}&includeArchived=true`,
  );
  assert.equal(resArchived.status, 200);
  assert.equal(resArchived.body.items.length, 1);
  assert.equal(resArchived.body.items[0].id, assign.body.id);
});

test("SHIFT-06: 9. Phân trang và thứ tự sắp xếp thời gian (Pagination & Ordering)", async () => {
  const code = `CA-PAGE-${Date.now()}`;
  const shift = await request("/shifts", {
    method: "POST",
    body: {
      code,
      title: "Ca phân trang",
      startTime: "08:00",
      endTime: "12:00",
    },
  });

  const emp = `emp-page-${Date.now()}`;
  await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: emp, date: "2026-12-01" },
  });
  await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: emp, date: "2026-12-02" },
  });
  await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: emp, date: "2026-12-03" },
  });

  // Page 1: pageSize = 2
  const p1 = await request(
    `/shifts/schedules?from=2026-12-01&to=2026-12-05&assigneeId=${emp}&page=1&pageSize=2`,
  );
  assert.equal(p1.status, 200);
  assert.equal(p1.body.page, 1);
  assert.equal(p1.body.pageSize, 2);
  assert.equal(p1.body.total, 3);
  assert.equal(p1.body.items.length, 2);
  assert.equal(p1.body.items[0].startDate, "2026-12-01");
  assert.equal(p1.body.items[1].startDate, "2026-12-02");

  // Page 2: pageSize = 2
  const p2 = await request(
    `/shifts/schedules?from=2026-12-01&to=2026-12-05&assigneeId=${emp}&page=2&pageSize=2`,
  );
  assert.equal(p2.status, 200);
  assert.equal(p2.body.page, 2);
  assert.equal(p2.body.pageSize, 2);
  assert.equal(p2.body.total, 3);
  assert.equal(p2.body.items.length, 1);
  assert.equal(p2.body.items[0].startDate, "2026-12-03");
});

test("SHIFT-06: 10. Tenant Isolation (Không thể đọc lịch của tenant khác)", async () => {
  const code = `CA-ISO-Q-${Date.now()}`;
  const shift = await request("/shifts", {
    method: "POST",
    body: { code, title: "Ca isolation", startTime: "08:00", endTime: "17:00" },
  });

  const emp = `emp-iso-${Date.now()}`;
  const assign = await request(`/shifts/${shift.body.id}/assignments`, {
    method: "POST",
    body: { assigneeId: emp, date: "2026-12-10" },
  });

  // Tạo một ca và schedule ở otherTenant bằng API
  process.env.DEFAULT_TENANT_ID = otherTenant;
  const otherShift = await request("/shifts", {
    method: "POST",
    body: {
      code: `OTHER-${Date.now()}`,
      title: "Ca tenant khác",
      startTime: "08:00",
      endTime: "17:00",
    },
  });
  const otherAssign = await request(
    `/shifts/${otherShift.body.id}/assignments`,
    {
      method: "POST",
      body: { assigneeId: emp, date: "2026-12-10" },
    },
  );
  assert.equal(otherAssign.status, 201);

  // Đổi lại default tenant
  process.env.DEFAULT_TENANT_ID = testTenant;

  // Truy vấn với tenant mặc định -> Chỉ thấy lịch của tenant mặc định
  const res = await request(
    `/shifts/schedules?from=2026-12-01&to=2026-12-31&assigneeId=${emp}`,
  );
  assert.equal(res.status, 200);
  assert.equal(res.body.items.length, 1);
  assert.equal(res.body.items[0].id, assign.body.id);
  assert.equal(res.body.items[0].tenantId, "default");
  assert.ok(!res.body.items.some((i) => i.id === otherAssign.body.id));
});

test("SHIFT-06: 11. Thiếu DEFAULT_TENANT_ID xử lý đúng lỗi cấu hình (500)", async () => {
  delete process.env.DEFAULT_TENANT_ID;
  const res = await request("/shifts/schedules?from=2026-12-01&to=2026-12-31");
  assert.equal(res.status, 500);
  assert.match(res.body.message, /DEFAULT_TENANT_ID/);
});

test("SHIFT-06: 12. Xử lý lỗi validate: Thiếu from/to, sai format, ngày dương lịch không tồn tại", async () => {
  // Thiếu from
  const r1 = await request("/shifts/schedules?to=2026-12-10");
  assert.equal(r1.status, 400);

  // Thiếu to
  const r2 = await request("/shifts/schedules?from=2026-12-01");
  assert.equal(r2.status, 400);

  // Sai định dạng ngày
  const r3 = await request("/shifts/schedules?from=2026/12/01&to=2026-12-10");
  assert.equal(r3.status, 400);

  // Ngày không tồn tại trên lịch (31/02)
  const r4 = await request("/shifts/schedules?from=2026-02-31&to=2026-03-05");
  assert.equal(r4.status, 400);
  assert.ok(JSON.stringify(r4.body).includes("không hợp lệ trên lịch"));

  // from > to
  const r5 = await request("/shifts/schedules?from=2026-12-20&to=2026-12-10");
  assert.equal(r5.status, 400);
  assert.ok(JSON.stringify(r5.body).includes("không được sau ngày kết thúc"));

  // Alias from và startDate khác nhau
  const r6 = await request(
    "/shifts/schedules?from=2026-12-01&startDate=2026-12-02&to=2026-12-10",
  );
  assert.equal(r6.status, 400);
  assert.ok(JSON.stringify(r6.body).includes("khác nhau"));

  // Alias to và endDate khác nhau
  const r7 = await request(
    "/shifts/schedules?from=2026-12-01&to=2026-12-10&endDate=2026-12-15",
  );
  assert.equal(r7.status, 400);
  assert.ok(JSON.stringify(r7.body).includes("khác nhau"));

  // Alias assigneeId và employeeId khác nhau
  const r8 = await request(
    "/shifts/schedules?from=2026-12-01&to=2026-12-10&assigneeId=user1&employeeId=user2",
  );
  assert.equal(r8.status, 400);
  assert.ok(JSON.stringify(r8.body).includes("khác nhau"));
});
