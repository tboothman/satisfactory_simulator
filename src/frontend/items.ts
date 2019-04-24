
// A thing that goes on the grid
import {connect, Conveyor, Input, Merger, Output, Sink, Source, Splitter} from "../index";

export const enum GridItemType {
    Source = "Source",
    Sink = "Sink",
    Merger = "Merger",
    Splitter = "Splitter"
}

export class PlaceableItem {
    public description: string = "";
    private type: GridItemType;
    private initialSettings: {};
    constructor(description: string, type: GridItemType, initialSettings: {} = {}) {
        this.description = description;
        this.type = type;
        this.initialSettings = initialSettings;
    }
    public createGridItem(x: number, y: number): GridItem {
        return GridItem.create(x, y, this.type, this.initialSettings);
    }
}

export interface SerialisedGridItem {
    x: number
    y: number
    type: GridItemType
    settings: object
}

export interface SerialisedConnection {
    from: {x: number, y: number}
    to: {x: number, y: number}
    speed: number
}

export class GridItem {
    protected description: string = "";
    public x: number;
    public y: number;
    public model: Input|Output;
    public settings: object|any;
    public type: GridItemType;

    public static create(x: number, y: number, type: GridItemType, settings: {}|any) {
        let model: Input|Output|null = null;
        switch (type) {
            case GridItemType.Merger:
                model = new Merger();
                break;
            case GridItemType.Sink:
                model = new Sink(settings.speed);
                break;
            case GridItemType.Source:
                model = new Source(settings.speed);
                break;
            case GridItemType.Splitter:
                model = new Splitter();
                break;
        }
        return new GridItem(type, x, y, model!, settings);
    }

    constructor(type: GridItemType, x: number, y: number, model: Input|Output, settings: {}) {
        this.description = type;
        this.x = x;
        this.y = y;
        this.model = model;
        this.settings = settings;
        this.type = type;
    }

    displayText(): string {
        if (this.type === GridItemType.Source) {
            return this.description + " " + this.settings.speed;
        }
        return this.description;
    }

    toJSON(): SerialisedGridItem {
        return {
            x: this.x,
            y: this.y,
            type: this.type,
            settings: this.settings,
        }
    }
}

export class Connection {
    public from: GridItem;
    public to: GridItem;
    public conveyor: Conveyor;
    private maxSpeed: number;

    constructor(from: GridItem, to: GridItem, conveyorSpeed = 450) {
        this.from = from;
        this.to = to;
        // @todo gross ... fix the typing
        this.conveyor = connect(this.from.model as Output, this.to.model as Input, conveyorSpeed);
        this.maxSpeed = conveyorSpeed;
    }

    toJSON(): SerialisedConnection {
        return {
            from: {x: this.from.x, y: this.from.y},
            to: {x: this.to.x, y: this.to.y},
            speed: this.maxSpeed
        }
    }
}