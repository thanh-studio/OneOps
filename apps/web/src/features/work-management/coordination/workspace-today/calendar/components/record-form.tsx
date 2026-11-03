"use client";
import { useState } from "react";
import {
  validatedCreateSchema as createSchema,
  type RecordDto,
} from "@/features/work-management/coordination/workspace-today/calendar/types";
import {
  definition,
  fields,
} from "@/features/work-management/coordination/workspace-today/calendar/constants";
import { client } from "@/features/work-management/coordination/workspace-today/calendar/api/client";
import { recordsChanged } from "@/features/work-management/coordination/workspace-today/calendar/hooks/use-record";
import { useWorkspace } from "@/features/work-management/coordination/workspace-today/calendar/components/primitives/workspace";
import { Button } from "@/features/work-management/coordination/workspace-today/calendar/components/primitives/button";
import {
  Input,
  Select,
  Textarea,
} from "@/features/work-management/coordination/workspace-today/calendar/components/primitives/forms";
export function RecordForm({
  record,
  onClose,
}: {
  record?: RecordDto;
  onClose: () => void;
}) {
  const { notify } = useWorkspace();
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        const data = new FormData(event.currentTarget);
        const extra: Record<string, unknown> = { ...record?.fields };
        for (const field of fields) {
          const raw = String(data.get("field:" + field.key) || "").trim();
          if (raw !== "")
            extra[field.key] = field.type === "number" ? Number(raw) : raw;
          else delete extra[field.key];
        }
        const parsed = createSchema.safeParse({
          code: String(data.get("code") || "").trim(),
          name: String(data.get("name") || "").trim(),
          date: String(data.get("date")),
          status: String(data.get("status")),
          assignee: String(data.get("assignee") || "").trim(),
          note: String(data.get("note") || "").trim(),
          scope: record?.scope || "",
          fields: extra,
        });
        if (!parsed.success) {
          setError(
            parsed.error.issues[0]?.message || "Kiểm tra thông tin nhập",
          );
          return;
        }
        setPending(true);
        setError("");
        try {
          if (record) await client.update(record, parsed.data);
          else await client.create(parsed.data);
          recordsChanged();
          notify(record ? "Đã cập nhật thành công." : "Đã tạo thành công.");
          onClose();
        } catch (e) {
          setError(e instanceof Error ? e.message : "Không thể lưu dữ liệu");
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="form-body">
        <div className="form-grid">
          <label>
            Mã{" "}
            <Input
              name="code"
              required
              maxLength={100}
              defaultValue={record?.code}
              placeholder="VD: WORK-001"
            />
          </label>
          <label>
            {definition.dateLabel}
            <Input
              name="date"
              type="date"
              required
              defaultValue={
                record?.date ||
                new Intl.DateTimeFormat("en-CA", {
                  timeZone: "Asia/Ho_Chi_Minh",
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(new Date())
              }
            />
          </label>
        </div>
        <label>
          Tiêu đề
          <Input
            name="name"
            required
            maxLength={500}
            defaultValue={record?.name}
            placeholder={"Nhập tên " + definition.singular}
          />
        </label>
        <div className="form-grid">
          <label>
            Trạng thái
            <Select
              name="status"
              defaultValue={record?.status || definition.statuses[0]}
            >
              {definition.statuses.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </label>
          <label>
            {definition.personLabel}
            <Input
              name="assignee"
              maxLength={150}
              defaultValue={record?.assignee}
            />
          </label>
        </div>
        <div className="form-grid">
          {fields.map((field) => (
            <label key={field.key}>
              {field.label}
              {field.type === "select" ? (
                <Select
                  name={"field:" + field.key}
                  defaultValue={String(
                    record?.fields[field.key as keyof RecordDto["fields"]] ??
                      field.options?.[0] ??
                      "",
                  )}
                >
                  {field.options?.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </Select>
              ) : field.type === "textarea" ? (
                <Textarea
                  name={"field:" + field.key}
                  maxLength={20000}
                  rows={4}
                  defaultValue={String(
                    record?.fields[field.key as keyof RecordDto["fields"]] ??
                      "",
                  )}
                />
              ) : (
                <Input
                  name={"field:" + field.key}
                  type={field.type}
                  min={field.type === "number" ? 0 : undefined}
                  max={field.key === "progress" ? 100 : undefined}
                  maxLength={1000}
                  defaultValue={String(
                    record?.fields[field.key as keyof RecordDto["fields"]] ??
                      "",
                  )}
                />
              )}
            </label>
          ))}
        </div>
        <label>
          Mô tả
          <Textarea
            name="note"
            maxLength={2000}
            rows={3}
            defaultValue={record?.note}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </div>
      <footer>
        <Button type="button" variant="secondary" onClick={onClose}>
          Hủy
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu…" : record ? "Lưu thay đổi" : "Tạo mới"}
        </Button>
      </footer>
    </form>
  );
}
