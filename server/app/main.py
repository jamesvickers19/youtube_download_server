from fastapi import BackgroundTasks, FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from models import ProcessingParameters, Section
import os
from pydantic import BaseModel
from typing import List
from youtube_client import download_video, download_videos, get_playlist_meta, get_video_meta
import re

app = FastAPI()


def sanitize_filename(filename):
    # Replace any non-alphanumeric characters (except dot, dash, and underscore) with underscore
    return re.sub(r'[^a-zA-Z0-9._-]', '_', filename)


def try_delete_file(filename):
    try:
        os.remove(filename)
    except Exception as ex:
        print(ex)


@app.get('/video_meta/{video_id}')
def get_meta_for_video(video_id):
    return get_video_meta(video_id)


@app.get('/playlist_meta/{playlist_id}')
def get_meta_for_playlist(playlist_id):
    return get_playlist_meta(playlist_id)


def get_extension(filename):
    _, extension = os.path.splitext(filename)
    return extension


@app.options('/download_video')
def download_video_by_id_options():
    return ''


class DownloadVideoRequest(BaseModel):
    video_id: str
    filename: str
    media_type: str
    sections: List[Section] = []
    processing: ProcessingParameters = None


@app.post('/download_video')
def download_video_by_id(request: DownloadVideoRequest, background_tasks: BackgroundTasks):
    # Download video
    downloaded_file = download_video(
        video_id=request.video_id,
        media_type=request.media_type,
        sections=request.sections,
        processing=request.processing)
    # Cleanup downloaded file after the request
    background_tasks.add_task(try_delete_file, downloaded_file)
    extension = get_extension(downloaded_file)[1:]  # leave off the starting . in the extension
    if len(request.sections) > 0:
        mimetype = "application/zip"
    elif request.media_type == 'gif':
        mimetype = "image/gif"
    else:
        mimetype = f"{request.media_type}/{extension}"

    download_name = f"{sanitize_filename(request.filename)}.{extension}"
    return FileResponse(path=downloaded_file, filename=download_name, media_type=mimetype)


@app.options('/download_videos')
def download_videos_by_ids_options():
    return ''


class DownloadVideosRequest(BaseModel):
    video_ids: List[str]
    filename: str
    media_type: str


@app.post('/download_videos')
def download_videos_by_ids(request: DownloadVideosRequest, background_tasks: BackgroundTasks):
    # Download videos
    downloaded_file = download_videos(video_ids=request.video_ids, media_type=request.media_type)
    # Cleanup downloaded file after the request
    background_tasks.add_task(try_delete_file, downloaded_file)
    extension = get_extension(downloaded_file)[1:]  # leave off the starting . in the extension
    if len(request.video_ids) > 0:
        mimetype = "application/zip"
    else:
        mimetype = f"{request.media_type}/{extension}"

    download_name = f"{sanitize_filename(request.filename)}.{extension}"
    return FileResponse(path=downloaded_file, filename=download_name, media_type=mimetype)


# This has to be after route definitions or apparently it overrides
# the other routes and makes them 404
app.mount("/", StaticFiles(directory="static", html=True), name="static")
