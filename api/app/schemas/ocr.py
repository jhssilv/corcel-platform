from pydantic import BaseModel

class OCRUploadResponse(BaseModel):
    task_id: str
