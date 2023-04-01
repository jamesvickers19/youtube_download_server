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


def convert_vid_to_gif(input_filename, output_filename):
    clip = VideoFileClip(input_filename)
    clip.write_gif(output_filename, fps=24)


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


def download(video_id: str, sections: List[Section], media_type: str) -> DownloadResult:
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
    with YoutubeDL(ytdl_params) as ytdl:
        error = ytdl.download([youtube_url(video_id)])
        if len(sections) > 1:
            filenames = find_files(file_id)
            zip_filename = f"{temp_dir}files.zip"
            gif_files = []
            with ZipFile(zip_filename, 'w') as zip_file:
                for f in filenames:
                    path = Path(f)
                    section_name = path.stem[len(filename_prefix):]
                    if download_as_gif:
                        gif_file = f"{temp_dir}{path.stem}.gif"
                        gif_files.append(gif_file)
                        convert_vid_to_gif(f, gif_file)
                        zip_file.write(gif_file, arcname=f"{section_name}.gif")
                    else:
                        zip_file.write(f, arcname=f"{section_name}{path.suffix}")
            return DownloadResult(main_filename=zip_filename, downloaded_files=filenames + gif_files)

        downloaded = find_files(file_id)[0]
        if download_as_gif:
            path = Path(downloaded)
            gif_file = f"{temp_dir}{path.stem}.gif"
            convert_vid_to_gif(downloaded, gif_file)
            return DownloadResult(main_filename=gif_file, downloaded_files=[downloaded])
        return DownloadResult(main_filename=find_files(file_id)[0])


# get_meta('1pi9t3dnAXs')

# # download example
#d = download('2dNGPkoDzh0', sections=None, include_video=False)
#print(f"d: {d}")

#with YoutubeDL() as ydl:
#    info = ydl.extract_info(youtube_url('1pi9t3dnAXs'), download=False)
#    ydl.list_formats(info)
#
# #############################################################################
#
# # figuring out sections:
#
# # right now only writing first section to file?  (4 second video)
# # probably just overwriting the file and ending up with one
# # might work if streaming to stdout
# # if this setup doesn't work or stdout splitting is a problem,
# # could call download multiple times with one section each time?
#
# # A callback function that gets called for every video with
# # the signature (info_dict, ydl) -> Iterable[Section].
# # Only the returned sections will be downloaded.
# # Each Section is a dict with the following keys:
# #   * start_time: Start time of the section in seconds
# #   * end_time: End time of the section in seconds
# #   * title: Section title (Optional)
# #   * index: Section number (Optional)
# example_sections = [{'name': 'one', 'start': 1, 'end': 4},
#                     {'name': 'two', 'start': 5, 'end': 12}]
#
#
# def sections_to_download_ranges(sections):
#     return [{'start_time': s['start'], 'end_time': s['end'], 'title': s['name']}
#             for s in sections]
#
# ytdl_params = {
#  'format': 'bestvideo',
#  'outtmpl': '-',  # output stream to stdout
#  'logtostderr': True,
#  'download_ranges': (lambda _1, _2: sections_to_download_ranges(example_sections))
# }
# with YoutubeDL(ytdl_params) as ytdl:
#     ytdl.download(["https://www.youtube.com/watch?v=pvkTC2xIbeY"])
