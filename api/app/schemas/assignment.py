from pydantic import BaseModel
from typing import List, Dict

class BulkAssignRequest(BaseModel):
    """Request schema for bulk text assignment."""
    text_ids: List[int]
    usernames: List[str]

class BulkAssignmentResponse(BaseModel):
    message: str
    assignments: Dict[str, int]
    totalTexts: int
    totalUsers: int

class BulkUnassignmentResponse(BaseModel):
    message: str
    unassignments: Dict[str, int]
    totalTexts: int
    totalUsers: int
