from fastapi import BackgroundTasks, FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from models import Section
import os
from pydantic import BaseModel
from typing import List
from youtube_client import download, get_meta

app = FastAPI()


def try_delete_file(filename):
    try:
        os.remove(filename)
    except Exception as ex:
        print(ex)


@app.get('/meta/{video_id}')
def get_meta_for_video(video_id):
    return get_meta(video_id)


def get_extension(filename):
    _, extension = os.path.splitext(filename)
    return extension


@app.options('/download')
def download_video_by_id_options():
    return ''


class DownloadRequest(BaseModel):
    video_id: str
    filename: str
    media_type: str
    sections: List[Section] = []
    reflection: str = None
    rotation: int = None


@app.post('/download')
def download_video_by_id(request: DownloadRequest, background_tasks: BackgroundTasks):
    # Download video
    downloaded_file = download(
        video_id=request.video_id,
        sections=request.sections,
        media_type=request.media_type,
        rotation=request.rotation,
        mirror_horizontal=request.reflection == 'horizontal',
        mirror_vertical=request.reflection == 'vertical')
    # Cleanup downloaded file after the request
    background_tasks.add_task(try_delete_file, downloaded_file)
    extension = get_extension(downloaded_file)[1:]  # leave off the starting . in the extension
    mimetype = ''
    if len(request.sections) > 0:
        mimetype = "application/zip"
    elif request.media_type == 'audio' or request.media_type == 'video':
        mimetype = f"{request.media_type}/{extension}"
    else:
        mimetype = "image/gif"

    download_name = f"{request.filename.replace(' ', '_')}.{extension}"
    return FileResponse(path=downloaded_file, filename=download_name, media_type=mimetype)


# This has to be after route definitions or apparently it overrides
# the other routes and makes them 404
app.mount("/", StaticFiles(directory="static", html=True), name="static")
