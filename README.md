
run server with reload: uvicorn main:app --reload
(From anaconda shell)

build frontend and copy into server as static files: build_frontend.sh

move code to deployment: scp -r server root@143.198.76.231:/youtube-downloader/

TODO:

- handle downloaded filename better
    - don't provide filename from frontend
    - name downloaded file as video title when full download
      (wrapping in quotes if spaces present)
    - name downloaded file as video title with section ranges when one section
    - for downloading chapters, name files in zip with chapter names
      (wrapping in quotes if spaces present)

- audio downloaded as webm, iOS can't play?  Maybe specify best audio that is mp3/mp4?
 
- clean up environment / dependencies?  Use virtualenv?  Latest python?