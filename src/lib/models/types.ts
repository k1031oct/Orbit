export interface Settings {
  key: string;
  value: string;
}

export interface Project {
  id: string;
  name: string;
  platform: 'ANDROID_KOTLIN' | 'WINDOWS_TAURI' | 'WEB_NEXTJS' | 'GAS_TS' | 'OTHER';
  gasUrl?: string;
  gitUrl?: string;
  androidPath: string;
  status: 'active' | 'pending';
  lastSyncedAt?: string;
  description?: string;
  lastBuildStatus?: 'success' | 'failed' | 'running' | null;
  lastBuildAt?: string | null;
  lastErrorLog?: string | null;
  lastApkPath?: string | null;
  latestVersion?: string | null;
  isRemoteSyncEnabled?: number; // 0: disabled, 1: enabled
}

export interface DecisionLog {
  id: string;
  projectId: string;
  category: string;
  decision: string;
  reason: string;
  timestamp: string;
}

export interface LocalRequirement {
  id: number;
  projectId: string;
  title: string;
  description?: string;
  status: 'Todo' | 'In Progress' | 'Done';
  target?: string;
  createdAt: string;
}

export interface KnowledgeEntry {
  id?: number;
  projectId: string;
  techStack: string; // JSON string
  taskTitle: string;
  codeSnippet: string;
  outcome: 'SUCCESS' | 'FAILURE';
  reasoning: string;
  confidence: number;
  timestamp: string;
}
