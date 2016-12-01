<a href="https://promisesaplus.com/"><img src="https://promisesaplus.com/assets/logo-small.png" align="right" /></a>
# jellypromise [![Build Status](https://img.shields.io/travis/JoshuaWise/jellypromise.svg)](https://travis-ci.org/JoshuaWise/jellypromise)

This is an implementation of Promises that achieves the following design goals:
- Tiny size (3.71 kB minified and gzipped)
- Fast performance (often faster than [bluebird](https://github.com/petkaantonov/bluebird/))
- Very low memory overhead
- A superset of the [ES6 Promise](http://www.ecma-international.org/ecma-262/6.0/#sec-promise-objects)
- Has a useful, carefully-selected set of utilities, without bloat
- Logs unhandled errors by default (the opposite of what [then/promise](https://github.com/then/promise) does), provides long stack traces, and provides utilities for useful error handling patterns
- Provides a very efficient object streaming library for asynchronous processing chains with concurrency control

## Installation

```bash
npm install --save jellypromise
```

## Usage

```js
var Promise = require('jellypromise');

var promise = new Promise(function (resolve, reject) {
  get('http://www.google.com', function (err, res) {
    if (err) reject(err);
    else resolve(res);
  });
});
```

## Unhandled Rejections

When a promise is rejected but has no rejection handlers, the rejection will be logged to the console unless a rejection handler is added before the next event loop cycle. This helps the programmer quickly identify and fix errors.

However, in some situations, you may wish to refrain from adding a rejection handler until a later time. In these cases, you can use the [`.catchLater()`](#catchlater---this) utility method to suppress this behavior.

## Production Mode

By default, long stack traces and warnings are turned on for superior debugging capabilities. However, if you use production mode, they will be turned off for performance reasons.

To use production mode, just load the module this way:

```js
var Promise = require('jellypromise/production');
```

## Browser Support

- Chrome 5+
- Firefox 4+
- Safari 5+
- Opera 11.6+
- Internet Explorer 9+

# API

## new Promise(*handler*)

This creates and returns a new promise. `handler` must be a function with the following signature:

`function handler(resolve, reject)`

 1. `resolve` is a function that should be called with a single argument. If it is called with a non-promise value then the promise is fulfilled with that value. If it is called with a promise, then the constructed promise takes on the state of that promise.
 2. `reject` is a function that should be called with a single argument. The returned promise will be rejected with that argument.

### .then([*onFulfilled*], [*onRejected*]) -> *promise*

This method conforms to the [Promises/A+ spec](http://promises-aplus.github.io/promises-spec/).

If you are new to promises, the following resources are available:
 - [Matt Greer's promise tutorial](http://www.mattgreer.org/articles/promises-in-wicked-detail/)
 - [HTML5 Rocks's promise tutorial](http://www.html5rocks.com/en/tutorials/es6/promises/)
 - [Promises.org's introduction to promises](https://www.promisejs.org/)
 - [David Walsh's article on promises](https://davidwalsh.name/promises)

If they are provided, `onFulfilled` and `onRejected` should be functions.

### .catch([*predicate*], *onRejected*) -> *promise*

Sugar for `.then(null, onRejected)`, to mirror `catch` in synchronous code.

If a `predicate` is specified, the `onRejected` handler will only catch exceptions that match the `predicate`.

The `predicate` can be:
- an `Error` class
 - example: `.catch(TypeError, func)`
- a filter function
 - example: `.catch(function (err) {return err.statusCode === 404}, func)`
- an array of accepted `predicates`
 - example: `.catch([TypeError, SyntaxError, is404], func)`

### .catchLater() -> *this*

Prevents an error from being logged if the promise gets rejected without yet having a rejection handler (see [Unhandled Rejections](#unhandled-rejections)).

### .finally(*handler*) -> *promise*

Pass a `handler` that will be called regardless of this promise's fate. The `handler` will be invoked with no arguments, and it cannot change the promise chain's current fulfillment value or rejection reason. If `handler` returns a promise, the promise returned by `.finally` will not be settled until that promise is settled.

This method is primarily used for cleanup operations.

### .tap(*handler*) -> *promise*

Like [`.finally`](#finallyhandler---promise), but the `handler` will not be called if this promise is rejected. The `handler` cannot change the promise chain's fulfillment value, but it can delay chained promises by returning an unsettled promise (just like [`.finally`](#finallyhandler---promise)). The handler is invoked with a single argument: the fulfillment value of the previous promise.

This method is primarily used for side-effects.

### .rollback(*handler*) -> *promise*

The opposite of [`.tap`](#taphandler---promise). The given `handler` will only be invoked if this promise is rejected. Unlike [`.catch`](#catchpredicate-onrejected---promise), however, the returned promise will still be rejected with the original rejection reason. Just like [`.tap`](#taphandler---promise) and [`.finally`](#finallyhandler---promise), the handler can delay chained promises by returning an unsettled promise. The handler is invoked with a single argument: the rejection reason of the previous promise.

This method is primarily used for rollback operations.

### .become(*fulfilledValue*, [*rejectedValue*]) -> *promise*

Sugar for `.then(function () {return fulfilledValue})`.

If a second argument is passed, it is equivilent to:

`.then(function () {return fulfilledValue}, function () {return rejectedValue})`.

### .else([*predicate*], *value*) -> *promise*

Sugar for `.catch(function () {return value})`. This method is used for providing default values on a rejected promise chain. Predicates are supported, just like with the [`.catch`](#catchpredicate-onrejected---promise) method.

### .delay(*milliseconds*) -> *promise*

Returns a new promise chained from this one, whose fulfillment is delayed by the specified number of `milliseconds` from when it would've been fulfilled otherwise. Rejections are not delayed.

### .timeout(*milliseconds*, [*reason*]) -> *promise*

Returns a new promise chained from this one. However, if this promise does not settle within the specified number of `milliseconds`, the returned promise will be rejected with a `TimeoutError`.

If you specify a string `reason`, the `TimeoutError` will have `reason` as its message. Otherwise, a default message will be used. If `reason` is an `instanceof Error`, it will be used instead of a `TimeoutError`.

`TimeoutError` is available at `Promise.TimeoutError`.

### .log([*prefix*]) -> *promise*

Sugar for:
```js
.then(function (value) {
  console.log(value)
  return value
})
```

If `prefix` is provided, it will be prepended to the logged `value`, separated by a space character.

### .inspect() -> *object*

Returns an object that describes the current state of the promise. The returned object is not live, and will not update over time—it's just a snapshot.

If the promise is:
 - pending, the descriptor will be `{ state: 'pending' }`
 - fulfilled, the descriptor will be `{ state: 'fulfilled', value: <fulfillmentValue> }`
 - rejected, the descriptor will be `{ state: 'rejected', reason: <rejectionReason> }`

In Node.js, you'll always see this descriptor object when passing a `jellypromise` to `console.log()`.

### .stream() -> *promiseStream*

Returns a new `PromiseStream` that will contain the data in this promise's fulfillment value. If the promise is not fulfilled with an iterable object, the returned stream is rejected with a `TypeError`.

To learn about PromiseStreams, see this [Streaming API](#streaming-api) section.

### *static* Promise.resolve(*value*) -> *promise*

Creates a promise that is resolved with the given `value`. If you pass a promise or promise-like object, the returned promise takes on the state of that promise-like object (fulfilled or rejected).

### *static* Promise.reject(*value*) -> *promise*

Creates a promise that is rejected with the given `value` (usually an `Error` object) as its rejection reason.

### *static* Promise.race(*iterable*) -> *promise*

Returns a promise that will fulfill or reject with the same value/exception as the first fulfilled/rejected promise in the `iterable` argument.

Non-promise values in the `iterable` are treated like already-fulfilled promises.

### *static* Promise.all(*iterable*) -> *promise*

Returns a promise for an `iterable` of promises. The returned promise will be rejected if any of promises in `iterable` are rejected. Otherwise, it will be fulfilled with an array of each fulfillment value, respectively.

Non-promise values in the `iterable` are treated like already-fulfilled promises.

```js
Promise.all([Promise.resolve('a'), 'b', Promise.resolve('c')])
  .then(function (results) {
    assert(results[0] === 'a')
    assert(results[1] === 'b')
    assert(results[2] === 'c')
  })
```

### *static* Promise.any(*iterable*) -> *promise*

Returns a promise for an `iterable` of promises. It will be fulfilled with the value of the first fulfilled promise in `iterable`. If all of the given promises reject, it will be rejected with the rejection reason of the promise that rejected first.

Non-promise values in the `iterable` are treated like already-fulfilled promises.

### *static* Promise.props(*object*) -> *promise*

Like [`Promise.all`](#static-promisealliterable---promise), but for an object's properties instead of iterated values. Returns a promise that will be resolved with an object that has fulfillment values at respective keys to the original `object`. Only the `object`'s own enumerable properties are considered (those retrieved by [`Object.keys`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys)).

Non-promise values in the `iterable` are treated like already-fulfilled promises.

```js
Promise.props({users: getUsers(), news: getNews()})
  .then(function (results) {
    console.log(results.users)
    console.log(results.news)
  })
```

### *static* Promise.settle(*iterable*) -> *promise*

Given an `iterable` of promises, returns a promise that fulfills with an array of promise descriptor objects.

If the corresponding input promise is:
 - fulfilled, the descriptor will be `{ state: 'fulfilled', value: <fulfillmentValue> }`
 - rejected, the descriptor will be `{ state: 'rejected', reason: <rejectionReason> }`

Non-promise values in the `iterable` are treated like already-fulfilled promises.

### *static* Promise.after(*milliseconds*, [*value*]) -> *promise*

Returns a promise that will be resolved with `value` after the specified number of milliseconds. By default, `value` is `undefined`.

If `value` is a promise itself, the returned promise will adopt the state of `value` after the specified number of milliseconds.

### *static* Promise.isPromise(*value*) -> *boolean*

Returns either `true` or `false`, whether `value` is a promise-like object (i.e., it has a `.then` method).

### *static* Promise.promisify(*function*, [*options*]) -> *function*

**NOTE: This function is not available in the browser!**

Takes a `function` which accepts a node style callback and returns a new function that returns a promise instead.

```js
var fs = require('fs')
var read = Promise.promisify(fs.readFile)

var promise = read('foo.json', 'utf8')
  .then(function (str) {
    var json = JSON.parse(str)
  })
```

There are two possible options:
  - `multiArgs`
    * Setting this option to `true` means the resulting promise will always fulfill with an array of the callback's success values (arguments after the first).
  - `deoptimize`
    * Setting this option to `true` can potentially improve the performance of functions that are frequently passed a widely varying number of arguments (and typically a very high number of arguments). In most cases though, this option will reduce the performance of the function.

### *static* Promise.nodeify(*function*) -> *function*

**NOTE: This function is not available in the browser!**

Takes a promise-returning `function`, and returns a new function that instead accepts a node style callback as its last argument. The newly created function will always return undefined.

```js
var callbackAPI = Promise.nodeify(promiseAPI)

callbackAPI('foo', 'bar', function (err, result) {
  // handle error or result here
})
```

# Streaming API

Some promise libraries have functions like `.map()` or `.filter()` which operate on arrays of promises. Unfortunately, this is a very inefficient way to do batch processing on promises. Large and unnecessary arrays are kept in memory, and usually thousands of closures are created when processing large datasets this way. Additionally, each promise must wait for every other promise to finish one operation before the next operation can be started, which can cause serious bottlenecks.

To solve these problems, we provide the class `Promise.Stream`. For detailed documentation, see the [Streaming API](https://github.com/JoshuaWise/jellypromise/wiki/Streaming-API).

Promises of iterables can be transformed into a stream by using the `Promise#stream` method:

```js
Promise.resolve(['a', 'b', 'c'])
    .stream()
    .map(function (value, index) {return value + value;})
    .reduce(function (previous, current) {return previous + current})
    .log()

// => "aabbcc"
```



## License

[MIT](https://github.com/JoshuaWise/jellypromise/blob/master/LICENSE)
