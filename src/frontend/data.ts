import {observable} from "mobx";
import {Connection, GridItem, GridItemType, PlaceableItem, SerialisedConnection, SerialisedGridItem} from "./items";
import {reset, simulate, Source} from "../index";

export enum Mode {
    Place,
    Join,
    Delete,
    Move,
    None
}

class Data {
    @observable public placeableItems = [
        new PlaceableItem("60 source", GridItemType.Source, {speed: 60}),
        new PlaceableItem("450 source", GridItemType.Source, {speed: 450}),
        new PlaceableItem("sink", GridItemType.Sink),
        new PlaceableItem("60 sink", GridItemType.Sink, {speed: 60}),
        new PlaceableItem("merger", GridItemType.Merger),
        new PlaceableItem("splitter", GridItemType.Splitter),
    ];
    @observable public gridItems: (GridItem | null)[][] = [];
    @observable public placingItem: PlaceableItem|null = null;
    @observable public mode: Mode = Mode.None;
    @observable public connections: Connection[] = [];
    @observable public connectingSource: GridItem|null = null;
    @observable public movingItem: GridItem|null = null;
    @observable public showLoadingWindow: boolean = false;
    @observable public saveNames: string[] = [];
    @observable public selectedSave: string = "";

    rows = 50;
    cols = 50;

    constructor() {
        for (let x = 0; x < this.cols; x++) {
            this.gridItems[x] = [];
            for (let y = 0; y < this.rows; y++) {
                this.gridItems[x][y] = null;
            }
        }
    }

    public reset() {
        this.emptyGrid();
        this.resetMode();
    }

    private emptyGrid() {
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (this.gridItems[x][y]) {
                    this.deleteGridItem(this.gridItems[x][y]!);
                }
            }
        }
    }

    public simulate() {
        const conveyors = this.connections.map((connection) => connection.conveyor);
        if (conveyors.length) {
            reset(...conveyors);
        }
        let sources: Source[] = [];
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (this.gridItems[x][y] && this.gridItems[x][y]!.model instanceof Source) {
                    sources.push(this.gridItems[x][y]!.model as Source);
                }
            }
        }
        if (sources.length) {
            simulate(...sources);
        }
    }

    public placeItemOnGrid(x: number, y: number) {
        if (this.mode != Mode.Place || !this.placingItem) {
            return;
        }
        this.gridItems[x][y] = this.placingItem.createGridItem(x, y);
    }

    private resetMode() {
        this.mode = Mode.None;
        this.placingItem = null;
        this.connectingSource = null;
        this.movingItem = null;
    }

    public setPlacingItem(item: PlaceableItem) {
        this.resetMode();
        this.placingItem = item;
        this.mode = Mode.Place;
    }

    public setModeToJoin() {
        this.resetMode();
        this.mode = Mode.Join;
    }

    public setModeToDelete() {
        this.resetMode();
        this.mode = Mode.Delete;
    }

    public setModeToMove() {
        this.resetMode();
        this.mode = Mode.Move;
    }

    public moveStart(item: GridItem) {
        this.movingItem = item;
    }

    public moveEnd(x: number, y: number) {
        if (!this.movingItem) {
            return;
        }
        if (this.gridItems[x][y]) {
            if (this.gridItems[x][y] === this.movingItem) {
                this.movingItem = null;
            } else {
                // moving to somewhere occupied ... er .. cancel?
                this.movingItem = null;
            }
        } else {
            this.gridItems[this.movingItem.x][this.movingItem.y] = null;
            this.movingItem.x = x;
            this.movingItem.y = y;
            this.gridItems[x][y] = this.movingItem;
            this.movingItem = null;
        }
    }

    public connectionStart(item: GridItem) {
        // @TODO validation: has available outputs
        this.connectingSource = item;
    }

    public connectionEnd(item: GridItem) {
        // @TODO validation: has available inputs
        this.connections.push(new Connection(this.connectingSource!, item));
        this.connectingSource = null;
    }

    public deleteGridItem(item: GridItem) {
        const removingItemConnections = this.connections.filter((connection) => connection.from.x == item.x && connection.from.y == item.y || connection.to.x == item.x && connection.to.y == item.y);
        removingItemConnections.forEach((connection) => {
            connection.conveyor.disconnect();
        });
        this.connections = this.connections.filter((connection) => -1 === removingItemConnections.indexOf(connection));
        this.gridItems[item.x][item.y] = null;
    }

    public fromJSON(json: {gridItems: SerialisedGridItem[], connections: SerialisedConnection[]}) {
        this.emptyGrid();
        json.gridItems.forEach((gridItem) => {
            this.gridItems[gridItem.x][gridItem.y] = GridItem.create(gridItem.x, gridItem.y, gridItem.type, gridItem.settings)
        });
        this.connections = json.connections.map((connection) => new Connection(this.gridItems[connection.from.x][connection.from.y]!, this.gridItems[connection.to.x][connection.to.y]!, connection.speed));
    }

    public toJSON() {
        const gridItems = [];
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                if (this.gridItems[x][y]) {
                    gridItems.push(this.gridItems[x][y]);
                }
            }
        }

        return {
            gridItems: gridItems,
            connections: this.connections,
        }
    }

    public loadLoadingWindow() {
        this.saveNames = [];
        for (let i = 0; i < window.localStorage.length; i++) {
            this.saveNames.push(window.localStorage.key(i)!);
        }
        this.showLoadingWindow = true;
    }

    public load(saveName: string) {
        const saveData = window.localStorage.getItem(saveName)!;
        this.fromJSON(JSON.parse(saveData));
        this.showLoadingWindow = false;
    }
}

export default Data;