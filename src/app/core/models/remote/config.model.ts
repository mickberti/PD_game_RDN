
export interface RemoteConfigDocument {
  maintenanceMode: boolean;
  minSupportedVersion: string;
  latestVersion: string;
  news: string[];
}

export const DEFAULT_REMOTE_CONFIG: RemoteConfigDocument = {
  maintenanceMode: false,
  minSupportedVersion: '0.0.1',
  latestVersion: '0.0.1',
  news: []
};
