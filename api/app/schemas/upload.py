from pydantic import BaseModel
from typing import List, Optional

class UploadResponse(BaseModel):
    message: str
    text_ids: List[int]

class TaskStatusResponse(BaseModel):
    state: str
    status: str
    result: Optional[dict] = None
    error: Optional[str] = None
    failed_files: Optional[list] = None
