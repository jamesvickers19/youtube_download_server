from fastapi import BackgroundTasks, FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from models import Section
import os
from pydantic import BaseModel
from typing import List
from youtube_client import download, get_meta

app = FastAPI()


def try_delete_files(filenames):
    for f in filenames:
        try:
            os.remove(f)
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
    include_video: bool = False
    sections: List[Section] = []


@app.post('/download')
def download_video_by_id(request: DownloadRequest, background_tasks: BackgroundTasks):
    # Download video
    print(f"request: {request}")
    download_result = download(request.video_id, request.sections, request.include_video)
    # Cleanup downloaded files
    background_tasks.add_task(try_delete_files, [download_result.main_filename] + download_result.downloaded_files)
    extension = get_extension(download_result.main_filename)[1:]  # leave off the starting . in the extension
    mimetype =\
        "application/zip" if len(request.sections) > 0\
        else f"{'video' if request.include_video else 'audio'}/{extension}"

    download_name = f"{request.filename}.{extension}"
    return FileResponse(path=download_result.main_filename, filename=download_name, media_type=mimetype)


# This has to be after route definitions or apparently it overrides
# the other routes and makes them 404
app.mount("/", StaticFiles(directory="frontend/build", html=True), name="static")
