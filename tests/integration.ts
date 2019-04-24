import {Sink, Source, Splitter, Merger, Constructor, connect, simulate} from "../src/index";

function cableConstructor() {
    // 30 in 15 out
    return new Constructor(30, 15);
}

describe('integration', () => {
    describe('connections', () => {
        test('one source to one sink', () => {
            let source = new Source(60);
            let sink = new Sink();
            connect(source, sink);
            simulate(source);
            expect(sink.inputSpeed()).toEqual(60);
        });
        test('one source to one sink with a slow conveyor', () => {
            let source = new Source(60);
            let sink = new Sink();
            connect(source, sink, 10);
            simulate(source);
            expect(sink.inputSpeed()).toEqual(10);
        });
    });

    describe('sink', () => {
        test('source faster than sink will rate limit source', () => {
            let source = new Source(60);
            let sink = new Sink(10);
            connect(source, sink);
            simulate(source);
            expect(sink.inputSpeed()).toEqual(10);
        })
    });

    describe('splitter', () => {
        test('one source to a splitter to one slow sink should slow down source', () => {
            const source = new Source(60);
            const splitter = new Splitter();
            const sink = new Sink(30);

            connect(source, splitter);
            connect(splitter, sink);

            simulate(source);
            expect(source.outputSpeed()).toEqual(30);
            expect(sink.inputSpeed()).toEqual(30);
        });
        test('one source to a splitter to two sinks', () => {
            const source = new Source(60);
            const splitter = new Splitter();
            const sink = new Sink();
            const sink2 = new Sink();

            connect(source, splitter);
            connect(splitter, sink);
            connect(splitter, sink2);

            simulate(source);
            expect(sink.inputSpeed()).toEqual(30);
            expect(sink2.inputSpeed()).toEqual(30);
        });
        test('one source to a splitter to three sinks', () => {
            const source = new Source(60);
            const splitter = new Splitter();
            const sink = new Sink();
            const sink2 = new Sink();
            const sink3 = new Sink();

            connect(source, splitter);
            connect(splitter, sink);
            connect(splitter, sink2);
            connect(splitter, sink3);

            simulate(source);
            expect(sink.inputSpeed()).toEqual(20);
            expect(sink2.inputSpeed()).toEqual(20);
            expect(sink3.inputSpeed()).toEqual(20);
        });
        test('one source to a splitter to a sink and a smelter', () => {
            const source = new Source(60);
            const splitter = new Splitter();
            const sink = new Sink();
            const sink2 = new Sink();

            connect(source, splitter);
            connect(splitter, sink);
            connect(splitter, sink2);

            simulate(source);
            expect(sink.inputSpeed()).toEqual(30);
            expect(sink2.inputSpeed()).toEqual(30);
        });
        test('two outputs are uneven and depend on output draw when below input speed', () => {
            // 60 -> 40, 20 because the 20 will back up (when initially 30/30) giving its excess 10 to the 40
            const source = new Source(60);
            const splitter = new Splitter();
            const sink = new Sink(40);
            const sink2 = new Sink(20);

            connect(source, splitter);
            connect(splitter, sink);
            connect(splitter, sink2);

            simulate(source);
            expect(sink.inputSpeed()).toEqual(40);
            expect(sink2.inputSpeed()).toEqual(20);
        });
        test('two outputs are uneven and depend on output draw when one is below input speed', () => {
            // 60 -> 40, 20 because the 20 will back up (when initially 30/30) giving its excess 10 to the 40
            // The outputs are not proportional to the draw though
            const source = new Source(60);
            const splitter = new Splitter();
            const sink = new Sink(60);
            const sink2 = new Sink(20);

            connect(source, splitter);
            connect(splitter, sink);
            connect(splitter, sink2);

            simulate(source);
            expect(sink.inputSpeed()).toEqual(40);
            expect(sink2.inputSpeed()).toEqual(20);
        });
        test('two outputs are even when outputs can take more than input speed', () => {
            const source = new Source(10);
            const splitter = new Splitter();
            const sink = new Sink(40);
            const sink2 = new Sink(20);

            connect(source, splitter);
            connect(splitter, sink);
            connect(splitter, sink2);

            simulate(source);
            expect(sink.inputSpeed()).toEqual(5);
            expect(sink2.inputSpeed()).toEqual(5);
        });
        test('three outputs when one is below 1/3rd capacity, one is at exactly 1/3rd so the third gets all the excess', () => {
            // 60 -> 10, 20, unlimited
            // the 10 takes 10, but the 20 can take half of the 10s excess, so stays at 20. The unlimited takes the remaining 30
            const source = new Source(60);
            const splitter = new Splitter();
            const sink = new Sink(10);
            const sink2 = new Sink(20);
            const sink3 = new Sink();

            connect(source, splitter);
            connect(splitter, sink);
            connect(splitter, sink2);
            connect(splitter, sink3);

            simulate(source);
            expect(sink.inputSpeed()).toEqual(10);
            expect(sink2.inputSpeed()).toEqual(20);
            expect(sink3.inputSpeed()).toEqual(30);
        });
    });

    describe('merger', () => {
        test('two sources to a merger to one sink', () => {
            const source = new Source(10);
            const source2 = new Source(20);
            const merger = new Merger();
            const sink = new Sink();

            connect(source, merger);
            connect(source2, merger);
            connect(merger, sink);

            simulate(source, source2);
            expect(sink.inputSpeed()).toEqual(30);
        });
        test('three sources to a merger to one sink', () => {
            const source = new Source(10);
            const source2 = new Source(20);
            const source3 = new Source(30);
            const merger = new Merger();
            const sink = new Sink();

            connect(source, merger);
            connect(source2, merger);
            connect(source3, merger);
            connect(merger, sink);

            simulate(source, source2, source3);
            expect(sink.inputSpeed()).toEqual(60);
        });
        test('two fast sources to a merger to one slower sink', () => {
            const source = new Source(20);
            const source2 = new Source(20);
            const merger = new Merger();
            const sink = new Sink(20);

            connect(source, merger);
            connect(source2, merger);
            connect(merger, sink);

            simulate(source, source2);
            expect(source.outputSpeed()).toEqual(10);
            expect(source2.outputSpeed()).toEqual(10);
            expect(sink.inputSpeed()).toEqual(20);
        });
        test('one fast one slow input stopped by a blockage', () => {
            // 30, 10 -> 0 (both inputs should go to 0)
            const source = new Source(30);
            const source2 = new Source(10);
            const merger = new Merger();
            const sink = new Sink(0);

            connect(source, merger);
            connect(source2, merger);
            connect(merger, sink);

            simulate(source, source2);
            expect(source.outputSpeed()).toEqual(0);
            expect(source2.outputSpeed()).toEqual(0);
            expect(sink.inputSpeed()).toEqual(0);
        });
        test('one fast one slow input take backpressure', () => {
            // 30, 10 -> 20 (inputs change to 10,10)
            const source = new Source(30);
            const source2 = new Source(10);
            const merger = new Merger();
            const sink = new Sink(20);

            connect(source, merger);
            connect(source2, merger);
            connect(merger, sink);

            simulate(source, source2);
            expect(source.outputSpeed()).toEqual(10);
            expect(source2.outputSpeed()).toEqual(10);
            expect(sink.inputSpeed()).toEqual(20);
        });
        test('one fast one really slow input take backpressure', () => {
            // 30, 10 -> 20 (inputs change to 19,1) Takes all from the really slow belt then takes the remaining capacity from the other
            const source = new Source(30);
            const source2 = new Source(1);
            const merger = new Merger();
            const sink = new Sink(20);

            connect(source, merger);
            connect(source2, merger);
            connect(merger, sink);

            simulate(source, source2);
            expect(source.outputSpeed()).toEqual(19);
            expect(source2.outputSpeed()).toEqual(1);
            expect(sink.inputSpeed()).toEqual(20);
        });
    });

    describe('loops', () => {
        test('source `-> merger -> splitter -^->sink', () => {
            // 60 in 60 out - the recursion must balance itself to keep the system at 60
            const source = new Source(60);
            const sink = new Sink();
            const merger = new Merger();
            const splitter = new Splitter();

            connect(source, merger);
            connect(merger, splitter);
            connect(splitter, merger);
            connect(splitter, sink);

            simulate(source);

            expect(source.outputSpeed()).toEqual(60);
            expect(sink.inputSpeed()).toEqual(60);
        })
    });

    describe('balancers', () => {
        test('two sources to two outputs', () => {
            // https://i.imgur.com/0exj38Kh.jpg
            const source = new Source(60);
            const source2 = new Source(60);
            const splitter = new Splitter();
            const splitter2 = new Splitter();
            const merger = new Merger();
            const merger2 = new Merger();
            const sink = new Sink();
            const sink2 = new Sink();

            connect(source, splitter);
            connect(splitter, merger);
            connect(splitter, merger2);
            connect(source2, splitter2);
            connect(splitter2, merger);
            connect(splitter2, merger2);
            connect(merger, sink);
            connect(merger2, sink2);

            simulate(source, source2);

            expect(source.outputSpeed()).toEqual(60);
            expect(source2.outputSpeed()).toEqual(60);
            expect(sink.inputSpeed()).toEqual(60);
            expect(sink2.inputSpeed()).toEqual(60);
        });
        test('two sources to two outputs with one output blocked', () => {
            // https://i.imgur.com/0exj38Kh.jpg
            const source = new Source(60);
            const source2 = new Source(60);
            const splitter = new Splitter();
            const splitter2 = new Splitter();
            const merger = new Merger();
            const merger2 = new Merger();
            const sink = new Sink();
            const sink2 = new Sink(0);

            connect(source, splitter);
            connect(splitter, merger);
            connect(splitter, merger2);
            connect(source2, splitter2);
            connect(splitter2, merger);
            connect(splitter2, merger2);
            connect(merger, sink);
            connect(merger2, sink2);

            simulate(source, source2);

            expect(source.outputSpeed()).toEqual(60);
            expect(source2.outputSpeed()).toEqual(60);
            expect(sink.inputSpeed()).toEqual(120);
            expect(sink2.inputSpeed()).toEqual(0);
        });
        test('two sources to two outputs with one slow output', () => {
            // https://i.imgur.com/0exj38Kh.jpg
            const source = new Source(60);
            const source2 = new Source(60);
            const splitter = new Splitter();
            const splitter2 = new Splitter();
            const merger = new Merger();
            const merger2 = new Merger();
            const sink = new Sink();
            const sink2 = new Sink(30);

            connect(source, splitter);
            connect(splitter, merger);
            connect(splitter, merger2);
            connect(source2, splitter2);
            connect(splitter2, merger);
            connect(splitter2, merger2);
            connect(merger, sink);
            connect(merger2, sink2);

            simulate(source, source2);

            expect(source.outputSpeed()).toEqual(60);
            expect(source2.outputSpeed()).toEqual(60);
            expect(sink.inputSpeed()).toEqual(90);
            expect(sink2.inputSpeed()).toEqual(30);
        });
    });

    describe('constructor', () => {
        test('one fast source to one constructor to one sink', () => {
            const source = new Source(50);
            const constructor = cableConstructor(); // 30 -> 15
            const sink = new Sink();

            connect(source, constructor);
            connect(constructor, sink);

            simulate(source);
            expect(source.outputSpeed()).toEqual(30);
            expect(sink.inputSpeed()).toEqual(15);
        });
        test('one fast source to one constructor to one slow sink', () => {
            const source = new Source(50);
            const constructor = cableConstructor(); // 30 -> 15
            const sink = new Sink(10);

            connect(source, constructor);
            connect(constructor, sink);

            simulate(source);
            expect(source.outputSpeed()).toEqual(20);
            expect(sink.inputSpeed()).toEqual(10);
        });
        test('one slow source to one constructor to one sink', () => {
            const source = new Source(20);
            const constructor = cableConstructor(); // 30 -> 15
            const sink = new Sink();

            connect(source, constructor);
            connect(constructor, sink);

            simulate(source);
            expect(source.outputSpeed()).toEqual(20);
            expect(sink.inputSpeed()).toEqual(10);
        });
    })
});