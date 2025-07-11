import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import { Col, Row } from "antd";
import { ThreeCircles } from "react-loader-spinner";
import { Slider } from "antd";
import VideoSection from "./VideoSection";
import PlaylistVideo from "./PlaylistVideo";
import YouTube from "react-youtube";
import reportWebVitals from "./reportWebVitals";
import { fetchRetry } from "./fetchRetry";

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

const devMode = process.env.REACT_APP_DEV_MODE === "true";
const serverHost = devMode
  ? // local development to pass through to deployed server; must go to this site and enable it
    "https://cors-anywhere.herokuapp.com/https://youtubeslicer.com/"
  : "";

function download(blob, name) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.target = "_blank";
  link.setAttribute("type", "hidden");
  document.body.appendChild(link); // needed for firefox (?)
  link.click();
  link.remove();
}

function getVideoId(text) {
  const youtubeRegex =
    /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  if (!text.match(youtubeRegex)) {
    return null;
  }
  if (!text.startsWith("http://") && !text.startsWith("https://")) {
    text = "https://" + text;
  }
  const url = new URL(text);
  const urlParams = new URLSearchParams(url.search);
  return urlParams.get("v") ?? url.pathname.substring(1);
}

function getPlaylistId(text) {
  const youtubeRegex =
    /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|list\/|playlist\?list=|playlist\?.+&list=))((\w|-){11})(?:\S+)?$/;
  if (!text.match(youtubeRegex)) {
    return null;
  }
  if (!text.startsWith("http://") && !text.startsWith("https://")) {
    text = "https://" + text;
  }
  const url = new URL(text);
  const urlParams = new URLSearchParams(url.search);
  return urlParams.get("list");
}

function postJsonRequestParams(requestData) {
  return {
    method: "POST",
    body: JSON.stringify(requestData),
    headers: { "Content-Type": "application/json" },
  };
}

function toTimeString(totalMilliseconds) {
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const milliseconds =
    totalMilliseconds -
    hours * 60 * 60 * 1000 -
    minutes * 60 * 1000 -
    seconds * 1000;
  const formatTime = (t, places) => String(t).padStart(places, "0");
  let timeStr = `${formatTime(minutes, 2)}:${formatTime(seconds, 2)}`;
  if (hours > 0) {
    timeStr = `${formatTime(hours, 2)}:${timeStr}`;
  }
  if (milliseconds > 0) {
    timeStr += `.${formatTime(milliseconds, 3)}`;
  }
  return timeStr;
}

class StartForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = { url: "", sections: [] };
    this.handleVideoUrlInputChange = this.handleVideoUrlInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onMediaTypeChanged = this.onMediaTypeChanged.bind(this);
    this.onTimeRangeChanged = this.onTimeRangeChanged.bind(this);
    this.handleDownloadEntireVideo = this.handleDownloadEntireVideo.bind(this);
    this.handleDownloadTimeRange = this.handleDownloadTimeRange.bind(this);
    this.handleReflectionInputChange =
      this.handleReflectionInputChange.bind(this);
    this.onBlackAndWhiteSelectedChange =
      this.onBlackAndWhiteSelectedChange.bind(this);
    this.onPlaybackSpeedChanged = this.onPlaybackSpeedChanged.bind(this);
    this.handleDownloadSections = this.handleDownloadSections.bind(this);
    this.handleDownloadSelectedPlaylistVideos =
      this.handleDownloadSelectedPlaylistVideos.bind(this);
    this.onSectionSelectedChange = this.onSectionSelectedChange.bind(this);
    this.onSectionNameChange = this.onSectionNameChange.bind(this);
    this.handleDownloadSection = this.handleDownloadSection.bind(this);
    this.onAllSectionsSelectedChange =
      this.onAllSectionsSelectedChange.bind(this);
    this.onAllPlaylistVideosSelectedChange =
      this.onAllPlaylistVideosSelectedChange.bind(this);
    this.onPlaylistVideoSelectedChange =
      this.onPlaylistVideoSelectedChange.bind(this);
    this.handleDownloadPlaylistVideo =
      this.handleDownloadPlaylistVideo.bind(this);
    this.nullIfNoSections = this.nullIfNoSections.bind(this);
    this.nullIfNoPlaylistVideos = this.nullIfNoPlaylistVideos.bind(this);
    this.downloadFromServer = this.downloadVideoFromServer.bind(this);
  }

  handleVideoUrlInputChange(event) {
    let url = event.target.value;
    let playlistId = getPlaylistId(url);
    let videoId = getVideoId(url);
    this.setState({
      playlistId,
      url,
      videoId,
    });
  }

  downloadVideoFromServer(filename, videoId, sections) {
    let requestData = {
      video_id: videoId,
      media_type: this.state.mediaType || "video",
      filename: filename,
    };
    if (sections) {
      requestData["sections"] = sections;
    }

    let processingParams = {};
    if (this.state.reflection === "horizontal") {
      processingParams["reflect_horizontal"] = true;
    } else if (this.state.reflection === "vertical") {
      processingParams["reflect_vertical"] = true;
    }

    if (this.state.blackAndWhite) {
      processingParams["black_and_white"] = true;
    }

    if (this.state.playbackSpeed && this.state.playbackSpeed !== 1.0) {
      processingParams["playback_speed"] = this.state.playbackSpeed;
    }

    if (Object.keys(processingParams).length > 0) {
      requestData["processing"] = processingParams;
    }

    let requestParams = postJsonRequestParams(requestData);
    let attachmentName = "";
    let errorMsg = "";
    this.setState({
      errorMessage: errorMsg,
      downloading: true,
    });
    fetchRetry(`${serverHost}download_video`, requestParams)
      .then((response) => {
        const header = response.headers.get("Content-Disposition");
        const parts = header.split(";");
        attachmentName = parts[1].split("=")[1].replace(/"/g, "");
        return response.blob();
      })
      .then((blob) => download(blob, attachmentName))
      .catch((error) => {
        console.log(`Error from download endpoint: ${error}`);
        errorMsg = "Error, please try again";
      })
      .finally(() => {
        this.setState({
          downloading: false,
          errorMessage: errorMsg,
        });
      });
  }

  downloadVideosFromServer(filename, video_ids) {
    let requestData = {
      video_ids: video_ids,
      media_type: this.state.mediaType || "video",
      filename: filename,
    };

    let requestParams = postJsonRequestParams(requestData);
    let attachmentName = "";
    let errorMsg = "";
    this.setState({
      errorMessage: errorMsg,
      downloading: true,
    });
    fetchRetry(`${serverHost}download_videos`, requestParams)
      .then((response) => {
        const header = response.headers.get("Content-Disposition");
        const parts = header.split(";");
        attachmentName = parts[1].split("=")[1].replace(/"/g, "");
        return response.blob();
      })
      .then((blob) => download(blob, attachmentName))
      .catch((error) => {
        console.log(`Error from download playlist endpoint: ${error}`);
        errorMsg = "Error, please try again";
      })
      .finally(() => {
        this.setState({
          downloading: false,
          errorMessage: errorMsg,
        });
      });
  }

  handleSubmit(event) {
    let errorMsg = "";
    this.setState({
      errorMessage: errorMsg,
      downloading: true,
    });
    if (this.state.videoId) {
      let fetchedVideoId = this.state.videoId;
      fetchRetry(`${serverHost}video_meta/${fetchedVideoId}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.isLive || data.wasLive) {
            errorMsg = "Live videos are not supported, sorry";
          }

          this.setState({
            title: data.title,
            end: data.duration * 1000, // milliseconds
            downloadTimeStart: 0,
            downloadTimeEnd: data.duration * 1000.0,
            sections: data.sections.map((t) => ({ ...t, selected: true })),
            fetchedVideoId: fetchedVideoId,
            fetchedPlaylistId: null,
            playlistVideos: null,
          });
        })
        .catch((error) => {
          console.log(`Error from video meta endpoint: ${error}`);
          errorMsg = "Error, please try again";
        })
        .finally(() => {
          this.setState({
            downloading: false,
            errorMessage: errorMsg,
          });
        });
    } else if (this.state.playlistId) {
      let fetchedPlaylistId = this.state.playlistId;
      fetchRetry(`${serverHost}playlist_meta/${fetchedPlaylistId}`)
        .then((response) => response.json())
        .then((data) =>
          this.setState({
            title: data.title,
            playlistVideos: data.playlistVideos.map((v) => ({
              ...v,
              selected: true,
            })),
            fetchedPlaylistId: fetchedPlaylistId,
            fetchedVideoId: null,
            sections: [],
            end: null,
            downloadTimeStart: null,
            downloadTimeEnd: null,
          })
        )
        .catch((error) => {
          console.log(`Error from playlist meta endpoint: ${error}`);
          errorMsg = "Error, please try again";
        })
        .finally(() => {
          this.setState({
            downloading: false,
            errorMessage: errorMsg,
          });
        });
    }
    event.preventDefault();
  }

  handleDownloadEntireVideo(event) {
    this.downloadVideoFromServer(this.state.title, this.state.fetchedVideoId);
    event.preventDefault();
  }

  handleDownloadTimeRange(event) {
    let filename = `${this.state.title}_range`;
    this.downloadVideoFromServer(filename, this.state.fetchedVideoId, [
      {
        start: this.state.downloadTimeStart / 1000.0, // convert start/end from millis to seconds
        end: this.state.downloadTimeEnd / 1000.0,
        name: filename,
      },
    ]);
  }

  handleReflectionInputChange(event) {
    this.setState({ reflection: event.target.value });
  }

  onBlackAndWhiteSelectedChange(event) {
    this.setState({ blackAndWhite: event.target.checked });
  }

  onPlaybackSpeedChanged(value) {
    this.setState({ playbackSpeed: value });
  }

  handleDownloadSections(event) {
    let selectedSections = this.state.sections.filter((t) => t.selected);
    let filename =
      selectedSections.length > 1 ? this.state.title : selectedSections[0].name;
    this.downloadVideoFromServer(
      filename,
      this.state.fetchedVideoId,
      selectedSections
    );
  }

  handleDownloadSelectedPlaylistVideos(event) {
    let selectedVideos = this.state.playlistVideos.filter((t) => t.selected);
    let filename =
      selectedVideos.length > 1 ? this.state.title : selectedVideos[0].title;
    this.downloadVideosFromServer(
      filename,
      selectedVideos.map((v) => v.id)
    );
  }

  handleDownloadSection(section) {
    this.downloadVideoFromServer(section.name, this.state.fetchedVideoId, [
      section,
    ]);
  }

  onSectionSelectedChange(event) {
    let sections = this.state.sections;
    let index = event.target.getAttribute("index");
    sections[index].selected = event.target.checked;
    this.setState({ sections: sections });
  }

  onPlaylistVideoSelectedChange(event) {
    let videos = this.state.playlistVideos;
    let index = event.target.getAttribute("index");
    videos[index].selected = event.target.checked;
    this.setState({ playlistVideos: videos });
  }

  handleDownloadPlaylistVideo(video) {
    this.downloadVideoFromServer(video.title, video.id);
  }

  onMediaTypeChanged(event) {
    const mediaType = event.target.value;
    if (mediaType === "audio") {
      // reset processing controls that don't make sense for audio
      this.setState({
        blackAndWhite: null,
        playbackSpeed: null,
        reflection: null,
        mediaType: mediaType,
      });
    } else {
      this.setState({
        mediaType: mediaType,
      });
    }
  }

  onTimeRangeChanged(value) {
    const [start, end] = value;
    if (start < end) {
      this.setState({
        downloadTimeStart: start,
        downloadTimeEnd: end,
      });
    }
  }

  onSectionNameChange(event) {
    let sections = this.state.sections;
    let index = event.target.getAttribute("index");
    sections[index].name = event.target.value;
    this.setState({ sections: sections });
  }

  onAllSectionsSelectedChange(event) {
    let sections = this.state.sections;
    sections.forEach((t) => (t.selected = event.target.checked));
    this.setState({ sections: sections });
  }

  onAllPlaylistVideosSelectedChange(event) {
    let videos = this.state.playlistVideos;
    videos.forEach((v) => (v.selected = event.target.checked));
    this.setState({ playlistVideos: videos });
  }

  nullIfNoSections(element) {
    return this.state.sections.length > 0 ? element : null;
  }

  nullIfNoPlaylistVideos(element) {
    return this.state.playlistVideos?.length > 0 ? element : null;
  }

  render() {
    let urlInput = (
      <input
        id="urlInput"
        disabled={this.state.downloading}
        type="text"
        onChange={this.handleVideoUrlInputChange}
      />
    );
    let submitBtn = (
      <button
        id="submitBtn"
        type="submit"
        disabled={
          !(this.state.videoId || this.state.playlistId) ||
          this.state.downloading
        }
        // show glowing animation if valid video is entered and hasn't been fetched yet
        style={{
          animation:
            (this.state.videoId &&
              this.state.fetchedVideoId !== this.state.videoId) ||
            (this.state.playlistId &&
              this.state.fetchedPlaylistId !== this.state.playlistId)
              ? "glowing 1300ms infinite"
              : "none",
          // gray-out the button to make it clear when it's disabled
          backgroundColor:
            !(this.state.videoId || this.state.playlistId) ||
            this.state.downloading
              ? "#636965"
              : "#2ba805",
        }}
        onClick={this.handleSubmit}
      >
        Submit
      </button>
    );
    let loadingIndicator = (
      <div id="loadingIndicator">
        <ThreeCircles height="350" width="350" color="#4fa94d" visible={true} />
      </div>
    );
    let errorLabel = this.state.errorMessage ? (
      <div className="error-message">{this.state.errorMessage}</div>
    ) : null;
    let selectAllSectionsInput = this.nullIfNoSections(
      <input
        checked={this.state.sections.every((t) => t.selected)}
        onChange={this.onAllSectionsSelectedChange}
        type="checkbox"
        name="changeAllSelection"
        id="changeAllSelection"
      />
    );
    let selectAllSectionsInputLabel = this.nullIfNoSections(
      <label htmlFor="changeAllSelection">Select / unselect all sections</label>
    );
    let sectionsList = (
      <ul>
        {this.state.sections.map((section, index) => (
          <li style={{ listStyleType: "none" }} key={index}>
            <VideoSection
              index={index}
              section={section}
              onSelectedChange={this.onSectionSelectedChange}
              onNameChange={this.onSectionNameChange}
              onDownloadSection={this.handleDownloadSection}
              videoId={this.state.fetchedVideoId}
            />
          </li>
        ))}
      </ul>
    );
    let downloadSectionsBtn = this.nullIfNoSections(
      <button
        type="button"
        disabled={!this.state.sections.some((s) => s.selected)}
        onClick={this.handleDownloadSections}
      >
        Download selected sections
      </button>
    );
    let downloadPlaylistVideosBtn = this.nullIfNoPlaylistVideos(
      <button
        type="button"
        disabled={!this.state.playlistVideos?.some((s) => s.selected)}
        onClick={this.handleDownloadSelectedPlaylistVideos}
      >
        Download selected videos
      </button>
    );
    let playlistVideosList = (
      <ul>
        {this.state.playlistVideos?.map((video, index) => (
          <li style={{ listStyleType: "none" }} key={index}>
            <PlaylistVideo
              index={index}
              video={video}
              onSelectedChange={this.onPlaylistVideoSelectedChange}
              onDownloadPlaylistVideo={this.handleDownloadPlaylistVideo}
            />
          </li>
        ))}
      </ul>
    );
    let selectAllPlaylistVideosInput = this.nullIfNoPlaylistVideos(
      <input
        checked={this.state.playlistVideos?.every((t) => t.selected)}
        onChange={this.onAllPlaylistVideosSelectedChange}
        type="checkbox"
        name="changeAllSelection"
        id="changeAllSelection"
      />
    );
    let selectAllPlaylistVideosInputLabel = this.nullIfNoPlaylistVideos(
      <label htmlFor="changeAllSelection">Select / unselect all videos</label>
    );
    let titleLabel = null;
    let videoDisplay = null;
    let downloadFullBtn = null;
    let mediaTypeSelector = null;
    let downloadTimeRangeBtn = null;
    let timeRangeInput = null;
    let reflectionInput = null;
    let playbackSpeedInput = null;
    let blackAndWhiteInput = null;

    // initialize controls only used for individual videos
    if (this.state.fetchedVideoId && !this.state.fetchedPlaylistId) {
      titleLabel = (
        <div className="section-title">
          Video: {this.state.title}
        </div>
      );
      let orientationTransformStyle = () => {
        let horizontalTransform =
          this.state.reflection === "horizontal" ? "scaleX(-1)" : "";
        let verticalTransform =
          this.state.reflection === "vertical" ? "scaleY(-1)" : "";
        return `${horizontalTransform} ${verticalTransform}`;
      };
      const ytPreviewWidth = 640;
      let ytDisplayOpts = {
        height: "360",
        width: ytPreviewWidth,
        playerVars: {
          // https://developers.google.com/youtube/player_parameters
          start: this.state.downloadTimeStart / 1000.0, // convert start/end from millis to seconds
          end: this.state.downloadTimeEnd / 1000.0,
        },
      };
      videoDisplay = (
        <div className="video-card text-center">
          <YouTube
            videoId={this.state.fetchedVideoId}
            opts={ytDisplayOpts}
            ref={(p) => (this.youtubePlayerRef = p)}
            style={{
              filter: this.state.blackAndWhite ? "grayscale(100%)" : "",
              transform: orientationTransformStyle(),
            }}
          />
        </div>
      );
      downloadFullBtn = (
        <button type="button" onClick={this.handleDownloadEntireVideo}>
          Download full
        </button>
      );
      // <option value="gif">GIF</option>
      // leaving out for now because it's hard to use,
      // and anything over a few seconds can crash the server.
      mediaTypeSelector = (
        <div>
          <label>Download type:</label>
          <select onChange={this.onMediaTypeChanged}>
            <option value="video">Video</option>
            {/*
            disabling this because it can cause very large videos and make the server
            run out of memory
            <option value="best_video">Highest Quality Video</option> */}
            <option value="audio">Audio</option>
          </select>
        </div>
      );
      downloadTimeRangeBtn = (
        <button type="button" onClick={this.handleDownloadTimeRange}>
          Download time range
        </button>
      );
      // Helper function to create time marks based on video duration
      const createTimeMarks = (durationMs) => {
        const MINUTE = 60 * 1000;
        const MIN_SPACING = 2 * MINUTE; // Minimum 2 minutes between markers
        const marks = { 0: '0:00' };
        
        // Determine interval based on video length
        let intervalMs;
        if (durationMs < 5 * MINUTE) {
          // Short videos: no intermediate marks
          intervalMs = null;
        } else if (durationMs < 30 * MINUTE) {
          // Medium videos: every 5 minutes
          intervalMs = 5 * MINUTE;
        } else if (durationMs < 60 * MINUTE) {
          // Long videos: every 10 minutes
          intervalMs = 10 * MINUTE;
        } else {
          // Very long videos: every 15 minutes
          intervalMs = 15 * MINUTE;
        }
        
        // Add intermediate marks
        if (intervalMs) {
          for (let time = intervalMs; time < durationMs; time += intervalMs) {
            // Only add mark if it's far enough from the end
            if (durationMs - time >= MIN_SPACING) {
              marks[time] = toTimeString(time);
            }
          }
        }
        
        // Always add end mark
        marks[durationMs] = toTimeString(durationMs);
        return marks;
      };
      
      const timeMarks = createTimeMarks(this.state.end);
      timeRangeInput = (
        <Slider
          range
          id="timerange"
          min={0}
          max={this.state.end}
          value={[this.state.downloadTimeStart, this.state.downloadTimeEnd]}
          marks={timeMarks}
          style={{ marginTop: 16, width: "100%" }}
          step={50}
          tooltip={{ formatter: toTimeString, placement: "topRight" }}
          onChange={this.onTimeRangeChanged}
        />
      );
      if (this.state.mediaType !== "audio") {
        reflectionInput = (
          <div>
            <label>Reflect video: </label>
            <select onChange={this.handleReflectionInputChange}>
              <option value="none">None</option>
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
          </div>
        );
        playbackSpeedInput = (
          <div>
            <label htmlFor="playbackSpeed">Playback speed: </label>
            <Slider
              id="playbackSpeed"
              name="playbackSpeed"
              min={0.25}
              max={10.0}
              value={this.state.playbackSpeed || 1.0}
              step={0.25}
              tooltip={{
                formatter: (value) => `${value}x`,
                placement: "topRight",
              }}
              onChange={async (value) => {
                this.onPlaybackSpeedChanged(value);
                await this.youtubePlayerRef
                  .getInternalPlayer()
                  .setPlaybackRate(value);
              }}
            />
          </div>
        );
        blackAndWhiteInput = (
          <div>
            <label htmlFor="blackAndWhiteInput">Black and White</label>
            <input
              type="checkbox"
              id="blackAndWhiteInput"
              name="blackAndWhiteInput"
              checked={this.state.blackAndWhite}
              onChange={this.onBlackAndWhiteSelectedChange}
            />
          </div>
        );
      }
    }

    // initialize controls only used for playlists
    if (!this.state.fetchedVideoId && this.state.fetchedPlaylistId) {
      titleLabel = (
        <div className="section-title">
          Playlist: {this.state.title}
        </div>
      );
      // <option value="gif">GIF</option>
      // leaving out for now because it's hard to use,
      // and anything over a few seconds can crash the server.
      mediaTypeSelector = (
        <div>
          <label>Download type:</label>
          <select onChange={this.onMediaTypeChanged}>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>
        </div>
      );
    }

    return (
      <div className="app-container">
        {this.state.downloading ? loadingIndicator : null}
        <form>
          <Row>
            <Col span={24}>
              <h1>⚔️ YouTube Slicer ⚔️</h1>
              <label className="main-label">Enter a YouTube link:</label>
            </Col>
          </Row>
          <Row>
            <Col span={24} className="mb-16">{urlInput}</Col>
          </Row>
          <Row>
            <Col span={24} className="mb-16">{submitBtn}</Col>
          </Row>
          <Row>
            <Col span={24} className="mb-16">{errorLabel}</Col>
          </Row>
          <Row>
            <Col span={24} className="mb-24">{titleLabel}</Col>
          </Row>
          {this.state.errorMessage ? null : (
            <>
              <Row>
                <Col span={24} className="mb-24">{videoDisplay}</Col>
              </Row>
              <Row>
                <Col span={24} className="mb-16">{mediaTypeSelector}</Col>
              </Row>
              <Row>
                <Col span={24} className="mb-16">{downloadFullBtn}</Col>
              </Row>
              {this.state.sections.length > 0 ? (
                <>
                  <Row>
                    <Col span={24}>
                      <div className="time-range-group">
                        {timeRangeInput}
                        <div style={{ marginTop: '16px' }}>
                          {downloadTimeRangeBtn}
                        </div>
                      </div>
                    </Col>
                  </Row>
                  <Row>
                    <Col span={24} className="mb-16">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {selectAllSectionsInput}
                        {selectAllSectionsInputLabel}
                      </div>
                    </Col>
                  </Row>
                  <Row>
                    <Col span={24} className="mb-16">{downloadSectionsBtn}</Col>
                  </Row>
                  <Row>
                    <Col span={24} className="mb-24">{sectionsList}</Col>
                  </Row>
                </>
              ) : null}
              <Row>
                <Col span={24} className="mb-16">{downloadPlaylistVideosBtn}</Col>
              </Row>
              <Row>
                <Col span={24} className="mb-16">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectAllPlaylistVideosInput}
                    {selectAllPlaylistVideosInputLabel}
                  </div>
                </Col>
              </Row>
              <Row>
                <Col span={24} className="mb-24">{playlistVideosList}</Col>
              </Row>
            </>
          )}
        </form>
        <div style={{ textAlign: 'center', marginTop: '48px', padding: '24px 0', borderTop: '1px solid #e2e8f0' }}>
          <p style={{ marginBottom: '16px' }}>
            <a
              href="https://www.paypal.com/ncp/payment/LJT5QYAJ62V8L"
              style={{ fontSize: "24px", fontWeight: "600" }}
              target="_blank"
              rel="noopener noreferrer"
            >
              Support the site ❤️
            </a>
          </p>
          <a style={{ fontSize: "16px" }} href="mailto:lambdatallc@gmail.com">
            Contact Us
          </a>
        </div>
      </div>
    );
  }
}

ReactDOM.render(
  <React.StrictMode>
    <StartForm />
  </React.StrictMode>,
  document.getElementById("root")
);
