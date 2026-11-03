
import { z } from "zod";

import {
  createSchema,
  recordSchema,
  type RecordInput,
  type RecordDto,
} from "../types";

import { apiRequest } from "./http";

const PAGE_SIZE = 100;

const BASE_URL = "/calendar";

export const client = {
  /**
   * Lấy toàn bộ calendar records.
   * Tự động phân trang cho đến khi lấy đủ dữ liệu.
   */
  async list(signal?: AbortSignal): Promise<RecordDto[]> {
    const items: RecordDto[] = [];

    let page = 1;

    while (true) {
      const result = await apiRequest(
        `${BASE_URL}?page=${page}&pageSize=${PAGE_SIZE}`,
        { signal },
        z.object({
          items: z.array(recordSchema),
          total: z.number(),
          page: z.number(),
          pageSize: z.number(),
        }),
      );

      items.push(...result.items);

      if (
        items.length >= result.total ||
        result.items.length === 0
      ) {
        return items;
      }

      page++;
    }
  },

  /**
   * Cập nhật calendar record.
   * Gửi version để backend kiểm tra optimistic concurrency.
   */
  update(
    record: RecordDto,
    patch: Partial<RecordInput>,
  ) {
    return apiRequest(
      `${BASE_URL}/${record.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          ...patch,
          version: record.version,
        }),
      },
      recordSchema,
    );
  },

  /**
   * Xóa calendar record.
   */
  remove(record: RecordDto) {
    return apiRequest<void>(
      `${BASE_URL}/${record.id}`,
      {
        method: "DELETE",
        body: JSON.stringify({
          version: record.version,
        }),
      },
    );
  },

  /**
   * Tạo calendar record mới.
   * Validate dữ liệu trước khi gửi API.
   */
  create(data: RecordInput) {
    const payload = createSchema.parse(data);

    return apiRequest(
      BASE_URL,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      recordSchema,
    );
  },
};
