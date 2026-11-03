
import type { z } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);

    this.name = "ApiError";
  }
}

/**
 * Request dùng chung cho Calendar API.
 *
 * API prefix: /api/v1
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  schema?: z.ZodType<T>,
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...options,

    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },

    cache: "no-store",
  });

  /**
   * HTTP 204: Không có nội dung trả về.
   */
  if (response.status === 204) {
    return undefined as T;
  }

  /**
   * Đọc response body.
   */
  const body = await response.json().catch(() => null);

  /**
   * Xử lý lỗi API.
   */
  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof body?.message === "string"
        ? body.message
        : "Không thể kết nối API. Vui lòng thử lại.",
    );
  }

  /**
   * Validate response bằng Zod nếu có schema.
   */
  return schema
    ? schema.parse(body)
    : (body as T);
}
