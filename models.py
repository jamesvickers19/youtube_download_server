from pydantic import BaseModel


class Section(BaseModel):
    start: int
    end: int
    name: str
