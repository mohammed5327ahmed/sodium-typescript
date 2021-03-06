import { expect } from 'chai';


/**
  * Fantasy-land Algebraic Data Type Compatability.
  * Cell satisfies the Monad and Comonad Categories (and hence Functor, Apply, Applicative, and Extend as well)
  * @see {@link https://github.com/fantasyland/fantasy-land} for more info
  * @see {@link https://github.com/sanctuary-js/sanctuary/blob/master/test/Maybe/Maybe.js} for valid test examples (Sanctuary's Maybe)
  */

const laws = require('fantasy-laws');

const { create, env } = require('sanctuary');
import * as jsc from 'jsverify';
import {S} from "../../test-utils/Sanctuary";
import { Cell, StreamSink, Stream } from '../../lib/Sodium';



/*
 * Cell
 */
//would be nice if we could push all samples off to listeners... like in Fantasy-land Practical Tests below, but for unit testing it's okay

function CellArb<A>(arb: jsc.Arbitrary<A>) {
  return arb.smap(x => new Cell<A>(x), x => x.sample());
}

function CellEq<T>(a: Cell<T>, b: Cell<T>) {
  return a.sample() === b.sample();
}

function CellHead(x: string): Cell<string> {
  const head = S.head(x);

  return new Cell<string>(head.isNothing ? "" : head.value);
}

function CellParseInt(radix: number): ((x: number) => Cell<number>) {
  return function (x: number) {
    const m = S.parseInt(radix)(x);
    return new Cell<number>(m.isNothing ? 0 : m.value);
  };
}

export class FantasylandCellTest {


  'Cell - Functor Laws'() {
    const testLaws = laws.Functor(CellEq);

    testLaws.identity(
      CellArb<number>(jsc.number)
    );

    testLaws.composition(
      CellArb<number>(jsc.number),
      jsc.constant(Math.sqrt),
      jsc.constant(Math.abs)
    );
  }

  'Apply Laws'() {
    const testLaws = laws.Apply(CellEq);

    testLaws.composition(
      CellArb(jsc.constant(Math.sqrt)),
      CellArb(jsc.constant(Math.abs)),
      CellArb(jsc.number)
    );
  }

  'Appplicative Laws'() {
    const testLaws = laws.Applicative(CellEq, Cell);

    testLaws.identity(
      CellArb(jsc.number)
    );

    testLaws.homomorphism(
      jsc.constant(Math.abs),
      jsc.number
    );

    testLaws.interchange(
      CellArb(jsc.constant(Math.abs)),
      jsc.number
    );

  };

  'Chain Laws'() {
    const testLaws = laws.Chain(CellEq);
    testLaws.associativity(
      CellArb(jsc.array(jsc.asciistring)),
      jsc.constant(CellHead),
      jsc.constant(CellParseInt(36))
    );
  };

  'Monad Laws'() {
    const testLaws = laws.Monad(CellEq, Cell);

    testLaws.leftIdentity(
      jsc.constant(CellHead),
      jsc.string
    );

    testLaws.rightIdentity(
      CellArb(jsc.number)
    );
  };

  'Extend Laws'() {
    const testLaws = laws.Extend(CellEq);
    testLaws.associativity(
      CellArb(jsc.integer),
      jsc.constant(function (c: Cell<number>) { return c.sample() + 1; }),
      jsc.constant(function (c: Cell<number>) { return c.sample() * c.sample(); })
    );
  };

  'Comonad Laws'() {
    const testLaws = laws.Comonad(CellEq);

    testLaws.leftIdentity(
      CellArb(jsc.number)
    );

    testLaws.rightIdentity(
      CellArb(jsc.string),
      jsc.constant(CellHead)
    );
  }
}

export class FantasyLandPracticalTests {

  'Lift'(done) {
    const addFunctors = S.lift2(S.add);

    const cResult = addFunctors(new Cell<number>(2), new Cell<number>(3));
    const kill = cResult.listen((n: number) => {
        expect(n).to.equal(5);
        done();
    });

    kill();
  };

  'Sequence'(done) {
    const aStreams = [
      new StreamSink<string>(),
      new StreamSink<string>(),
      new StreamSink<string>()
    ]

    const aCells: Array<Cell<string>> = aStreams.map(stream => stream.hold(""));

    const cArrays: Cell<Array<string>> = S.sequence(Cell, aCells);

    let idx = 0;


    const kill = cArrays.listen((sArr: Array<string>) => {
      const res = sArr
        .filter(val => val.length)
        .join(" ");

      let target: string;

      switch (idx++) {
        case 0: target = ""; break;
        case 1: target = "Hello"; break;
        case 2: target = "Hello World"; break;
        case 3: target = "Do World"; break;
        case 4: target = "Do"; break;
        case 5: target = "Do Good"; break;
        case 6: target = "Do Good !"; break;
      }

      expect(res).to.equal(target);
      if (idx === 7) {
        done();
      }


    });


    aStreams[0].send("Hello");
    aStreams[1].send("World");
    aStreams[0].send("Do");
    aStreams[1].send("");
    aStreams[1].send("Good");
    aStreams[2].send("!");

    kill();
  };


  'Join'(done) {
    const a = new Cell<number>(3);
    const d = S.join(new Cell<Cell<number>>(a));
    const kill = d.listen((n: number) => {
      expect(n).to.equal(3);
      done();
    });
    kill();
  }

  'Chain'(done) {
    const a = new Cell<number>(3);

    const e = S.chain((n: number) => new Cell<number>(n + 2), a);
    const kill = e.listen((n: number) => {
      expect(n).to.equal(5);
      done();
    });
    kill();
  }

  'Concat'(done) {
    const s1 = new StreamSink<number>();
    const s2 = new StreamSink<number>();
    const s3 = S.concat(s1, s2);

    let fired: boolean = false;


    const kill = s3.listen((n: number) => {
      if (!fired) {
        expect(n).to.equal(5);
        fired = true;
      } else {
        expect(n).to.equal(42);
        done();
      }
    });

    s1.send(5);
    s2.send(42);
    kill();
  }
}




/*
Stream
  describe('Fantasy-land Stream', () => {
    /*

    TODO: figure out right way to define arb and equality here
    If a solution is found that uses listen(), consider porting Cell to that approach as well.

    function StreamArb<A>(arb: jsc.Arbitrary<A>) {
      return arb.smap(x => {
        const sink = new StreamSink<A>();
        sink.listen(() => {});
        sink.send(x);
        return sink;
      }, x => x.hold(undefined).sample());
    }

    function StreamEq<T>(a: Stream<T>, b: Stream<T>) {
      console.log(a.hold(undefined).sample());
      return a.hold(undefined).sample() === b.hold(undefined).sample();
    }

    describe('Functor Laws', () => {
      const testLaws = laws.Functor(StreamEq);

      it('Identity', testLaws.identity(
        StreamArb<number>(jsc.number)
      ));

      it('Composition', testLaws.composition(
        StreamArb<number>(jsc.number),
        jsc.constant(Math.sqrt),
        jsc.constant(Math.abs)
      ));
    });
    */
