import glob
from models import Section
from moviepy.editor import VideoFileClip
from pathlib import Path
import platform
from pydantic import BaseModel
from typing import List
import uuid
from zipfile import ZipFile

from yt_dlp import YoutubeDL


temp_dir = "C:\\Users\\james\\AppData\\Local\\Temp\\" if platform.system() == 'Windows' else "/tmp/"


def youtube_url(video_id):
    return f"https://youtube.com/watch?v={video_id}"


def convert_vid_to_gif(input_filename):
    clip = VideoFileClip(input_filename)
    path = Path(input_filename)
    output_filename = f"{temp_dir}{path.stem}.gif"
    clip.write_gif(output_filename, fps=10)
    return output_filename


# positive numbers counterclockwise, negative numbers clockwise.
def rotate_video(degrees, input_filename):
    clip = VideoFileClip(input_filename).rotate(degrees)
    path = Path(input_filename)
    output_filename = f"{temp_dir}{path.stem}_rotated{path.suffix}"
    clip.write_videofile(output_filename)
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


class DownloadResult(BaseModel):
    main_filename: str
    downloaded_files: List[str] = []


def download(video_id: str,
             sections: List[Section],
             media_type: str,
             rotation = None) -> DownloadResult:
    ytdl_params = {
        # for audio, prefer m4a or mp4 if available since mobile devices can play
        # those but not e.g. webm
        'format': 'bestaudio[ext=m4a]/bestaudio[ext=mp3]/bestaudio' if media_type == 'audio' else 'best'
    }
    download_as_gif = media_type == 'gif'
    visual_format = download_as_gif or media_type == 'video'
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
                downloaded_files = filenames.copy()
                for f in filenames:
                    written_filename = f
                    if visual_format and rotation is not None:
                        written_filename = rotate_video(rotation, f)
                        downloaded_files.append(written_filename)
                    if download_as_gif:
                        written_filename = convert_vid_to_gif(written_filename)
                        downloaded_files.append(written_filename)
                    section_name = Path(f).stem[len(filename_prefix):]
                    zip_file.write(written_filename, arcname=f"{section_name}{Path(written_filename).suffix}")
            return DownloadResult(main_filename=zip_filename, downloaded_files=downloaded_files)

        main_filename = find_files(file_id)[0]
        downloaded_files = []
        if visual_format and rotation is not None:
            downloaded_files.append(main_filename)
            main_filename = rotate_video(rotation, main_filename)
        if download_as_gif:
            downloaded_files.append(main_filename)
            main_filename = convert_vid_to_gif(main_filename)
        return DownloadResult(main_filename=main_filename, downloaded_files=downloaded_files)


# get_meta('1pi9t3dnAXs')

# # download example
#d = download('2dNGPkoDzh0', sections=None, include_video=False)
#print(f"d: {d}")

#with YoutubeDL() as ydl:
#    info = ydl.extract_info(youtube_url('1pi9t3dnAXs'), download=False)
#    ydl.list_formats(info)
#
