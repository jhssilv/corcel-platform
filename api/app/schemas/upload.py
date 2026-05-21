from typing import Any, Literal, Optional

from pydantic import BaseModel


class UploadResponse(BaseModel):
    task_id: str


class TextUploadTaskResult(BaseModel):
    kind: Literal["text_upload"]
    text_ids: list[int]
    processed: int
    failed_files: list[str] = []

class TaskStatusResponse(BaseModel):
    state: str
    status: str
    current: Optional[int] = None
    total: Optional[int] = None
    result: Optional[TextUploadTaskResult | dict[str, Any] | list[Any]] = None
    error: Optional[str] = None
    failed_files: Optional[list[str]] = None
