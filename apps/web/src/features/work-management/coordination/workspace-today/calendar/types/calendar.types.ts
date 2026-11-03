
export type CalendarEventStatus =
  | "todo"
  | "in_progress"
  | "completed"
  | "cancelled";

export type CalendarEventStatusFilter =
  | CalendarEventStatus
  | "all";

export type CalendarEventPriority =
  | "low"
  | "medium"
  | "high";

export type CalendarViewMode =
  | "day"
  | "week"
  | "month"
  | "year";

export interface CalendarUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
  color?: string;
}

export interface CalendarAssignee {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
  color?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;

  startDate: string;
  endDate: string;

  startTime?: string;
  endTime?: string;

  allDay: boolean;

  status: CalendarEventStatus;
  priority: CalendarEventPriority;

  assignee?: CalendarAssignee | null;
  assigneeId?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

export interface CalendarPayload {
  title: string;
  description?: string;

  startDate: string;
  endDate: string;

  startTime?: string;
  endTime?: string;

  allDay: boolean;

  status: CalendarEventStatus;
  priority: CalendarEventPriority;

  assigneeId?: string | null;
}

export interface CalendarEventFormData {
  title: string;
  description: string;

  startDate: string;
  endDate: string;

  startTime: string;
  endTime: string;

  allDay: boolean;

  status: CalendarEventStatus;
  priority: CalendarEventPriority;

  assigneeId: string;
}

export interface CalendarEventQuery {
  startDate?: string;
  endDate?: string;
  status?: CalendarEventStatus;
  assigneeId?: string;
  keyword?: string;
}

export type CalendarQuery = CalendarEventQuery;

export interface CalendarApiResponse<T> {
  data: T;
  message?: string;
  success?: boolean;
}

export interface CalendarState {
  events: CalendarEvent[];
  users: CalendarUser[];

  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}
