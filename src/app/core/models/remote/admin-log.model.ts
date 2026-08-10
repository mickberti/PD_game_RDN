export interface AdminLog {
  action: string;
  adminUid: string;
  targetPath: string;
  timestamp: string;
  payload?: unknown;
}