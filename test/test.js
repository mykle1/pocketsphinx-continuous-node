require('should');
const proxyquire = require('proxyquire');
const util = require('util');
const EventEmitter = require('events').EventEmitter;

function CbStub() {
  function StubEmitter() {
    EventEmitter.call(this);
  }

  util.inherits(StubEmitter, EventEmitter);
  const stubSpawn = new StubEmitter();
  stubSpawn.stdout = new StubEmitter();
  stubSpawn.stderr = new StubEmitter();
  const cbStub = {
    obj: {
      spawn() {
        return stubSpawn;
      },
      emit(...args) {
        stubSpawn.emit(...args);
      }
    },
    streams: {
      err: stubSpawn.stderr,
      out: stubSpawn.stdout
    }
  };

  return cbStub;
}

describe('Complete test suite', () => {
  it('Should expose a function', () => {
    require('..').should.be.instanceOf(Function);
  });

  it('Should emit the expected data', done => {
    const tc = new CbStub();
    const Psc = proxyquire('..', {
      child_process: tc.obj
    });
    const psc = new Psc({
      setId: 'testset'
    });
    psc.on('data', d => {
      d.should.equal('TEST');
      done();
    });
    // Write a couple of events.
    tc.streams.out.emit('data', '');
    tc.streams.out.emit('data', 'TEST');
  });

  it('Should error and such in expected manner', done => {
    const tc = new CbStub();
    const Psc = proxyquire('..', {
      child_process: tc.obj
    });
    const psc = new Psc({
      setId: Math.random(),
      verbose: true
    });
    let testCalled = false;

    psc.on('data', d => {
      if (d === 'data') {
        // Also cool.
        return;
      }
      d.should.equal('TEST2');
    });

    psc.on('test2', () => {
      testCalled = true;
    });

    let count = 0;
    psc.on('error', err => {
      if (count === 0) {
        err.should.equal(42);
        count++;
      } else {
        err.should.equal(43);
        testCalled.should.equal(true);
        done();
      }
    });
    // Write a couple of events.
    tc.streams.err.emit('data', '');
    tc.streams.err.emit('data', 'TEST2');
    // Write a reserved word as data event, for coverage.
    tc.streams.out.emit('data', 'data');
    // Write a non-reserved word, so we can check it is being emitted.
    tc.streams.out.emit('data', 'TEST2');
    tc.obj.emit('close', 42);
    tc.obj.emit('error', 43);
  });
});
