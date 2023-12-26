
Live at youtubeslicer.com

run server with reload: uvicorn main:app --reload
(From anaconda shell in 'server/app' folder)

build frontend and copy into server as static files: build_frontend.sh

move code to deployment: scp -r server root@143.198.76.231:/youtube-downloader/
