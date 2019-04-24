export function connect(input: Output, output: Input, maxSpeed = 450): Conveyor {
    const conveyor = new Conveyor(input, output, maxSpeed);
    output.connectInput(conveyor);
    input.connectOutput(conveyor);
    return conveyor;
}

export function simulate(...sources: Source[]) {
    // @TODO probably don't need the allowBackProp parameter any more
    //sources.forEach((source) => source.simulateForwards(false, 0));
    sources.forEach((source) => source.simulateForwards(true, 0));
}

export function reset(...conveyors: Conveyor[]) {
    conveyors.forEach((conveyor) => conveyor.reset());
}

export class Conveyor {
    public input: Output;
    public output: Input;
    private readonly maxSpeed: number;
    private currentSpeed = 0;
    private maxSpeedFromBackPressure: number|null = null;

    constructor(input: Output, output: Input, maxSpeed: number) {
        this.input = input;
        this.output = output;
        this.maxSpeed = maxSpeed;
    }

    public simulateForwards(speed: number) {
        if (speed === this.currentSpeed) {
            // Stop infinite loops. If this update hasn't changed anything then don't propegate
            return;
        }

        const newSpeed = Math.min(speed, this.maxRateLimitedSpeed());

        if (newSpeed != this.currentSpeed) {
            this.currentSpeed = newSpeed;
            this.output.simulateForwards(newSpeed);

            if (this.currentSpeed != newSpeed) {
                // If the speed has been altered then the forwardprop has backpropegated through this
                // No need to send another back prop
                return;
            }
        }

        if (speed > this.maxRateLimitedSpeed()) {
            // The input gave us too much speed, tell it the limit
            this.input.simulateBackwards(newSpeed);
        }
    }

    public simulateBackwards(speed: number): void {
        if (this.currentSpeed === speed) {
            return;
        }
        this.currentSpeed = speed;
        this.maxSpeedFromBackPressure = speed;
        this.input.simulateBackwards(speed);
    }

    public speed() {
        return this.currentSpeed;
    }

    public maxRateLimitedSpeed(): number {
        if (this.maxSpeedFromBackPressure !== null) {
            return this.maxSpeedFromBackPressure;
        }
        return this.maxSpeed;
    }

    public reset() {
        this.currentSpeed = 0;
        this.maxSpeedFromBackPressure = null;
    }

    public disconnect() {
        this.input.disconnectOutput(this);
        this.output.disconnectInput(this);
    }
}

export class Source implements Output {
    private out: Conveyor|null = null;
    private readonly speed: number;
    constructor(speed: number) {
        this.speed = speed;
    }
    public connectOutput(conveyor: Conveyor) {
        this.out = conveyor;
    }
    public simulateForwards(allowBackProp: boolean, speed: number) {
        if (this.out) {
            this.out.simulateForwards(this.speed);
        }
    }
    public outputSpeed() {
        return this.out!.speed();
    }

    simulateBackwards(speed: number): void {
        // NOOP. End of the line
    }

    disconnectOutput(output: Conveyor): void {
        this.out = null;
    }
}

abstract class InputOutput implements Input, Output {
    protected abstract maxOutputs: number;
    protected abstract maxInputs: number;
    protected inputs: Conveyor[] = [];
    protected outputs: Conveyor[] = [];

    public connectInput(inputConveyor: Conveyor) {
        if (this.inputs.length === this.maxInputs) {
            throw new Error("Already has " + this.maxInputs + " inputs. Cannot add another");
        }
        this.inputs.push(inputConveyor);
    }

    public connectOutput(output: Conveyor) {
        if (this.outputs.length === this.maxOutputs) {
            throw new Error("Already has " + this.maxOutputs + " outputs. Cannot add another");
        }
        this.outputs.push(output);
    }

    abstract simulateForwards(speed: number): void;
    abstract simulateBackwards(speed: number): void;

    public disconnectInput(inputConveyor: Conveyor): void {
        this.inputs = this.inputs.filter((input) => input != inputConveyor);
    }

    public disconnectOutput(output: Conveyor): void {
        this.outputs = this.outputs.filter((input) => input != output);
    }
}


export class Splitter extends InputOutput {
    protected maxInputs = 1;
    protected maxOutputs = 3;

    public simulateForwards(speed: number): void {
        const numOutputs = this.outputs.length;
        const averageOutputSpeed = speed / numOutputs;

        let excessCapacity = 0;
        const sortedOutputs = this.outputs.slice(0).sort((a,b) => a.maxRateLimitedSpeed() - b.maxRateLimitedSpeed());
        for (let i = 0; i < sortedOutputs.length; i++) {
            const conveyor = sortedOutputs[i];
            const remaining = sortedOutputs.length - i;
            const outputSpeed = Math.min(averageOutputSpeed + excessCapacity / remaining, conveyor.maxRateLimitedSpeed());
            conveyor.simulateForwards(outputSpeed);
            if (conveyor.speed() != outputSpeed) {
                // just bail out now - there's some back prop happening which will have re-run this function.. leave what it's done alone
                // @TODO do this better?
                return;
            }
            excessCapacity += averageOutputSpeed - outputSpeed;
        }
        if (excessCapacity > 0) {
            this.inputs[0].simulateBackwards(speed - excessCapacity);
        }
    }

    public simulateBackwards(speed: number): void {
        // An output has told us it's slowing down .. recalculate splitting
        this.simulateForwards(this.inputs[0].speed());
    }
}

export class Merger extends InputOutput {
    protected maxInputs = 3;
    protected maxOutputs = 1;

    public simulateForwards(speed: number): void {
        if (this.outputs.length === 0) {
            this.simulateBackwards(0);
        } else {
            this.outputs[0].simulateForwards(this.inputSpeed());
        }
    }

    public simulateBackwards(speed: number): void {
        // Output is too fast, slow down the inputs

        const numInputs = this.inputs.length;
        const outputCapacity = speed;
        const requiredAverageInputSpeed = outputCapacity / numInputs;
        // Slowest inputs first so we can take all their capacity if needed
        const sortedInputs = this.inputs.slice(0).sort((a,b) => a.speed() - b.speed());

        let missingCapacity = 0;
        for (let i = 0; i < numInputs; i++) {
            const conveyor = sortedInputs[i];
            const remaining = numInputs - i;
            const newInputSpeed = Math.min(requiredAverageInputSpeed + missingCapacity / remaining, conveyor.speed());
            conveyor.simulateBackwards(newInputSpeed);
            if (conveyor.speed() != newInputSpeed) {
                // just bail out now - there's some forward prop happening which will have re-run this function.. leave what it's done alone
                // @TODO do this better?
                return;
            }
            missingCapacity += requiredAverageInputSpeed - newInputSpeed;
        }
    }

    private inputSpeed() {
        return this.inputs.reduce((sum, input) => { return sum + input.speed()}, 0);
    }
}

export class Constructor extends InputOutput {
    protected maxInputs = 1;
    protected maxOutputs = 1;

    private maxInputSpeed: number;
    private maxOutputSpeed: number;

    constructor(inputSpeed: number, outputSpeed: number) {
        super();
        this.maxInputSpeed = inputSpeed;
        this.maxOutputSpeed = outputSpeed;
    }

    public simulateForwards(speed: number): void {
        if (this.outputs.length === 0) {
            this.simulateBackwards(0);
            return;
        }
        const originalInputSpeed = this.inputs[0].speed();
        const inputSpeed = Math.min(this.maxInputSpeed, originalInputSpeed);
        const outputSpeed = (this.maxOutputSpeed / this.maxInputSpeed) * inputSpeed;
        this.outputs[0].simulateForwards(outputSpeed);
        if (originalInputSpeed == this.inputs[0].speed() && originalInputSpeed > inputSpeed) {
            this.inputs[0].simulateBackwards(inputSpeed);
        }
    }

    simulateBackwards(speed: number): void {
        const ratio = this.maxInputSpeed / this.maxOutputSpeed;
        const newInputSpeed = ratio * speed;
        this.inputs[0].simulateBackwards(newInputSpeed);
    }
}

export interface Input {
    simulateForwards(speed: number): void
    connectInput(inputConveyor: Conveyor): void
    disconnectInput(inputConveyor: Conveyor): void
}
export interface Output {
    connectOutput(output: Conveyor): void
    disconnectOutput(output: Conveyor): void
    simulateBackwards(speed: number): void
}

export class Sink implements Input {
    private input: Conveyor|null = null;
    private maxInputSpeed: number;

    constructor(maxInputSpeed: number = Number.MAX_VALUE) {
        this.maxInputSpeed = maxInputSpeed;
    }

    public connectInput(inputConveyor: Conveyor) {
        this.input = inputConveyor;
    }
    public inputSpeed() {
        return this.input!.speed();
    }
    public simulateForwards(speed: number): void {
        if (speed > this.maxInputSpeed) {
            this.input!.simulateBackwards(this.maxInputSpeed);
        }
        // End of the line - no more forwards propegation
    }
    public disconnectInput(inputConveyor: Conveyor): void {
        this.input = null;
    }
}


