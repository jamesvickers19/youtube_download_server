import React from 'react'

export const PlaylistVideo = props => {
    return (
        <div>
            <input
                index={props.index}
                onChange={props.onSelectedChange}
                type="checkbox"
                checked={props.video.selected}
            />
            <button type="button" onClick={() => props.onDownloadPlaylistVideo(props.video)}>
                Download
            </button>
            <a href={props.video.url} target="_blank" rel="noreferrer" style={{ fontSize: "18px" }}>
                {props.video.title}
            </a>
        </div>
    );
}

export default PlaylistVideo;
