import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { Col, Row } from 'antd';
import { ThreeCircles } from "react-loader-spinner";
import { Slider } from 'antd';
import VideoSection from './VideoSection'
import YouTube from 'react-youtube';
import reportWebVitals from './reportWebVitals';

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

let devMode = false;
let serverHost = ''; // production
if (devMode) {
  // local development; must enable at this site
  serverHost = 'https://cors-anywhere.herokuapp.com/https://youtubeslicer.site/';
}

function download(blob, name) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.target = '_blank';
  link.setAttribute("type", "hidden");
  document.body.appendChild(link); // needed for firefox (?)
  link.click();
  link.remove();
}

function getVideoId(text) {
  const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  if (!text.match(youtubeRegex)) {
    return null;
  }
  if (!text.startsWith('http://') && !text.startsWith('https://')) {
    text = 'https://' + text;
  }
  const url = new URL(text);
  const urlParams = new URLSearchParams(url.search);
  return urlParams.get('v') ?? url.pathname.substring(1);
}

function postJsonRequestParams(requestData) {
  return {
    method: 'POST',
    body: JSON.stringify(requestData),
    headers: { 'Content-Type': 'application/json' }
  };
}

function toTimeString(totalMilliseconds) {
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const milliseconds = totalMilliseconds - (hours * 60 * 60 * 1000) - (minutes * 60 * 1000) - (seconds * 1000);
  const formatTime = (t, places) => String(t).padStart(places, '0');
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
    this.state = { url: '', sections: [] };
    this.handleVideoUrlInputChange = this.handleVideoUrlInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onMediaTypeChanged = this.onMediaTypeChanged.bind(this);
    this.onTimeRangeChanged = this.onTimeRangeChanged.bind(this);
    this.handleDownloadEntireVideo = this.handleDownloadEntireVideo.bind(this);
    this.handleDownloadTimeRange = this.handleDownloadTimeRange.bind(this);
    this.handleReflectionInputChange = this.handleReflectionInputChange.bind(this);
    this.handleDownloadSections = this.handleDownloadSections.bind(this);
    this.onSectionSelectedChange = this.onSectionSelectedChange.bind(this);
    this.onSectionNameChange = this.onSectionNameChange.bind(this);
    this.handleDownloadSection = this.handleDownloadSection.bind(this);
    this.onAllSectionsSelectedChange = this.onAllSectionsSelectedChange.bind(this);
    this.nullIfNoSections = this.nullIfNoSections.bind(this);
    this.downloadFromServer = this.downloadFromServer.bind(this);
  }

  handleVideoUrlInputChange(event) {
    let url = event.target.value;
    let videoId = getVideoId(url);
    this.setState({
      url: url,
      videoId: videoId
    });
  }

  downloadFromServer(filename, sections) {
    let requestData = {
      'video_id': this.state.fetchedVideoId,
      'media_type': this.state.mediaType || 'video',
      'filename': filename,
    };
    if (sections) {
      requestData['sections'] = sections;
    }

    let processingParams = {};
    if (this.state.reflection === 'horizontal') {
      processingParams['reflect_horizontal'] = true;
    }
    else if (this.state.reflection === 'vertical') {
      processingParams['reflect_vertical'] = true;
    }

    if (Object.keys(processingParams).length > 0) {
      requestData['processing'] = processingParams;
    }

    let requestParams = postJsonRequestParams(requestData);
    let attachmentName = '';
    let errorMsg = "";
    this.setState({
      errorMessage: errorMsg,
      downloading: true
    });
    fetch(`${serverHost}download`, requestParams)
      .then(response => {
        const header = response.headers.get('Content-Disposition');
        const parts = header.split(';');
        attachmentName = parts[1].split('=')[1].replace(/"/g, "");
        return response.blob();
      })
      .then((blob) => download(blob, attachmentName))
      .catch(error => {
        console.log(`Error from download endpoint: ${error}`);
        errorMsg = 'Error, please try again';
      })
      .finally(() => {
        this.setState({
          downloading: false,
          errorMessage: errorMsg,
        });
      });
  }

  handleSubmit(event) {
    let fetchedVideoId = this.state.videoId;
    let errorMsg = "";
    this.setState({
      errorMessage: errorMsg,
      downloading: true
    });
    fetch(`${serverHost}meta/${fetchedVideoId}`)
      .then(response => response.json())
      .then(data => this.setState({
        videoInfo: {
          title: data.title,
          end: data.length * 1000, // milliseconds
          selected: true
        },
        downloadTimeStart: 0,
        downloadTimeEnd: data.length * 1000.0,
        sections: data.sections.map(t => ({ ...t, selected: true })),
        fetchedVideoId: fetchedVideoId
      }
      ))
      .catch(error => {
        console.log(`Error from meta endpoint: ${error}`);
        errorMsg = 'Error, please try again';
      })
      .finally(() => {
        this.setState({
          downloading: false,
          errorMessage: errorMsg,
        });
      });
    event.preventDefault();
  }

  handleDownloadEntireVideo(event) {
    this.downloadFromServer(this.state.videoInfo.title);
    event.preventDefault();
  }

  handleDownloadTimeRange(event) {
    let filename = `${this.state.videoInfo.title}_range`;
    this.downloadFromServer(
      filename,
      [
        {
          start: this.state.downloadTimeStart / 1000.0, // convert start/end from millis to seconds
          end: this.state.downloadTimeEnd / 1000.0,
          name: filename
        }
      ]
    );
  }

  handleReflectionInputChange(event) {
    this.setState({ reflection: event.target.value });
  }

  handleDownloadSections(event) {
    let selectedSections = this.state.sections.filter(t => t.selected);
    let filename = selectedSections.length > 1
      ? this.state.videoInfo.title
      : selectedSections[0].name;
    this.downloadFromServer(filename, selectedSections);
  }

  handleDownloadSection(section) {
    this.downloadFromServer(section.name, [section]);
  }

  onSectionSelectedChange(event) {
    let sections = this.state.sections;
    let index = event.target.getAttribute("index");
    sections[index].selected = event.target.checked;
    this.setState({ sections: sections });
  }

  onMediaTypeChanged(event) {
    this.setState({
      mediaType: event.target.value
    });
  }

  onTimeRangeChanged(value) {
    const [start, end] = value;
    if (start < end) {
      this.setState({
        downloadTimeStart: start,
        downloadTimeEnd: end
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
    sections.forEach(t => t.selected = event.target.checked);
    this.setState({ sections: sections });
  }

  nullIfNoSections(element) {
    return this.state.sections.length > 0
      ? element
      : null;
  }

  render() {
    let urlInput = (<input id="urlInput" type="text" onChange={this.handleVideoUrlInputChange} />);
    let submitBtn = (
      <button
        id="submitBtn"
        type="submit"
        disabled={!this.state.videoId}
        // show glowing animation if valid video is entered and hasn't been fetched yet
        style={{
          animation: this.state.videoId && this.state.fetchedVideoId !== this.state.videoId
            ? 'glowing 1300ms infinite'
            : 'none',
          // gray-out the button to make it clear when it's disabled 
          'backgroundColor': !this.state.videoId || this.state.downloading ? '#636965' : '#2ba805'
        }}
        onClick={this.handleSubmit}>
        Submit
      </button>);
    let errorLabel = (<label>{this.state.errorMessage}</label>);
    let selectAllInput = this.nullIfNoSections(
      <input checked={this.state.sections.every(t => t.selected)}
        onChange={this.onAllSectionsSelectedChange}
        type="checkbox"
        name="changeAllSelection"
        id="changeAllSelection" />);
    let selectAllInputLabel = this.nullIfNoSections(
      <label htmlFor="changeAllSelection">Select / unselect all sections</label>
    );
    let sectionsList = (
      <ul>
        {
          this.state.sections.map((section, index) => (
            <li
              style={{ listStyleType: "none" }}
              key={index}>
              <VideoSection
                index={index}
                section={section}
                onSelectedChange={this.onSectionSelectedChange}
                onNameChange={this.onSectionNameChange}
                onDownloadSection={this.handleDownloadSection}
                videoId={this.state.fetchedVideoId}
              />
            </li>
          ))
        }
      </ul>
    );
    let downloadSectionsBtn = (
      this.nullIfNoSections(
        <button
          type="button"
          disabled={!this.state.sections.some(s => s.selected)}
          onClick={this.handleDownloadSections}>
          Download selected sections
        </button>));
    let videoTitleLabel = null;
    let videoDisplay = null;
    let downloadFullBtn = null;
    let mediaTypeSelector = null;
    let downloadTimeRangeBtn = null;
    let timeRangeInput = null;
    let reflectionInput = null;
    if (this.state.fetchedVideoId != null) {
      videoTitleLabel = (
        <div>
          <label>Video:     </label>
          <label style={{ fontStyle: 'italic' }}>
            {this.state.videoInfo.title}
          </label>
        </div>
      );
      let orientationTransformStyle = () => {
        let horizontalTransform = this.state.reflection === "horizontal" ? "scaleX(-1)" : "";
        let verticalTransform = this.state.reflection === "vertical" ? "scaleY(-1)" : "";
        return `${horizontalTransform} ${verticalTransform}`;
      };
      const ytPreviewWidth = 400;
      let ytDisplayOpts = {
        height: '225',
        width: ytPreviewWidth,
        playerVars: {
          // https://developers.google.com/youtube/player_parameters
          start: this.state.downloadTimeStart / 1000.0, // convert start/end from millis to seconds
          end: this.state.downloadTimeEnd / 1000.0,
        },
      };
      videoDisplay = (
        <div style={{ width: `${ytPreviewWidth}px` }}>
          <YouTube
            videoId={this.state.fetchedVideoId}
            opts={ytDisplayOpts}
            style={{ transform: orientationTransformStyle(), }} />
        </div>
      );
      downloadFullBtn = (
        <button
          type="button"
          onClick={this.handleDownloadEntireVideo}>
          Download full
        </button>
      );
      mediaTypeSelector = (
        <div>
          <label>Download type:</label>
          <select onChange={this.onMediaTypeChanged}>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="gif">GIF</option>
          </select>
        </div>
      );
      downloadTimeRangeBtn = (
        <button
          type="button"
          onClick={this.handleDownloadTimeRange}>
          Download time range
        </button>
      );
      timeRangeInput = (
        <Slider range
          id="timerange"
          min={0}
          max={this.state.videoInfo.end}
          value={[this.state.downloadTimeStart, this.state.downloadTimeEnd]}
          style={{ marginTop: 16, width: `${ytPreviewWidth}px` }}
          step={50}
          tooltip={{ formatter: toTimeString, placement: "topRight" }}
          onChange={this.onTimeRangeChanged}
        />
      );
      if (this.state.mediaType !== 'audio') {
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
      }
    }
    return (
      <form>
        <Row>
          <Col span={24}>
            <label style={{ fontSize: '30px' }}>Enter a YouTube link:</label>
          </Col>
        </Row>
        <Row>
          <Col span={24}>{urlInput}</Col>
        </Row>
        <br />
        <Row>
          <Col span={24}>{this.state.downloading
            ? (<ThreeCircles
              height="25"
              width="25"
              color="#4fa94d"
              visible={true} />)
            : submitBtn}
          </Col>
        </Row>
        <Row>
          <Col span={24}>{errorLabel}</Col>
        </Row>
        <Row>
          <Col span={24}>{videoTitleLabel}</Col>
        </Row>
        <Row>
          <Col span={24}>{videoDisplay}</Col>
        </Row>
        <Row>
          <Col span={24}>{timeRangeInput}</Col>
        </Row>
        <Row>
          <Col span={24}>{downloadTimeRangeBtn}</Col>
        </Row>
        <Row>
          <Col span={24}>{downloadFullBtn}{mediaTypeSelector}{reflectionInput}</Col>
        </Row>
        <Row>
          <Col span={24}>{downloadSectionsBtn}</Col>
        </Row>
        <Row>
          <Col span={24}>{selectAllInput}{selectAllInputLabel}</Col>
        </Row>
        <Row>
          <Col span={24}>{sectionsList}</Col>
        </Row>
      </form>
    );
  }
}

ReactDOM.render(
  <React.StrictMode>
    <StartForm />
  </React.StrictMode>,
  document.getElementById('root')
);