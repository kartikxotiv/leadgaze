export type Shift = {
  id: string;
  organization_id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ShiftFormPayload = {
  name: string;
  start_time: string;
  end_time: string;
  grace_minutes?: number | null;
  is_active?: boolean;
};

export type ApiSuccessResponse<T> = {
  success: boolean;
  statusCode: number;
  message: string | null;
  data: T;
};
