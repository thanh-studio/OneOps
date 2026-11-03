
"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import type { RecordDto } from "../types";
import { client } from "../api/client";

const RECORDS_CHANGED_EVENT = "module-records-changed";

/**
 * Thông báo cho các component đang sử dụng danh sách
 * rằng dữ liệu đã được thay đổi.
 */
export function recordsChanged() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(RECORDS_CHANGED_EVENT),
  );
}

interface UseModuleRecordsReturn {
  records: RecordDto[];
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
}

export function useModuleRecords(): UseModuleRecordsReturn {
  const [records, setRecords] = useState<RecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await client.list();

      setRecords(
        Array.isArray(result) ? result : [],
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải dữ liệu.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();

    const handleRecordsChanged = () => {
      void reload();
    };

    window.addEventListener(
      RECORDS_CHANGED_EVENT,
      handleRecordsChanged,
    );

    return () => {
      window.removeEventListener(
        RECORDS_CHANGED_EVENT,
        handleRecordsChanged,
      );
    };
  }, [reload]);

  return {
    records,
    loading,
    error,
    reload,
  };
}
