import * as React from "react";
import {observer} from "mobx-react";
import Data, {Mode} from "../data";
import {reset, simulate, Source} from "../../index";

@observer
class Main extends React.Component<{ data: Data }> {
    render() {
        const data = this.props.data;
        const rows = data.gridItems[0].length;
        const cols = data.gridItems.length;

        const onCellClick = (x: number, y: number) => {
            const clickedItem = this.props.data.gridItems[x][y];
            if (data.mode === Mode.Place) {
                if (clickedItem) {
                    return;
                }
                this.props.data.placeItemOnGrid(x, y);
            } else if (data.mode === Mode.Delete) {
                if (!clickedItem) {
                    return;
                }
                data.deleteGridItem(clickedItem);

            } else if (data.mode === Mode.Join) {
                if (!clickedItem) {
                    return;
                }
                if (data.connectingSource) {
                    data.connectionEnd(clickedItem);
                } else {
                    data.connectionStart(clickedItem);
                }
            } else if (data.mode === Mode.Move) {
                if (data.movingItem) {
                    data.moveEnd(x, y);
                } else {
                    if (!clickedItem) {
                        return;
                    }
                    data.moveStart(clickedItem);
                }
            }
        };

        const onSimulateClick = () => {
            data.simulate();
            this.setState({});
        };

        const onSaveClick = () => {
            console.log(JSON.parse(JSON.stringify(data)));
            if (!inputBox.current!.value) {
                return;
            }
            window.localStorage.setItem(inputBox.current!.value, JSON.stringify(data));
        };

        const onShowLoadingMenuClick = () => {
            data.loadLoadingWindow();
        };

        const onLoadClick = () => {
            data.load(data.selectedSave);
        };

        const onSelectSaveClick = (saveName: string) => {
            data.selectedSave = saveName
        };

        const onResetClick = () => {
            data.reset();
        };

        const inputBox = React.createRef<HTMLInputElement>();

        return <div>
            Build Mode: <div className="buildables">{data.placeableItems.map((buildable, index) => {
            const classes = buildable === data.placingItem ? 'selected' : '';
            return <span key={index} className={classes} onClick={() => {
                data.setPlacingItem(buildable)
            }}>{buildable.description} </span>;
        })}</div>
            <div onClick={() => data.setModeToJoin()} className={data.mode == Mode.Join ? 'selected' : ''}>Join mode
            </div>
            <div onClick={() => data.setModeToDelete()} className={data.mode == Mode.Delete ? 'selected' : ''}>Delete mode
            </div>
            <div onClick={() => data.setModeToMove()} className={data.mode == Mode.Move ? 'selected' : ''}>Move mode
            </div>
            <button onClick={onSimulateClick}>Simulate</button>
            <input type="text" ref={inputBox} placeholder="Save name"/><button onClick={onSaveClick}>Save</button>
            <button onClick={onShowLoadingMenuClick}>Load</button>
            {data.showLoadingWindow ? <div>
                {data.saveNames.map((saveName, idx) => <div onClick={onSelectSaveClick.bind(this, saveName)} className={data.selectedSave == saveName ? 'selected' : ''} key={idx}>{saveName}</div>)}
                <button onClick={onLoadClick}>Load</button>
            </div>: null}
            <button onClick={onResetClick}>Reset</button>
            <div className="gridcontainer">
                <svg className="connections_svg" height={rows*50} width={cols*50}>

                    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5"
                            markerWidth="4" markerHeight="4"
                            orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" />
                    </marker>
                    {data.connections.map((connection, idx) => {
                        const from = connection.from;
                        const to = connection.to;
                        const cellSize = 51.6;
                        return [
                            <line x1={(1+from.x) * cellSize} y1={from.y * cellSize + 26} x2={to.x * cellSize} y2={to.y * cellSize + 26} style={{strokeWidth: 2, stroke:"rgb(255,0,0)"}} key={'l'+idx} markerEnd="url(#arrow)" />,
                            <text x={(from.x + (to.x - from.x)/2) * cellSize + 25} y={(from.y + (to.y - from.y)/2) * cellSize + 25} style={{fill: "black"}} key={'t'+idx}>{connection.conveyor.speed()}</text>
                        ]
                    })}
                </svg>
                <table className="grid">
                    <tbody>
                    {
                        [...Array(rows).keys()].map((_, row) => <tr key={row}>
                            {[...Array(cols).keys()].map((_, col) => <td key={col}
                                                                         onClick={onCellClick.bind(this, col, row)}>{data.gridItems[col][row] ? data.gridItems[col][row]!.displayText() : ''}</td>)}
                        </tr>)
                    }
                    </tbody>
                </table>
            </div>
        </div>
    }
}

export default Main;