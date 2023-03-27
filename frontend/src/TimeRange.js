import React from "react";
import Nouislider from "nouislider-react";
import "nouislider/distribute/nouislider.css";

class TimeRange extends React.Component {

    step = 0.1;

    constructor(props) {
        super(props);
        this.state = {
            start: 0,
            end: props.max,
        };
      }

    onUpdate = (render, handle, value, un, percent) => {
      this.setState({
          start: value[0],
          end: value[1]
      });
      this.props.callback?.(value[0], value[1]);
    };

    render() {
        return (
            <div className="slider">
              <Nouislider
                  id="timerange"
                  start={[this.state.start, this.state.end]}
                  tooltips={true}
                  connect={true}
                  margin={this.step} // don't let slider pins have same value
                  orientation="horizontal"
                  range={{
                    min: 0,
                    max: this.props.max
                  }}
                  step={this.step}
                  style={{width: this.props.width ?? '90%'}}
                  onUpdate={this.onUpdate}
                />
            </div>
          );
    }
}

export default TimeRange;