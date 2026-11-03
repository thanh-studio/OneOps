
export type Field = {
  key: string;
  label: string;
  type: "select" | "time" | "text" | "number" | "date" | "textarea";
  options?: readonly string[];
};

export const definition = {
  id: "work-management/calendar",
  icon: 5,
  label: "Lịch",
  title: "Lịch làm việc",
  singular: "lịch làm việc",
  dateLabel: "Ngày diễn ra",
  personLabel: "Người tổ chức",

  tabs: [],
  sections: [],

  statuses: [
    "Đã lên lịch",
    "Đang diễn ra",
    "Hoàn thành",
    "Đã hủy",
  ],

  fields: [
    {
      key: "kind",
      label: "Loại lịch",
      type: "select",
      options: ["Cuộc họp", "Thời gian tập trung", "Sự kiện"],
    },
    {
      key: "startTime",
      label: "Bắt đầu",
      type: "time",
    },
    {
      key: "endTime",
      label: "Kết thúc",
      type: "time",
    },
    {
      key: "location",
      label: "Địa điểm / liên kết họp",
      type: "text",
    },
    {
      key: "attendees",
      label: "Người tham dự",
      type: "text",
    },
  ],

  navigation: {
    title: "Lịch",
    collapsed: false,
    defaultSection: "Tất cả",
    allSection: "Tất cả",

    items: [
      {
        label: "Tất cả",
        href: "/work-management/calendar",
      },
      {
        label: "Đã lên lịch",
        href: "/work-management/calendar?status=Đã lên lịch&section=Đã lên lịch",
      },
      {
        label: "Đang diễn ra",
        href: "/work-management/calendar?status=Đang diễn ra&section=Đang diễn ra",
      },
      {
        label: "Hoàn thành",
        href: "/work-management/calendar?status=Hoàn thành&section=Hoàn thành",
      },
      {
        label: "Đã hủy",
        href: "/work-management/calendar?status=Đã hủy&section=Đã hủy",
      },
    ],
  },
} as const;

export const fields: readonly Field[] = definition.fields;
