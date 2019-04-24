import * as React from "react";
import * as ReactDOM from "react-dom";
import Data from "./frontend/data";
import Main from "./frontend/components/main";

const data = new Data();
// @ts-ignore
data.fromJSON({"gridItems":[{"x":0,"y":0,"type":"Source","settings":{"speed":60}},{"x":0,"y":2,"type":"Source","settings":{"speed":450}},{"x":2,"y":0,"type":"Splitter","settings":{}},{"x":2,"y":2,"type":"Splitter","settings":{}},{"x":5,"y":0,"type":"Merger","settings":{}},{"x":5,"y":2,"type":"Merger","settings":{}},{"x":7,"y":0,"type":"Sink","settings":{}},{"x":7,"y":2,"type":"Sink","settings":{}}],"connections":[{"from":{"x":0,"y":0},"to":{"x":2,"y":0},"speed":450},{"from":{"x":2,"y":0},"to":{"x":5,"y":0},"speed":450},{"from":{"x":2,"y":0},"to":{"x":5,"y":2},"speed":450},{"from":{"x":2,"y":2},"to":{"x":5,"y":0},"speed":450},{"from":{"x":2,"y":2},"to":{"x":5,"y":2},"speed":450},{"from":{"x":0,"y":2},"to":{"x":2,"y":2},"speed":450},{"from":{"x":5,"y":0},"to":{"x":7,"y":0},"speed":450},{"from":{"x":5,"y":2},"to":{"x":7,"y":2},"speed":450}]});

ReactDOM.render(
    <Main data={data}/>,
    document.getElementById("react")
);

