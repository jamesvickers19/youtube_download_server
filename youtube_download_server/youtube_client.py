import glob
import platform
import uuid
from yt_dlp import YoutubeDL


temp_folder = "C:\\Users\\james\\AppData\\Local\\Temp\\" if platform.system() is 'Windows' else "/tmp/"


def youtube_url(video_id):
    return f"https://youtube.com/watch?v={video_id}"


def get_meta(video_id):
    with YoutubeDL() as ydl:
        info = ydl.extract_info(youtube_url(video_id), download=False)
        print("info: " + str(info))
        return {'title': info['title'],
                'length': info['duration'],
                'sections': [{'start': c['start_time'], 'end': c['end_time'], 'name': c['title']}
                             for c in info['chapters']]}


def find_file(filename):
    return glob.glob(f"C:\\Users\\james\\AppData\\Local\\Temp\\{filename}.*")[0]


def download(video_id, sections, include_video):
    format_str = 'best' if include_video else 'bestaudio'
    file_id = uuid.uuid4()
    ytdl_params = {
        'format': format_str,
        'outtmpl': f"{temp_folder}{file_id}.%(ext)s",
        'verbose': True
        # 'download_ranges': sections_filter
    }
    with YoutubeDL(ytdl_params) as ytdl:
        error = ytdl.download([youtube_url(video_id)])
        return find_file(file_id)


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
