import React from "react";

// https://github.com/tariqulislam/react-multi-select-checkbox/blob/master/src/CheckBox.js

export const VideoSection = (props) => {
  return (
    <div className="section-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <input
          index={props.index}
          onChange={props.onSelectedChange}
          type="checkbox"
          checked={props.section.selected}
        />
        <input
          index={props.index}
          value={props.section.name}
          onChange={props.onNameChange}
          style={{ flex: 1 }}
        />
        <button
          type="button"
          onClick={() => props.onDownloadSection(props.section)}
        >
          Download
        </button>
      </div>
      <a
        href={`https://youtube.com/watch?v=${props.videoId}&t=${props.section.start}`}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: '14px', color: '#718096' }}
      >
        {toTimeString(props.section.start)} - {toTimeString(props.section.end)}
      </a>
    </div>
  );
};

function toTimeString(seconds) {
  var hours = Math.floor(seconds / 3600);
  var minutes = Math.floor((seconds - hours * 3600) / 60);
  var remainingSeconds = seconds - hours * 3600 - minutes * 60;
  let prependZero = (x) => (x < 10 ? "0" + x : x);
  return `${prependZero(hours)}:${prependZero(minutes)}:${prependZero(
    remainingSeconds
  )}`;
}

export default VideoSection;
