from pydantic import BaseModel, Field
from typing import List

class DownloadRequest(BaseModel):
    """Schema for the download request body."""
    text_ids: List[int] = Field(..., json_schema_extra={"example": [1, 2, 3]}, description="List of text IDs to download.")
    use_tags: bool = Field(False, description="Whether to use tags in the normalized tokens.")

class ReportRequest(BaseModel):
    """Schema for the report request body."""
    text_ids: List[int] = Field(..., json_schema_extra={"example": [1, 2, 3]}, description="List of text IDs to generate the report for.")
