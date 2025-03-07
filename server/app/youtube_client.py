import glob
import subprocess

from models import ProcessingParameters, Section
from moviepy.editor import vfx, VideoFileClip
import os
from pathlib import Path
import platform
from typing import List
import uuid
from zipfile import ZipFile

from yt_dlp import YoutubeDL


def throw_if_env_not_set(var_name):
    val = os.environ.get(var_name)
    if val is None or len(val) == 0:
        raise Exception(f"Environment variable {var_name} not set, val: {val}")
    return val


temp_dir = "C:\\Users\\james\\AppData\\Local\\Temp\\" if platform.system() == 'Windows' else "/tmp/"
proxy_address = throw_if_env_not_set('PROXY_ADDRESS')
proxy_user = throw_if_env_not_set('PROXY_USER')
proxy_password = throw_if_env_not_set('PROXY_PASSWORD')


def build_ytdl_params(ytdl_params=None):
    if ytdl_params is None:
        ytdl_params = {}
    ytdl_params['proxy'] = f"https://{proxy_user}:{proxy_password}@{proxy_address}"
    ytdl_params['verbose'] = True
    return ytdl_params


def build_youtube_dl_client(ytdl_params=None):
    return YoutubeDL(build_ytdl_params(ytdl_params))


def youtube_video_url(video_id):
    return f"https://youtube.com/watch?v={video_id}"


def youtube_playlist_url(playlist_id):
    return f"https://youtube.com/playlist?list={playlist_id}"


def try_delete_file(filename):
    try:
        os.remove(filename)
    except Exception as ex:
        print(ex)


def do_processing(input_filename: str, as_gif: bool, processing: ProcessingParameters):
    clip = VideoFileClip(input_filename)
    if processing is not None:
        if processing.reflect_horizontal:
            clip = clip.fx(vfx.mirror_x)
        if processing.reflect_vertical:
            clip = clip.fx(vfx.mirror_y)
        if processing.playback_speed:
            clip = clip.fx(vfx.speedx, factor=processing.playback_speed)
        if processing.black_and_white:
            clip = clip.fx(vfx.blackwhite)
    path = Path(input_filename)
    if as_gif:
        output_filename = f"{temp_dir}{path.stem}.gif"
        clip.write_gif(output_filename, fps=30)
    else:
        output_filename = f"{temp_dir}{path.stem}_processed{path.suffix}"
        clip.write_videofile(output_filename)
    try_delete_file(input_filename)
    return output_filename


def get_video_meta(video_id):
    with build_youtube_dl_client() as ydl:
        info = ydl.extract_info(youtube_video_url(video_id), download=False)
        return {'title': info['title'],
                'duration': info.get('duration', None),
                'isLive': info.get('is_live', False),
                'wasLive': info.get('was_live', False),
                'sections': [{'start': c['start_time'], 'end': c['end_time'], 'name': c['title']}
                             for c in (info['chapters'] or [])]}


def get_playlist_meta(playlist_id):
    ytdl_params = {'extract_flat': True}
    with build_youtube_dl_client(ytdl_params) as ydl:
        info = ydl.extract_info(youtube_playlist_url(playlist_id), download=False)
        return {'title': info['title'],
                'playlistVideos': info.get('entries')}


def find_files(filename):
    return glob.glob(f"{temp_dir}{filename}*")


def find_one_file_or_throw(filename):
    found = find_files(filename)
    if len(found) == 1:
        return found[0]
    raise Exception(f"Could not find one file with name {filename}; found {len(found)}")


def cut_sections(input_file, filename_prefix, sections: List[Section]):
    file_ext = os.path.splitext(input_file)[1]

    for s in sections:
        output_file = f"{temp_dir}{filename_prefix}{s.name.replace(' ', '_')}{file_ext}"
        command = [
            "ffmpeg", "-i", input_file,  # Input file
            "-ss", str(s.start),  # Start time
            "-t", str(s.end - s.start),  # Duration
            "-y",  # do not ask for confirmation
            "-avoid_negative_ts", "1",
            "-acodec", "copy",
            output_file  # Output file
        ]

        subprocess.run(command)


def ytdl_format_string(media_type: str):
    # for audio, prefer m4a or mp4 if available since mobile devices can play
    # those but not e.g. webm
    if media_type == 'audio':
        return 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio'
    # disabling this because it can cause very large videos and make the server run out of memory
    # if media_type == 'best_video':
    #     # get mp4 video, which is recognized better by e.g. iOS.
    #     return 'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4] / bv*+ba/b'
    # 'best' seems to actually be pretty low quality videos, which are fast to download.
    return 'best'


def download_video(video_id: str,
                   media_type: str,
                   sections=None,
                   processing: ProcessingParameters = None) -> str:
    if sections is None:
        sections = []
    file_id = uuid.uuid4()
    filename_prefix = f"{file_id}_"
    ytdl_params = {
        'format': ytdl_format_string(media_type),
        'outtmpl': f"{temp_dir}{filename_prefix}%(section_title)s.%(ext)s" if len(sections) > 0 else f"{temp_dir}{file_id}.%(ext)s"
    }
    download_as_gif = media_type == 'gif'
    processing_required = (processing is not None and media_type == 'video') or download_as_gif
    with build_youtube_dl_client(ytdl_params) as ytdl:
        error = ytdl.download([youtube_video_url(video_id)])
    downloaded_filename = find_one_file_or_throw(file_id)
    if len(sections) > 0:
        cut_sections(downloaded_filename, filename_prefix, sections)
        try_delete_file(downloaded_filename)
        if len(sections) == 1:
            # special case of one section; do not make a zip, find the sectioned file and move on.
            downloaded_filename = find_one_file_or_throw(file_id)
        else:
            zip_filename = f"{temp_dir}{filename_prefix}files.zip"
            files_to_zip = find_files(file_id)
            with ZipFile(zip_filename, 'w') as zip_file:
                processed_filenames = []
                for f in files_to_zip:
                    written_filename = f
                    if processing_required:
                        written_filename = do_processing(f, download_as_gif, processing)
                        processed_filenames.append(written_filename)
                    section_name = Path(f).stem[len(filename_prefix):]
                    zip_file.write(written_filename, arcname=f"{section_name}{Path(written_filename).suffix}")
                    try_delete_file(written_filename)
            return zip_filename

    main_filename = downloaded_filename
    if processing_required:
        main_filename = do_processing(main_filename, download_as_gif, processing)
    return main_filename


def download_videos(video_ids: List[str], media_type: str) -> str:
    if len(video_ids) == 1:
        return download_video(video_ids[0], media_type=media_type)

    filenames = []
    for video_id in video_ids:
        file_id = uuid.uuid4()
        ytdl_params = {
            'format': ytdl_format_string(media_type),
            'outtmpl': f"{temp_dir}{file_id}_%(title)s.%(ext)s"
        }
        with build_youtube_dl_client(ytdl_params) as ytdl:
            error = ytdl.download([youtube_video_url(video_id)])
            filenames.append(find_one_file_or_throw(file_id))
    zip_filename = f"{temp_dir}{uuid.uuid4()}_files.zip"
    filename_prefix_len = len(f"{uuid.uuid4()}_")
    with ZipFile(zip_filename, 'w') as zip_file:
        for f in filenames:
            video_title = Path(f).stem[filename_prefix_len:].replace(" ", "_")
            zip_file.write(f, arcname=f"{video_title}{Path(f).suffix}")
            try_delete_file(f)
    return zip_filename


# m = get_video_meta('WLzqIuk5684')

# # download example
# d = download(video_id='2dNGPkoDzh0', sections=[], media_type='gif', processing=None)
# print(f"d: {d}")

# with build_youtube_dl_client() as ydl:
#    info = ydl.extract_info(youtube_video_url('WLzqIuk5684'), download=False)
#

# https://www.youtube.com/watch?v=BjbX-o8w9k8
# https://www.youtube.com/playlist?list=PLxA687tYuMWhDQXyn_kRwBJRwkDA3FQF1
# with build_youtube_dl_client({'extract_flat': True}) as ydl:
#    info = ydl.extract_info('https://www.google.com', download=False)
#    print(f"info: {info}")
#    #ydl.list_formats(info)
#

# info has 'entries', an array of dicts each with
# 'id' (video id), 'url', 'title', 'duration' (int seconds)
# when not a playlist, there is no 'entries' key in info