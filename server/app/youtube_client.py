import glob
from models import ProcessingParameters, Section
from moviepy.editor import AudioFileClip, vfx, VideoFileClip
import os
from pathlib import Path
import platform
from typing import List
import uuid
from zipfile import ZipFile

from yt_dlp import YoutubeDL

temp_dir = "C:\\Users\\james\\AppData\\Local\\Temp\\" if platform.system() == 'Windows' else "/tmp/"


def youtube_url(video_id):
    return f"https://youtube.com/watch?v={video_id}"


def try_delete_file(filename):
    try:
        os.remove(filename)
    except Exception as ex:
        print(ex)


def do_processing(input_filename: str, is_audio: bool, as_gif: bool, processing: ProcessingParameters):
    if is_audio:
        return do_processing_audio(input_filename, processing)

    clip = VideoFileClip(input_filename)
    if processing is not None:
        if processing.reflect_horizontal:
            clip = clip.fx(vfx.mirror_x)
        if processing.reflect_vertical:
            clip = clip.fx(vfx.mirror_y)
        if processing.black_and_white:
            clip = clip.fx(vfx.blackwhite)
        if processing.playback_speed:
            clip = clip.fx(vfx.speedx, factor=processing.playback_speed)
    path = Path(input_filename)
    if as_gif and not is_audio:
        output_filename = f"{temp_dir}{path.stem}.gif"
        clip.write_gif(output_filename, fps=10)
    else:
        output_filename = f"{temp_dir}{path.stem}_processed{path.suffix}"
        clip.write_videofile(output_filename)
    try_delete_file(input_filename)
    return output_filename


def do_processing_audio(input_filename: str, processing: ProcessingParameters):
    clip = AudioFileClip(input_filename)
    if processing.playback_speed:
        clip = clip.fx(vfx.speedx, factor=processing.playback_speed)
    path = Path(input_filename)
    output_filename = f"{temp_dir}{path.stem}_processed{path.suffix}"
    print(f"input: {input_filename}")
    clip.write_audiofile(output_filename) # TODO this not actually writing?
    try_delete_file(input_filename)
    print(f"output: {output_filename}")
    import time
    time.sleep(5000)
    return output_filename


def sections_to_download_ranges(sections):
    return [{'start_time': s.start, 'end_time': s.end, 'title': s.name.replace(' ', '_')}
            for s in sections]


def get_meta(video_id):
    with YoutubeDL() as ydl:
        info = ydl.extract_info(youtube_url(video_id), download=False)
        return {'title': info['title'],
                'length': info['duration'],
                'sections': [{'start': c['start_time'], 'end': c['end_time'], 'name': c['title']}
                             for c in (info['chapters'] or [])]}


def find_files(filename):
    return glob.glob(f"{temp_dir}{filename}*")


def download(video_id: str,
             sections: List[Section],
             media_type: str,
             processing: ProcessingParameters) -> str:
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
    is_audio = media_type == 'audio'
    with YoutubeDL(ytdl_params) as ytdl:
        error = ytdl.download([youtube_url(video_id)])
        if len(sections) > 1:
            filenames = find_files(file_id)
            zip_filename = f"{temp_dir}files.zip"
            with ZipFile(zip_filename, 'w') as zip_file:
                processed_filenames = []
                for f in filenames:
                    written_filename = f
                    if processing_required:
                        written_filename = do_processing(f, is_audio, download_as_gif, processing)
                        processed_filenames.append(written_filename)
                    section_name = Path(f).stem[len(filename_prefix):]
                    zip_file.write(written_filename, arcname=f"{section_name}{Path(written_filename).suffix}")
                    try_delete_file(written_filename)
            return zip_filename

        main_filename = find_files(file_id)[0]
        if processing_required:
            main_filename = do_processing(main_filename, is_audio, download_as_gif, processing)
        return main_filename

# get_meta('1pi9t3dnAXs')

# # download example
# d = download('2dNGPkoDzh0', sections=None, include_video=False)
# print(f"d: {d}")

# with YoutubeDL() as ydl:
#    info = ydl.extract_info(youtube_url('1pi9t3dnAXs'), download=False)
#    ydl.list_formats(info)
#
