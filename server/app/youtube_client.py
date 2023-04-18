import glob
from models import Section
from moviepy.editor import vfx, VideoFileClip
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


# degrees: positive numbers counterclockwise, negative numbers clockwise.
def process_video(input_filename, as_gif, degrees, mirror_horizontal, mirror_vertical):
    clip = VideoFileClip(input_filename)
    if degrees is not None:
        clip = clip.rotate(degrees)
    if mirror_horizontal:
        clip = clip.fx(vfx.mirror_x)
    if mirror_vertical:
        clip = clip.fx(vfx.mirror_y)
    path = Path(input_filename)
    output_filename = None
    if as_gif:
        output_filename = f"{temp_dir}{path.stem}.gif"
        clip.write_gif(output_filename, fps=10)
    else:
        output_filename = f"{temp_dir}{path.stem}_processed{path.suffix}"
        clip.write_videofile(output_filename)
    try_delete_file(input_filename)
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
             rotation: int = None,
             mirror_horizontal: bool = None,
             mirror_vertical: bool = None) -> str:
    ytdl_params = {
        # for audio, prefer m4a or mp4 if available since mobile devices can play
        # those but not e.g. webm
        'format': 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio' if media_type == 'audio' else 'best'
    }
    download_as_gif = media_type == 'gif'
    visual_format = download_as_gif or media_type == 'video'
    orientation_required = visual_format and (rotation is not None or mirror_horizontal or mirror_vertical)
    file_id = uuid.uuid4()
    filename_prefix = f"{file_id}_"
    if len(sections) > 0:
        ytdl_params['outtmpl'] = temp_dir + filename_prefix + "%(section_title)s.%(ext)s"
        ytdl_params['download_ranges'] = (lambda _1, _2: sections_to_download_ranges(sections))
    else:
        ytdl_params['outtmpl'] = f"{temp_dir}{file_id}.%(ext)s"
    with YoutubeDL(ytdl_params) as ytdl:
        error = ytdl.download([youtube_url(video_id)])
        if len(sections) > 1:
            filenames = find_files(file_id)
            zip_filename = f"{temp_dir}files.zip"
            with ZipFile(zip_filename, 'w') as zip_file:
                processed_filenames = []
                for f in filenames:
                    written_filename = f
                    if orientation_required or download_as_gif:
                        written_filename = process_video(f, download_as_gif, rotation, mirror_horizontal, mirror_vertical)
                        processed_filenames.append(written_filename)
                    section_name = Path(f).stem[len(filename_prefix):]
                    zip_file.write(written_filename, arcname=f"{section_name}{Path(written_filename).suffix}")
                    try_delete_file(written_filename)
            return zip_filename

        main_filename = find_files(file_id)[0]
        if orientation_required or download_as_gif:
            main_filename = process_video(main_filename, download_as_gif, rotation, mirror_horizontal, mirror_vertical)
        return main_filename


# get_meta('1pi9t3dnAXs')

# # download example
#d = download('2dNGPkoDzh0', sections=None, include_video=False)
#print(f"d: {d}")

#with YoutubeDL() as ydl:
#    info = ydl.extract_info(youtube_url('1pi9t3dnAXs'), download=False)
#    ydl.list_formats(info)
#
