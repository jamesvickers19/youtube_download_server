from flask import Flask, request, Response, send_file, after_this_request
import json
import os
from youtube_download_server.youtube_client import download, get_meta


# TODO how will this work during deployment
app = Flask(__name__,
            instance_relative_config=True,
            static_url_path='',
            static_folder='frontend/build')


def try_delete_file(filename):
    try:
        # TODO always getting 'file being used by another process'
        # not sure if this would happen on linux though
        os.remove(filename)
    except Exception as ex:
        print(ex)


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

    # Extract request body
    body = request.get_json(force=True)
    video_id = body['video-id']
    filename = body['filename']
    sections = body.get('sections', None)
    include_video = body.get('include-video', False)

    # Download video
    download_result = download(video_id, sections, include_video)
    main_filename = download_result['main_filename']
    downloaded_files = download_result.get('downloaded_files', [])

    @after_this_request
    def delete_file(response):
        # Cleanup downloaded files
        try_delete_file(main_filename)
        for f in downloaded_files:
            try_delete_file(f)
        return response

    extension = get_extension(main_filename)[1:]  # leave off the starting . in the extension
    mimetype =\
        "application/zip" if sections is not None\
        else f"{'video' if include_video else 'audio'}/{extension}"

    #response.headers['Access-Control-Allow-Origin'] = '*'

    download_name = f"{filename}.{extension}"
    return send_file(
        as_attachment=True,
        path_or_file=main_filename,
        download_name=download_name,
        mimetype=mimetype
    )


if __name__ == "__main__":
    app.run()
