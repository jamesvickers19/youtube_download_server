import React from "react";

export const PlaylistVideo = (props) => {
  return (
    <div className="playlist-item">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <input
          index={props.index}
          onChange={props.onSelectedChange}
          type="checkbox"
          checked={props.video.selected}
        />
        <a
          href={props.video.url}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: "16px", flex: 1 }}
        >
          {props.video.title}
        </a>
        <button
          type="button"
          onClick={() => props.onDownloadPlaylistVideo(props.video)}
        >
          Download
        </button>
      </div>
    </div>
  );
};

export default PlaylistVideo;
