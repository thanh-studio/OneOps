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
  await client.query('DELETE FROM "hr_shifts_schedules"."shifts"');
  await client.end();
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
