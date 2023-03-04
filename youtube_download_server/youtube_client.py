from contextlib import redirect_stdout
import io
from yt_dlp import YoutubeDL


# TODO use for sections
def sections_filter(info_dict, ydl):
    # return  -> Iterable[Section].
    #print("sections filter returning " + str(info_dict['chapters']))
    return [info_dict['chapters'][1]]


def youtube_url(video_id):
    return f"https://youtube.com/watch?v={video_id}"


def get_meta(video_id):
    with YoutubeDL() as ydl:
        info = ydl.extract_info(youtube_url(video_id), download=False)
        return {'title': info['title'],
                'length': info['duration'],
                'sections': [{'start': c['start_time'], 'end': c['end_time'], 'name': c['title']}
                             for c in info['chapters']]}


# returns a BytesIO buffer
def download(video_id):
    # redirect stdout to get data in-memory as a buffer to return instead of a file
    buffer = io.BytesIO()
    ytdl_params = {
        "outtmpl": "-",
        'logtostderr': True
        # 'download_ranges': sections_filter
    }
    with redirect_stdout(buffer), YoutubeDL(ytdl_params) as ydl:
        ydl.download([youtube_url(video_id)])
        return buffer


# get_meta('1pi9t3dnAXs')

# download example
#d = download('qz1EpqwMmf4')
#print("buffer value type: " + str(type(d.getvalue())))
#from pathlib import Path
#Path("test.mp4").write_bytes(d.getvalue())
