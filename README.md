
run server with reload: uvicorn main:app --reload
(From anaconda shell)

build frontend with 'yarn build', then copy build folder under frontend in here:
cp -r build/ ~/PycharmProjects/youtube_download_server/server/app/frontend/

move code to deployment: scp -r server root@143.198.76.231:/youtube-downloader/

TODO:

- handle downloaded filename better
    - frontend provides filename, server replaces spaces with underscores to encode better
    - other characters like '|' also cause a weird filename

- audio downloaded as webm, iOS can't play?  Maybe specify best audio that is mp3/mp4?

- build script(s)?

- move frontend code into this repo?  Currently in C:\Users\james\Desktop\clojure\youtube-downloader\frontend
  
- clean up environment / dependencies?  Use virtualenv?  Latest python?