import glob
from models import ProcessingParameters, Section
from moviepy.editor import vfx, VideoFileClip
import os
from pathlib import Path
import platform
from typing import List
import uuid
from zipfile import ZipFile

from yt_dlp import YoutubeDL

temp_dir = "C:\\Users\\james\\AppData\\Local\\Temp\\" if platform.system() == 'Windows' else "/tmp/"


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


def sections_to_download_ranges(sections):
    return [{'start_time': s.start, 'end_time': s.end, 'title': s.name.replace(' ', '_')}
            for s in sections]


def get_video_meta(video_id):
    with YoutubeDL() as ydl:
        info = ydl.extract_info(youtube_video_url(video_id), download=False)
        return {'title': info['title'],
                'duration': info.get('duration', None),
                'sections': [{'start': c['start_time'], 'end': c['end_time'], 'name': c['title']}
                             for c in (info['chapters'] or [])]}


def get_playlist_meta(playlist_id):
    ytdl_params = {'extract_flat': True}
    with YoutubeDL(ytdl_params) as ydl:
        info = ydl.extract_info(youtube_playlist_url(playlist_id), download=False)
        return {'title': info['title'],
                'playlistVideos': info.get('entries')}


def find_files(filename):
    return glob.glob(f"{temp_dir}{filename}*")


def download_video(video_id: str,
                   media_type: str,
                   sections=None,
                   processing: ProcessingParameters = None) -> str:
    if sections is None:
        sections = []
    ytdl_params = {
        # for audio, prefer m4a or mp4 if available since mobile devices can play
        # those but not e.g. webm
        'format': 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio' if media_type == 'audio' else 'best'
    }
    download_as_gif = media_type == 'gif'
    file_id = uuid.uuid4()
    filename_prefix = f"{file_id}_"
    if len(sections) > 0:
        ytdl_params['outtmpl'] = temp_dir + filename_prefix + "%(section_title)s.%(ext)s"
        ytdl_params['download_ranges'] = (lambda _1, _2: sections_to_download_ranges(sections))
    else:
        ytdl_params['outtmpl'] = f"{temp_dir}{file_id}.%(ext)s"
    processing_required = processing is not None or download_as_gif
    with YoutubeDL(ytdl_params) as ytdl:
        error = ytdl.download([youtube_video_url(video_id)])
        if len(sections) > 1:
            filenames = find_files(file_id)
            zip_filename = f"{temp_dir}{filename_prefix}files.zip"
            with ZipFile(zip_filename, 'w') as zip_file:
                processed_filenames = []
                for f in filenames:
                    written_filename = f
                    if processing_required:
                        written_filename = do_processing(f, download_as_gif, processing)
                        processed_filenames.append(written_filename)
                    section_name = Path(f).stem[len(filename_prefix):]
                    zip_file.write(written_filename, arcname=f"{section_name}{Path(written_filename).suffix}")
                    try_delete_file(written_filename)
            return zip_filename

        main_filename = find_files(file_id)[0]
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
            # for audio, prefer m4a or mp4 if available since mobile devices can play
            # those but not e.g. webm
            'format': 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio' if media_type == 'audio' else 'best',
            'outtmpl': f"{temp_dir}{file_id}_%(title)s.%(ext)s"
        }
        with YoutubeDL(ytdl_params) as ytdl:
            error = ytdl.download([youtube_video_url(video_id)])
            filenames.append(find_files(file_id)[0])
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

# with YoutubeDL() as ydl:
#    info = ydl.extract_info(youtube_video_url('WLzqIuk5684'), download=False)
#

# https://www.youtube.com/watch?v=BjbX-o8w9k8
# https://www.youtube.com/playlist?list=PLxA687tYuMWhDQXyn_kRwBJRwkDA3FQF1
# with YoutubeDL({'extract_flat': True}) as ydl:
#    info = ydl.extract_info('https://www.google.com', download=False)
#    print(f"info: {info}")
#    #ydl.list_formats(info)
#

# info has 'entries', an array of dicts each with
# 'id' (video id), 'url', 'title', 'duration' (int seconds)
# when not a playlist, there is no 'entries' key in info