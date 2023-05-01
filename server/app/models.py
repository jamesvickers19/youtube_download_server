from pydantic import BaseModel


class Section(BaseModel):
    start: float
    end: float
    name: str


class ProcessingParameters(BaseModel):
    reflect_horizontal: bool = None
    reflect_vertical: bool = None
    black_and_white: bool = None
    playback_speed: float = None
