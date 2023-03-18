from flask import Flask, request, Response, send_file, after_this_request
import json
import os
from youtube_download_server.youtube_client import download, get_meta


# TODO how will this work during deployment
app = Flask(__name__,
            instance_relative_config=True,
            static_url_path='',
            static_folder='frontend/build')


@app.route('/meta/<video_id>')
def get_meta_for_video(video_id):
    info = get_meta(video_id)
    response = Response(json.dumps(info), mimetype="application/json")
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response


def get_extension(filename):
    _, extension = os.path.splitext(filename)
    return extension


@app.route('/download', methods=['OPTIONS', 'POST'])
def download_video_by_id():
    if request.method == 'OPTIONS':
        return Response('')

    body = request.get_json(force=True)
    video_id = body['video-id']
    filename = body['filename']
    sections = body.get('sections', None)
    include_video = body.get('include-video', False)
    # TODO return bad request if missing params or wrong types

    downloaded_path = download(video_id, sections, include_video)

    @after_this_request
    def delete_file(response):
        try:
            # TODO always getting 'file being used by another process'
            # not sure if this would happen on linux though
            os.remove(downloaded_path)
        except Exception as ex:
            print(ex)
        return response

    extension = get_extension(downloaded_path)[1:]  # leave off the starting . in the extension
    mimetype = f"{'video' if include_video else 'audio'}/{extension}"

    #response.headers['Access-Control-Allow-Origin'] = '*'
    return send_file(
        as_attachment=True,
        path_or_file=downloaded_path,
        download_name=filename,
        mimetype=mimetype
    )


if __name__ == "__main__":
    app.run()
