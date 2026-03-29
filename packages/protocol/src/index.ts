export type TimestampIsoString = string;

export interface ApiSuccess<T> {
  ok: true;
  data: T;
  servedAt: TimestampIsoString;
}

export interface ApiError {
  ok: false;
  error: string;
  servedAt: TimestampIsoString;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface AgentIdentity {
  agentId: string;
  name: string;
  version: string;
  startedAt: TimestampIsoString;
}

export interface AgentControlPlaneRecord {
  baseUrl: string;
  enabled: boolean;
  displayName?: string;
  notes?: string;
  tags?: string[];
}

export interface CpuInfo {
  model: string;
  cores: number;
}

export interface MemoryInfo {
  totalBytes: number;
}

export interface DiskInfo {
  filesystem: string;
  mount: string;
  totalBytes: number;
}

export interface NetworkInterfaceInfo {
  name: string;
  addresses: string[];
  mac?: string;
}

export interface HardwareMetadata {
  hostname: string;
  platform: string;
  arch: string;
  cpu: CpuInfo;
  memory: MemoryInfo;
  primaryDisk?: DiskInfo;
  networkInterfaces: NetworkInterfaceInfo[];
}

export interface RegionInfo {
  provider: 'local';
  regionCode: string;
  regionName: string;
  city?: string;
  country?: string;
  source: 'env' | 'hostname' | 'default';
}

export interface ThroughputSnapshot {
  bytesPerSecond: number;
}

export interface CumulativeTraffic {
  uploadedBytes: number;
  downloadedBytes: number;
}

export interface MetricsSnapshot {
  timestamp: TimestampIsoString;
  cpuUsagePercent: number;
  ramUsagePercent: number;
  diskUsagePercent: number | null;
  uploadThroughput: ThroughputSnapshot;
  downloadThroughput: ThroughputSnapshot;
  cumulativeTraffic: CumulativeTraffic;
}

export interface AgentRealtimeEnvelope {
  identity: AgentIdentity;
  region: RegionInfo;
  snapshot: MetricsSnapshot;
}

export interface AgentStatusRecord {
  polledAt: TimestampIsoString;
  receivedAt: TimestampIsoString;
  snapshotAgeMs: number;
  stale: boolean;
  snapshot: MetricsSnapshot;
  agentReachable: boolean;
  error?: string;
}

export interface AgentNodeView {
  controlPlane: AgentControlPlaneRecord;
  identity?: AgentIdentity;
  hardware?: HardwareMetadata;
  region?: RegionInfo;
  latestStatus?: AgentStatusRecord;
}

// Persisted agent config record stored in SQLite and synced across panel peers
export interface AgentConfigRecord {
  baseUrl: string;
  displayName?: string;
  enabled: boolean;
  updatedAt: TimestampIsoString;
  deletedAt?: TimestampIsoString;
}

// Payload for P2P sync push
export interface SyncPushPayload {
  record: AgentConfigRecord;
}

// Response for full sync bootstrap
export interface SyncFullResponse {
  records: AgentConfigRecord[];
}

// Admin user
export interface AdminRecord {
  id: number;
  username: string;
  createdAt: TimestampIsoString;
}

// Panel peer registered in the cluster
export interface PanelRecord {
  id: string;
  displayName?: string;
  domain: string;
  secret: string;
  joinedAt: TimestampIsoString;
  deletedAt?: TimestampIsoString;
}

// Agent key provisioned for a new agent
export interface AgentKeyRecord {
  agentId: string;
  displayName?: string;
  secret: string;
  baseUrl?: string;
  createdAt: TimestampIsoString;
  deletedAt?: TimestampIsoString;
}
