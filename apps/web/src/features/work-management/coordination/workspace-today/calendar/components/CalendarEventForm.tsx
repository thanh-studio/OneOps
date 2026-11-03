"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { FormEvent, WheelEvent } from "react";

import CalendarDatePicker from "./CalendarDatePicker";

import type {
  CalendarEvent,
  CalendarEventFormData,
  CalendarUser,
} from "../types/calendar.types";

import {
  formatDate,
  PRIORITY_OPTIONS,
  STATUS_OPTIONS,
} from "../utils/calender.utils";

interface Props {
  users: CalendarUser[];
  event?: CalendarEvent | null;
  selectedDate?: Date;
  initialStartTime?: string;
  isSaving?: boolean;
  onClose: () => void;
  onSubmit: (data: CalendarEventFormData) => void | Promise<void>;
  onDelete?: (id: string) => void | Promise<void>;
}

const DEFAULT_START_TIME = "08:00";
const DEFAULT_END_TIME = "09:00";

// Chuyển YYYY-MM-DD thành Date theo múi giờ local.
const parseLocalDate = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date();
  return new Date(year, month - 1, day);
};

const inputClass = `
  h-10 w-full min-w-0 rounded-lg
  border border-gray-200 bg-white px-3
  text-sm text-gray-800
  outline-none transition-all duration-150
  placeholder:text-gray-400
  hover:border-gray-300
  focus:border-blue-500 focus:ring-2 focus:ring-blue-100
  disabled:cursor-not-allowed disabled:bg-gray-50
  disabled:text-gray-400
`;

const labelClass = `
  mb-1.5 block text-sm font-medium text-gray-700
`;

export default function CalendarEventForm({
  users,
  event,
  selectedDate,
  initialStartTime = DEFAULT_START_TIME,
  isSaving = false,
  onClose,
  onSubmit,
  onDelete,
}: Props) {
  const id = useId();

  const [form, setForm] = useState<CalendarEventFormData>({
    title: "",
    description: "",
    startDate: formatDate(selectedDate || new Date()),
    endDate: formatDate(selectedDate || new Date()),
    startTime: initialStartTime,
    endTime: DEFAULT_END_TIME,
    allDay: false,
    status: "todo",
    priority: "medium",
    assigneeId: "",
  });

  const [error, setError] = useState("");
  const [userSearch, setUserSearch] = useState("");

  const filteredUsers = useMemo(() => {
    const keyword = userSearch.trim().toLowerCase();

    if (!keyword) return users;

    return users.filter((user) => {
      const name = user.name?.toLowerCase() || "";
      const email = user.email?.toLowerCase() || "";

      return name.includes(keyword) || email.includes(keyword);
    });
  }, [users, userSearch]);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === form.assigneeId),
    [users, form.assigneeId]
  );

  useEffect(() => {
    const date = formatDate(selectedDate || new Date());

    if (event) {
      setForm({
        title: event.title || "",
        description: event.description || "",
        startDate: event.startDate,
        endDate: event.endDate,
        startTime: event.startTime || DEFAULT_START_TIME,
        endTime: event.endTime || DEFAULT_END_TIME,
        allDay: event.allDay,
        status: event.status,
        priority: event.priority,
        assigneeId: event.assignee?.id || event.assigneeId || "",
      });
    } else {
      setForm({
        title: "",
        description: "",
        startDate: date,
        endDate: date,
        startTime: initialStartTime,
        endTime: DEFAULT_END_TIME,
        allDay: false,
        status: "todo",
        priority: "medium",
        assigneeId: "",
      });
    }

    setError("");
    setUserSearch("");
  }, [event, selectedDate, initialStartTime]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSaving, onClose]);

  const updateField = <K extends keyof CalendarEventFormData>(
    key: K,
    value: CalendarEventFormData[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));

    setError("");
  };

  const handleHorizontalWheel = (
    e: WheelEvent<HTMLDivElement>
  ) => {
    const element = e.currentTarget;

    if (
      element.scrollWidth > element.clientWidth &&
      Math.abs(e.deltaY) > Math.abs(e.deltaX)
    ) {
      e.preventDefault();
      element.scrollLeft += e.deltaY;
    }
  };

  const handleClose = () => {
    if (!isSaving) onClose();
  };

  const validate = () => {
    if (!form.title.trim()) {
      return "Vui lòng nhập tên công việc.";
    }

    if (!form.startDate || !form.endDate) {
      return "Vui lòng chọn ngày bắt đầu và kết thúc.";
    }

    if (form.endDate < form.startDate) {
      return "Ngày kết thúc không được trước ngày bắt đầu.";
    }

    if (!form.allDay) {
      if (!form.startTime || !form.endTime) {
        return "Vui lòng chọn giờ bắt đầu và kết thúc.";
      }

      const start = new Date(
        `${form.startDate}T${form.startTime}:00`
      );

      const end = new Date(
        `${form.endDate}T${form.endTime}:00`
      );

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime())
      ) {
        return "Ngày hoặc giờ không hợp lệ.";
      }

      if (end <= start) {
        return "Thời gian kết thúc phải sau thời gian bắt đầu.";
      }
    }

    return null;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSaving) return;

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      await onSubmit({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
      });
    } catch {
      setError("Không thể lưu công việc. Vui lòng thử lại.");
    }
  };

  const handleDelete = async () => {
    if (!event || !onDelete || isSaving) return;

    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xóa công việc này?"
      )
    ) {
      return;
    }

    try {
      await onDelete(event.id);
    } catch {
      setError("Không thể xóa công việc. Vui lòng thử lại.");
    }
  };

  const toggleAssignee = (userId: string) => {
    updateField(
      "assigneeId",
      form.assigneeId === userId ? "" : userId
    );
  };

  const getInitial = (name: string) => {
    return name?.trim().charAt(0).toUpperCase() || "?";
  };

  return (    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        overflow-y-auto bg-gray-950/40
        p-3 backdrop-blur-[2px]
        sm:p-5
      "
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        className="
          flex max-h-[94vh] w-full max-w-2xl
          min-w-0 flex-col overflow-hidden
          rounded-2xl border border-gray-100
          bg-white shadow-2xl
        "
      >
        {/* Header */}
        <header
          className="
            flex shrink-0 items-center justify-between
            border-b border-gray-100 px-5 py-4
            sm:px-6
          "
        >
          <div className="min-w-0">
            <h2
              id={`${id}-title`}
              className="text-lg font-bold text-gray-900"
            >
              {event ? "Chỉnh sửa công việc" : "Tạo công việc mới"}
            </h2>

            <p className="mt-1 text-xs text-gray-500">
              Quản lý thông tin và người phụ trách công việc.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSaving}
            aria-label="Đóng"
            className="
              ml-3 flex h-9 w-9 shrink-0
              items-center justify-center
              rounded-lg text-gray-400
              transition hover:bg-gray-100
              hover:text-gray-700
              focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-blue-200
              disabled:cursor-not-allowed disabled:opacity-50
            "
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="m18 6-12 12M6 6l12 12"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </header>

        {/* Form body */}
        <form
          onSubmit={handleSubmit}
          className="
            min-h-0 space-y-6
            overflow-y-auto overflow-x-hidden
            p-5 sm:p-6
          "
        >
          {/* Basic information */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Thông tin chung
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                Nhập tên và mô tả công việc cần thực hiện.
              </p>
            </div>

            <div>
              <label
                htmlFor={`${id}-title-input`}
                className={labelClass}
              >
                Tên công việc
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                id={`${id}-title-input`}
                autoFocus
                required
                value={form.title}
                disabled={isSaving}
                onChange={(e) =>
                  updateField("title", e.target.value)
                }
                placeholder="Nhập tên công việc..."
                maxLength={255}
                className={inputClass}
              />

              <p className="mt-1 text-xs text-gray-400">
                Tên ngắn gọn giúp dễ nhận biết công việc.
              </p>
            </div>

            <div>
              <label
                htmlFor={`${id}-description`}
                className={labelClass}
              >
                Mô tả công việc
              </label>

              <textarea
                id={`${id}-description`}
                rows={3}
                value={form.description}
                disabled={isSaving}
                onChange={(e) =>
                  updateField("description", e.target.value)
                }
                placeholder="Nhập mô tả công việc..."
                className="
                  w-full resize-y rounded-lg
                  border border-gray-200 bg-white
                  px-3 py-2.5 text-sm text-gray-800
                  outline-none transition
                  placeholder:text-gray-400
                  hover:border-gray-300
                  focus:border-blue-500
                  focus:ring-2 focus:ring-blue-100
                  disabled:bg-gray-50
                "
              />
            </div>
          </section>

          <div className="border-t border-gray-100" />

          {/* Schedule */}
          <section className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Thời gian thực hiện
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                Thiết lập ngày và khung giờ công việc.
              </p>
            </div>

            <label
              className="
                flex cursor-pointer items-center gap-3
                rounded-lg border border-gray-200
                bg-gray-50/70 px-3 py-3
                transition hover:bg-gray-50
              "
            >
              <input
                type="checkbox"
                checked={form.allDay}
                disabled={isSaving}
                onChange={(e) =>
                  updateField("allDay", e.target.checked)
                }
                className="
                  h-4 w-4 shrink-0 rounded
                  accent-blue-600
                  focus:ring-2 focus:ring-blue-100
                "
              />

              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-800">
                  Công việc cả ngày
                </span>
                <span className="mt-0.5 block text-xs text-gray-500">
                  Không cần thiết lập giờ bắt đầu và kết thúc.
                </span>
              </span>
            </label>

            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label
                  htmlFor={`${id}-start-date`}
                  className={labelClass}
                >
                  Ngày bắt đầu
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <CalendarDatePicker
                  value={parseLocalDate(form.startDate)}
                  disabled={isSaving}
                  label="Ngày bắt đầu"
                  placeholder="Chọn ngày bắt đầu"
                  onChange={(date) => {
                    const startDate = formatDate(date);

                    setForm((previous) => ({
                      ...previous,
                      startDate,
                      endDate:
                        startDate > previous.endDate
                          ? startDate
                          : previous.endDate,
                    }));

                    setError("");
                  }}
                />
              </div>

              <div className="min-w-0">
                <label
                  htmlFor={`${id}-end-date`}
                  className={labelClass}
                >
                  Ngày kết thúc
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <CalendarDatePicker
                  value={parseLocalDate(form.endDate)}
                  disabled={isSaving}
                  label="Ngày kết thúc"
                  placeholder="Chọn ngày kết thúc"
                  onChange={(date) => {
                    const endDate = formatDate(date);

                    if (endDate < form.startDate) {
                      setError(
                        "Ngày kết thúc không được trước ngày bắt đầu."
                      );
                      return;
                    }

                    updateField("endDate", endDate);
                  }}
                />
              </div>
            </div>

            {!form.allDay && (
              <div className="grid min-w-0 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`${id}-start-time`}
                    className={labelClass}
                  >
                    Giờ bắt đầu
                  </label>

                  <input
                    id={`${id}-start-time`}
                    type="time"
                    value={form.startTime}
                    disabled={isSaving}
                    onChange={(e) =>
                      updateField("startTime", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor={`${id}-end-time`}
                    className={labelClass}
                  >
                    Giờ kết thúc
                  </label>

                  <input
                    id={`${id}-end-time`}
                    type="time"
                    value={form.endTime}
                    disabled={isSaving}
                    onChange={(e) =>
                      updateField("endTime", e.target.value)
                    }
                    className={inputClass}
                  />
                </div>
              </div>
            )}
          </section>

          <div className="border-t border-gray-100" />
                    {/* Status */}
          <section className="min-w-0 space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                Trạng thái công việc
              </h3>
              <p className="mt-1 text-xs text-gray-400">
                Chọn tiến độ hiện tại của công việc.
              </p>
            </div>

            <div className="relative">
              <select
                id={`${id}-status`}
                value={form.status}
                disabled={isSaving}
                onChange={(e) =>
                  updateField(
                    "status",
                    e.target.value as CalendarEventFormData["status"]
                  )
                }
                className={`
                  ${inputClass}
                  appearance-none cursor-pointer
                  pr-10 font-medium
                `}
              >
                {STATUS_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <svg
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="m7 10 5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </section>

          {/* Priority */}
          <section className="space-y-4">
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <div className="min-w-0">
                <label
                  htmlFor={`${id}-priority`}
                  className={labelClass}
                >
                  Mức độ ưu tiên
                </label>

                <select
                  id={`${id}-priority`}
                  value={form.priority}
                  disabled={isSaving}
                  onChange={(e) =>
                    updateField(
                      "priority",
                      e.target.value as CalendarEventFormData["priority"]
                    )
                  }
                  className={`${inputClass} appearance-none`}
                >
                  {PRIORITY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Employee list */}
            <div className="min-w-0">
              <div className="mb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Thành viên phụ trách
                    </h3>
                    <p className="mt-1 text-xs text-gray-400">
                      Tìm kiếm và chọn nhân viên chịu trách nhiệm công việc.
                    </p>
                  </div>

                  <span className="
                    rounded-full bg-blue-50
                    px-2.5 py-1 text-xs font-medium text-blue-700
                  ">
                    {users.length} nhân viên
                  </span>
                </div>
              </div>

              {/* Selected employee */}
              {selectedUser && (
                <div className="
                  mb-3 flex items-center justify-between gap-3
                  rounded-lg border border-blue-200
                  bg-blue-50/70 p-3
                ">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="
                        flex h-10 w-10 shrink-0
                        items-center justify-center
                        rounded-full text-sm font-semibold text-white
                      "
                      style={{
                        backgroundColor: selectedUser.color || "#2563EB",
                      }}
                    >
                      {getInitial(selectedUser.name)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">
                        {selectedUser.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">
                        {selectedUser.email || "Nhân viên được giao"}
                      </p>
                    </div>
                  </div>

                  <span className="
                    shrink-0 rounded-full bg-blue-100
                    px-2.5 py-1 text-xs font-semibold text-blue-700
                  ">
                    Đã chọn
                  </span>
                </div>
              )}

              {/* Search employees */}
              <div className="relative mb-3">
                <svg
                  viewBox="0 0 24 24"
                  className="
                    pointer-events-none absolute left-3 top-1/2
                    h-4 w-4 -translate-y-1/2 text-gray-400
                  "
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="10.8"
                    cy="10.8"
                    r="6.8"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  />
                  <path
                    d="m16 16 4.2 4.2"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>

                <input
                  type="search"
                  value={userSearch}
                  disabled={isSaving}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Tìm theo tên hoặc email nhân viên..."
                  aria-label="Tìm kiếm nhân viên"
                  className={`
                    ${inputClass}
                    pl-9
                  `}
                />
              </div>

              {/* Employee list */}
              {users.length > 0 ? (
                <div className="
                  max-h-64 overflow-y-auto
                  rounded-xl border border-gray-200
                  divide-y divide-gray-100
                ">
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => {
                      const selected = form.assigneeId === user.id;

                      return (
                        <button
                          key={user.id}
                          type="button"
                          disabled={isSaving}
                          aria-pressed={selected}
                          onClick={() => toggleAssignee(user.id)}
                          className={`
                            flex w-full items-center gap-3
                            px-3 py-3 text-left
                            transition-colors
                            ${
                              selected
                                ? "bg-blue-50"
                                : "bg-white hover:bg-gray-50"
                            }
                            focus-visible:outline-none
                            focus-visible:ring-2
                            focus-visible:ring-inset
                            focus-visible:ring-blue-400
                            disabled:cursor-not-allowed
                            disabled:opacity-50
                          `}
                        >
                          {/* Avatar */}
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt=""
                              className="
                                h-10 w-10 shrink-0
                                rounded-full object-cover
                              "
                            />
                          ) : (
                            <div
                              className="
                                flex h-10 w-10 shrink-0
                                items-center justify-center
                                rounded-full text-sm
                                font-semibold text-white
                              "
                              style={{
                                backgroundColor: user.color || "#2563EB",
                              }}
                            >
                              {getInitial(user.name)}
                            </div>
                          )}

                          {/* Name and email */}
                          <div className="min-w-0 flex-1">
                            <p className={`
                              truncate text-sm font-medium
                              ${
                                selected
                                  ? "text-blue-700"
                                  : "text-gray-800"
                              }
                            `}>
                              {user.name}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {user.email || "Chưa có email"}
                            </p>
                          </div>

                          {/* Selection indicator */}
                          <div className="flex shrink-0 items-center gap-2">
                            {selected && (
                              <span className="text-xs font-medium text-blue-600">
                                Đã chọn
                              </span>
                            )}

                            <span className={`
                              flex h-5 w-5 items-center justify-center
                              rounded-full border
                              ${
                                selected
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-gray-300 bg-white"
                              }
                            `}>
                              {selected && (
                                <svg
                                  viewBox="0 0 20 20"
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  aria-hidden="true"
                                >
                                  <path
                                    d="m4 10 4 4 8-8"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              )}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm font-medium text-gray-600">
                        Không tìm thấy nhân viên
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Thử tìm bằng tên hoặc email khác.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="
                  rounded-xl border border-dashed
                  border-gray-300 bg-gray-50
                  px-4 py-8 text-center
                ">
                  <div className="
                    mx-auto flex h-10 w-10
                    items-center justify-center
                    rounded-full bg-gray-100 text-gray-400
                  ">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <p className="mt-3 text-sm font-medium text-gray-700">
                    Chưa có nhân viên
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Danh sách nhân viên chưa được tải về.
                  </p>
                </div>
              )}

              {form.assigneeId && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => updateField("assigneeId", "")}
                  className="
                    mt-2 text-xs font-medium text-red-500
                    transition hover:text-red-600
                    disabled:opacity-50
                  "
                >
                  Bỏ chọn người phụ trách
                </button>
              )}
            </div>
          </section>
                    {/* Error message */}
          {error && (
            <div
              role="alert"
              className="
                flex items-start gap-2
                rounded-lg border border-red-100
                bg-red-50 px-4 py-3
                text-sm text-red-600
              "
            >
              <svg
                viewBox="0 0 24 24"
                className="mt-0.5 h-4 w-4 shrink-0"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.7"
                />
                <path
                  d="M12 8v5m0 3h.01"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>

              <span>{error}</span>
            </div>
          )}

          {/* Footer */}
          <footer
            className="
              flex flex-wrap items-center
              justify-between gap-3
              border-t border-gray-100 pt-5
            "
          >
            <div>
              {event && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="
                    rounded-lg px-3 py-2
                    text-sm font-medium text-red-600
                    transition hover:bg-red-50
                    disabled:cursor-not-allowed
                    disabled:opacity-50
                  "
                >
                  Xóa công việc
                </button>
              )}
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving}
                className="
                  flex-1 rounded-lg
                  border border-gray-200
                  px-4 py-2.5 text-sm
                  font-medium text-gray-600
                  transition hover:bg-gray-50
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  sm:flex-none
                "
              >
                Hủy
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="
                  flex-1 rounded-lg
                  bg-blue-600 px-5 py-2.5
                  text-sm font-semibold text-white
                  shadow-sm transition
                  hover:bg-blue-700
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-blue-300
                  focus-visible:ring-offset-2
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                  sm:flex-none
                "
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                        stroke="currentColor"
                        strokeWidth="3"
                        opacity=".25"
                      />
                      <path
                        d="M21 12a9 9 0 0 0-9-9"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    Đang lưu...
                  </span>
                ) : event ? (
                  "Lưu thay đổi"
                ) : (
                  "Tạo công việc"
                )}
              </button>
            </div>
          </footer>
        </form>
      </section>
    </div>
  );
}