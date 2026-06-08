from pydantic import BaseModel

class OCRUploadResponse(BaseModel):
    job_id: str
