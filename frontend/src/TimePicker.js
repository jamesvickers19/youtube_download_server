import React from "react";

function parseIntSafe(str) {
  return str ? (parseInt(str) || 0) : 0;
}

function toSeconds(hours, minutes, seconds) {
  return (hours * 60 * 60) + (minutes * 60) + seconds; 
}

function toHoursMinutesSeconds(totalSeconds) {
  const totalMinutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return { hours: hours, minutes: minutes, seconds: seconds };
}

class TimePicker extends React.Component {

    constructor(props) {
        super(props);
        this.onSecondsChanged = this.onSecondsChanged.bind(this);
        this.onMinutesChanged = this.onMinutesChanged.bind(this);
        this.onHoursChanged = this.onHoursChanged.bind(this);
        let { hours, minutes, seconds } = toHoursMinutesSeconds(props.initialValueSeconds);
        this.state = {
            seconds: seconds,
            minutes: minutes,
            hours: hours
        };
    }

    onSecondsChanged(event) {
      let seconds = parseIntSafe(event.target.value);
      this.setState({
        seconds: seconds,
      });
      this.props?.callback(toSeconds(this.state.hours, this.state.minutes, seconds));
    }
  
    onMinutesChanged(event) {
      let minutes = parseIntSafe(event.target.value);
      this.setState({
        minutes: minutes,
      });
      this.props?.callback(toSeconds(this.state.hours, minutes, this.state.seconds));
    }
  
    onHoursChanged(event) {
      let hours = parseIntSafe(event.target.value);
      this.setState({
        hours: hours,
      });
      this.props?.callback(toSeconds(hours, this.state.minutes, this.state.seconds));
    }

    render() {
        let { hours, minutes, seconds } = toHoursMinutesSeconds(this.props.maxValueSeconds);
        // don't make hours or minutes input if max time doesn't warrant them.  Seconds input always present or this control is useless.
        let hoursInput = null;
        if (hours > 0) {
          hoursInput = (
            <div>
              <input type="number"
                min="0" max={hours} pattern= "[0-9]" step="1" value={this.state.hours} onChange={this.onHoursChanged} />
              <label> h </label>
            </div>);
        }
        let minutesInput = null;
        if (minutes > 0) {
          minutesInput = (
            <div>
              <input type="number"
                min="0" max={minutes} pattern= "[0-9]" step="1" value={this.state.minutes} onChange={this.onMinutesChanged} />
              <label> m </label>
            </div>);
        }
        return (
          <div>
            {hoursInput}
            {minutesInput}
            <input type="number"
              min="0" max={seconds} pattern= "[0-9]" step="1" value={this.state.seconds} onChange={this.onSecondsChanged} />
            <label> s </label>
            </div>
        );
    }
}

export default TimePicker;