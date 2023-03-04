from flask import Flask, request, Response, send_file
import json
from youtube_download_server.youtube_client import download, get_meta

'''
Env vars:
- FLASK_APP=youtube-dl-mixtape
- FLASK_ENV=development
'''

# create and configure the app
app = Flask(__name__, instance_relative_config=True)


@app.route('/meta/<video_id>')
def get_meta_for_video(video_id):
    info = get_meta(video_id)
    response = Response(json.dumps(info), mimetype="application/json")
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


@app.route('/download', methods=['POST'])
def download_video_by_id():
    body = request.get_json(force=True)
    print("post body: " + str(body))
    video_id = body['video-id']
    filename = body['filename']
    include_video = body.get('include-video', False)
    # TODO return bad request if missing params or wrong types

    # TODO optionally take sections and handle with download

    downloaded = download(video_id)
    #response.headers['Access-Control-Allow-Origin'] = '*'
    return send_file(
        as_attachment=True,
        path_or_file=downloaded,
        download_name=filename,
        mimetype='video/mp4' # TODO might actually be webm
    )


if __name__ == "__main__":
    app.run()
