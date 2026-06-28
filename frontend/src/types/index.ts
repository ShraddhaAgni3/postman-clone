export interface KeyValueItem {
  key: string;
  value: string;
  enabled: boolean;
  type?: string; // 'text' or 'file' for multipart bodies
}

export interface AuthConfig {
  token?: string;
  username?: string;
  password?: string;
}

export interface RequestType {
  id: number;
  collection_id: number;
  name: string;
  method: string;
  url: string;
  headers: KeyValueItem[];
  params: KeyValueItem[];
  body_type: string; // 'none' | 'raw' | 'form-data' | 'x-www-form-urlencoded'
  body_raw?: string;
  body_raw_type?: string; // 'JSON' | 'Text' | 'HTML' | 'XML'
  body_form_data?: KeyValueItem[];
  body_urlencoded?: KeyValueItem[];
  auth_type: string; // 'none' | 'bearer' | 'basic'
  auth_config?: AuthConfig;
  created_at?: string;
  updated_at?: string;
}

export interface CollectionDetail {
  id: number;
  name: string;
  description?: string;
  parent_id?: number | null;
  requests: RequestType[];
  children: CollectionDetail[];
  created_at?: string;
  updated_at?: string;
}

export interface EnvironmentVariable {
  id?: number;
  key: string;
  value: string;
  enabled: boolean;
}

export interface Environment {
  id: number;
  name: string;
  variables: EnvironmentVariable[];
  created_at?: string;
  updated_at?: string;
}

export interface HistoryItem {
  id: number;
  method: string;
  url: string;
  headers: KeyValueItem[];
  params: KeyValueItem[];
  body_type: string;
  body_raw?: string;
  auth_type: string;
  response_status: number;
  response_status_text: string;
  response_time_ms: number;
  response_size_bytes: number;
  response_headers: KeyValueItem[];
  response_body?: string;
  sent_at: string;
}

export interface Tab {
  id: string; // Tab unique identifier
  name: string;
  type: 'saved' | 'history' | 'new';
  method: string;
  url: string;
  headers: KeyValueItem[];
  params: KeyValueItem[];
  body_type: string;
  body_raw?: string;
  body_raw_type?: string;
  body_form_data?: KeyValueItem[];
  body_urlencoded?: KeyValueItem[];
  auth_type: string;
  auth_config?: AuthConfig;
  isDirty?: boolean;
  savedRequestId?: number; // Maps to database saved request ID if saved
  response?: ResponseData | null;
  loading?: boolean;
}

export interface ResponseData {
  status: number;
  status_text: string;
  time_ms: number;
  size_bytes: number;
  headers: KeyValueItem[];
  body?: string;
  error?: string;
}
