
run server with reload: uvicorn main:app --reload
(From anaconda shell)

build frontend with 'yarn build', then copy build folder under frontend in here:
cp -r build/ ~/PycharmProjects/youtube_download_server/server/app/frontend/

move code to deployment: scp -r server root@143.198.76.231:/youtube-downloader/

TODO:

- weird filenames coming back from download

- build script(s)?

- move frontend code into this repo?

- clean up environment / dependencies?  Use virtualenv?  Latest python?