# Run locally, from `app` folder; the variables come from the `.env` file in the parent directory

```commandline
PROXY_ADDRESS=something PROXY_USER=something PROXY_PASSWORD=password uvicorn main:app --proxy-headers --host 0.0.0.0 --port 8080
```

# Run with OpenTelemetry to HoneyComb:

```powershell
$env:OTEL_SERVICE_NAME = 'youtube-downloader-server'; $env:OTEL_EXPORTER_OTLP_PROTOCOL = 'grpc'; $env:OTEL
_EXPORTER_OTLP_ENDPOINT = 'https://api.honeycomb.io'; $env:OTEL_EXPORTER_OTLP_HEADERS = 'x-honeycomb-team=my-api-key'; opentelemetry-instrument uvicorn main:app --proxy-headers --host 0.0.0.0 --port 8080
```

Or with docker:

```bash
docker build -t server . && docker run --rm -p 8080:8080 server
```

Or with docker compose (in parent directory):

```bash
docker compose up -d --build
```

# Example requests

Download one video:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"video_id": "2dNGPkoDzh0", "filename": "output", "media_type": "video"}' -o test.mp4 localhost:8080/download_video
```

Download one video with post-processing:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"video_id": "2dNGPkoDzh0", "filename": "output", "media_type": "video", "processing": {"reflect_horizontal": true}}' -o test.mp4 localhost:8080/download_video
```

Download one video into two sections with post-processing:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"video_id": "2dNGPkoDzh0", "filename": "output", "media_type": "video", "processing": {"reflect_horizontal": true}, "sections": [{"start": 0.5, "end": 1.2, "name": "one"}, {"start": 1.0, "end": 2.5, "name": "two"}]}' -o test.zip localhost:8080/download_video
```

Download one video into two audio sections:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"video_id": "2dNGPkoDzh0", "filename": "output", "media_type": "audio", "sections": [{"start": 0.5, "end": 1.2, "name": "one"}, {"start": 1.0, "end": 2.5, "name": "two"}]}' -o test.zip localhost:8080/download_video
```