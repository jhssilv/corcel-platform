from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel


class UploadResponse(BaseModel):
    task_id: str
    batch_id: int


class TextUploadTaskResult(BaseModel):
    kind: Literal["text_upload"]
    batch_id: int
    text_ids: list[int]
    created: int
    failed_files: list[str] = []


class TextUploadBatchTextStatus(BaseModel):
    id: int
    source_file_name: Optional[str] = None
    processing_status: str
    processing_attempts: int = 0


class TextUploadBatchSummary(BaseModel):
    id: int
    source_file_name: Optional[str] = None
    status: str
    status_message: str
    is_recovering: bool = False
    total_files: int = 0
    created_texts: int = 0
    processed_texts: int = 0
    failed_texts: int = 0
    failed_files: list[str] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    import_finished_at: Optional[datetime] = None
    processing_started_at: Optional[datetime] = None
    processing_finished_at: Optional[datetime] = None
    last_error: Optional[str] = None


class TextUploadBatchDetail(TextUploadBatchSummary):
    texts: list[TextUploadBatchTextStatus] = []


class ActiveTextUploadBatchesResponse(BaseModel):
    batches: list[TextUploadBatchSummary]

class TaskStatusResponse(BaseModel):
    state: str
    status: str
    current: Optional[int] = None
    total: Optional[int] = None
    result: Optional[TextUploadTaskResult | dict[str, Any] | list[Any]] = None
    error: Optional[str] = None
    failed_files: Optional[list[str]] = None
