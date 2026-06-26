import { endpoints } from "../config/api";
import { apiClient } from "../lib/api-client";

export interface WorkTimeRecord {
  id: number;
  startTime: string;
  endTime: string;
}

export const getWorkTime = async (): Promise<WorkTimeRecord | null> => {
  const { data } = await apiClient.get(endpoints.workTime.list);
  const records = data as WorkTimeRecord[];
  return records.length > 0 ? records[0] : null;
};

export const createWorkTime = (payload: { startTime: string; endTime: string }) =>
  apiClient.post(endpoints.workTime.list, payload);

export const updateWorkTime = (id: number, payload: { startTime: string; endTime: string }) =>
  apiClient.put(endpoints.workTime.detail(id), payload);
