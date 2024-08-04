# Run locally, from `app` folder; the variables come from the `.env` file in the parent directory

```commandline
PROXY_ADDRESS=something PROXY_USER=something PROXY_USER=password uvicorn main:app --proxy-headers --host 0.0.0.0 --port 8080
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