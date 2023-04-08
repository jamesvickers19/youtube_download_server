import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import { Grid, Cell } from "styled-css-grid";
import "react-loader-spinner/dist/loader/css/react-spinner-loader.css";
import Loader from "react-loader-spinner";
import NumericInput from 'react-numeric-input';
import VideoSection from './VideoSection'
import TimeRange from './TimeRange'
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
  if (!text.match(youtubeRegex))
  {
    return null;
  }
  if (!text.startsWith('http://') && !text.startsWith('https://'))
  {
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

class StartForm extends React.Component {
  constructor(props) {
    super(props);
    this.state = {url: '', sections: []}; 
    this.handleVideoUrlInputChange = this.handleVideoUrlInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.onMediaTypeChanged = this.onMediaTypeChanged.bind(this);
    this.onTimeRangeChanged = this.onTimeRangeChanged.bind(this);
    this.handleDownloadEntireVideo = this.handleDownloadEntireVideo.bind(this);
    this.handleDownloadTimeRange = this.handleDownloadTimeRange.bind(this);
    this.handleRotationInputChange = this.handleRotationInputChange.bind(this);
    this.handleDownloadSections = this.handleDownloadSections.bind(this);
    this.onSectionSelectedChange = this.onSectionSelectedChange.bind(this);
    this.onSectionNameChange = this.onSectionNameChange.bind(this);
    this.onAllSectionsSelectedChange = this.onAllSectionsSelectedChange.bind(this);
    this.nullIfNoSections = this.nullIfNoSections.bind(this);
    this.downloadSpinner = this.downloadSpinner.bind(this);
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
    if (this.state.rotation) {
      requestData['rotation'] = this.state.rotation;
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
        attachmentName = parts[1].split('=')[1].replace(/"/g,"");
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
            start: 0,
            end: data.length,
            selected: true
          },
          sections: data.sections.map(t => ({ ...t, selected: true})),
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
          start: this.state.downloadTimeStart,
          end: this.state.downloadTimeEnd,
          name: filename
        }
      ]
    );
  }

  handleRotationInputChange(rotation) {
    this.setState({rotation: rotation});
  }

  handleDownloadSections(event) {
    let selectedSections = this.state.sections.filter(t => t.selected);
    let filename = selectedSections.length > 1
      ? this.state.videoInfo.title
      : selectedSections[0].name;
    this.downloadFromServer(filename, selectedSections);
  }

  onSectionSelectedChange(event) {
    let sections = this.state.sections;
    let index = event.target.getAttribute("index");
    sections[index].selected = event.target.checked;
    this.setState({sections: sections});
  }

  onMediaTypeChanged(event) {
    this.setState({
      mediaType: event.target.value
    });
  }

  onTimeRangeChanged(start, end) {
    this.setState({
      downloadTimeStart: start,
      downloadTimeEnd: end
    });
  }

  onSectionNameChange(event) {
    let sections = this.state.sections;
    let index = event.target.getAttribute("index");
    sections[index].name = event.target.value;
    this.setState({sections: sections});
  }
  
  onAllSectionsSelectedChange(event) {
    let sections = this.state.sections;
    sections.forEach(t => t.selected = event.target.checked);
    this.setState({sections: sections});
  }
  
  nullIfNoSections(element) {
    return this.state.sections.length > 0
      ? element
      : null;
  }

  downloadSpinner() {
    if (this.state.downloading) {
      return (
        <Loader
          type="Watch"
          color="#2ba805"
          height={25}
          width={25}/>);
    }
  }

  render() {
    let urlInput = (<input id="urlInput" type="text" onChange={this.handleVideoUrlInputChange}/>);
    let submitBtn = (
    <button
        id="submitBtn"
        type="submit"
        disabled={!this.state.videoId || this.state.downloading}
        // show glowing animation if valid video is entered and hasn't been fetched yet
        style={{
          animation: this.state.videoId && this.state.fetchedVideoId !== this.state.videoId
            ? 'glowing 1300ms infinite'
            : 'none',
          // gray-out the button to make it clear when it's disabled 
          'background-color': !this.state.videoId || this.state.downloading ? '#636965' : '#2ba805'
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
             id="changeAllSelection"
             disabled={this.state.downloading}/>);
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
                onSelectedChange={this.onSectionSelectedChange}
                onNameChange={this.onSectionNameChange}
                isChecked={section.selected}
                value={section.name}
                startTime={section.start}
                endTime={section.end}
                style={{width: '50%'}}
                videoId={this.state.fetchedVideoId}
                disabled={this.state.downloading}
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
          disabled={this.state.downloading ||
                    !this.state.sections.some(s => s.selected)}
          onClick={this.handleDownloadSections}>
          Download selected sections
      </button>));
    let videoTitleLabel = null;
    let downloadFullBtn = null;
    let mediaTypeSelector = null;
    let timeRangeInput = null;
    let rotationInput = null;
    if (this.state.fetchedVideoId != null) {
      videoTitleLabel = (
      <div>
        <label>Video:     </label>
        <label style={{fontStyle: 'italic'}}>
          {this.state.videoInfo.title}
        </label>
      </div>
      );
      downloadFullBtn = (
        <button
          type="button"
          disabled={this.state.downloading}
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
      timeRangeInput = (
        <div>
          <button
            type="button"
            disabled={this.state.downloading}
            onClick={this.handleDownloadTimeRange}>
            Download time range (seconds):
          </button>
          <TimeRange
            max={this.state.videoInfo.end}
            callback={this.onTimeRangeChanged}
          />
        </div>
      );
      if (this.state.mediaType !== 'audio') {
        rotationInput = (
          <div>
            <label>Rotation (degrees): </label>
            <NumericInput min={-359}
                          max={359}
                          value={this.state.rotation}
                          onChange={this.handleRotationInputChange}/>
          </div>
        );
      }
    }
    return (
    <form>
      <Grid columns={"1fr"} rows={"1fr"}>
        <Cell center>
          <h1 style={{fontSize: '50px', fontFamily: 'Garamond'}}>
            Youtube Slicer
          </h1>
          <hr style={{margin: "0px 0px 20px 0px"}}/>
        </Cell>
        <Cell center>
          <label style={{fontSize: '30px'}}>Enter a YouTube link:</label>
        </Cell>
        <Cell center>{urlInput}</Cell>
        <Cell center>{this.downloadSpinner()}</Cell>
        <Cell center>
          {submitBtn}
        </Cell>
        <Cell center>
          {errorLabel}
        </Cell>
        <Cell center>{videoTitleLabel}</Cell>
        <Cell center>{mediaTypeSelector}</Cell>
        <Cell center>{downloadFullBtn}</Cell>
        <Cell center>{timeRangeInput}</Cell>
        <Cell center>{downloadSectionsBtn}</Cell>
        <Cell center>{rotationInput}</Cell>
        <Cell center>
          {selectAllInput}
          {selectAllInputLabel}
        </Cell>
        <Cell center>{sectionsList}</Cell>
      </Grid>
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