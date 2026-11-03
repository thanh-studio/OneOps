
import type {
  CalendarEvent,
  CalendarPayload,
  CalendarQuery,
} from "../types/calendar.types";

import { apiRequest } from "./http";

/**
 * Calendar API Configuration
 */
const BASE_URL = "/calendar/events";

/**
 * Tạo query string.
 */
function buildQuery(
  query: CalendarQuery = {},
): string {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== ""
    ) {
      params.set(key, String(value));
    }
  });

  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

/**
 * Calendar API
 */
export const calendarApi = {
  /**
   * Lấy danh sách sự kiện.
   */
  getEvents(
    query: CalendarQuery = {},
  ): Promise<CalendarEvent[]> {
    return apiRequest<CalendarEvent[]>(
      `${BASE_URL}${buildQuery(query)}`,
      {
        method: "GET",
      },
    );
  },

  /**
   * Lấy chi tiết sự kiện.
   */
  getEvent(
    id: string,
  ): Promise<CalendarEvent> {
    return apiRequest<CalendarEvent>(
      `${BASE_URL}/${encodeURIComponent(id)}`,
      {
        method: "GET",
      },
    );
  },

  /**
   * Tạo sự kiện.
   */
  createEvent(
    payload: CalendarPayload,
  ): Promise<CalendarEvent> {
    return apiRequest<CalendarEvent>(
      BASE_URL,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  },

  /**
   * Cập nhật sự kiện.
   */
  updateEvent(
    id: string,
    payload: Partial<CalendarPayload>,
  ): Promise<CalendarEvent> {
    return apiRequest<CalendarEvent>(
      `${BASE_URL}/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      },
    );
  },

  /**
   * Xóa sự kiện.
   */
  deleteEvent(
    id: string,
  ): Promise<void> {
    return apiRequest<void>(
      `${BASE_URL}/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
  },
};
