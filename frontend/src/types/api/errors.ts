export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiError {
  error: string;
  details?: ApiErrorDetail[];
}

export interface ValidationError {
  error: string;
}
