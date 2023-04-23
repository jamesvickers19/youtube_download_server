from pydantic import BaseModel


class Section(BaseModel):
    start: float
    end: float
    name: str
