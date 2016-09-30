<a href="https://promisesaplus.com/"><img src="https://promisesaplus.com/assets/logo-small.png" align="right" /></a>
# jellypromise [![Build Status](https://img.shields.io/travis/JoshuaWise/jellypromise.svg)](https://travis-ci.org/JoshuaWise/jellypromise)

This is an implementation of Promises that achieves the following design goals:
- Tiny size (2.51 kB minified and gzipped)
- Fast performance (faster than [bluebird](https://github.com/petkaantonov/bluebird/))
- A superset of the [ES6 Promise](http://www.ecma-international.org/ecma-262/6.0/#sec-promise-objects)
- Has a very useful, carefully-selected set of utilities, without bloat
- Logs unhandled errors by default (the opposite of what [then/promise](https://github.com/then/promise) does), provides long stack traces, and provides utilities for useful error handling patterns

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

### .catch([*...predicates*], *onRejected*) -> *promise*

Sugar for `.then(null, onRejected)`, to mirror `catch` in synchronous code.

If any `predicates` are specified, the `onRejected` handler will only catch exceptions that match one of the `predicates`.

A `predicate` can be:
- an `Error` class
 - example: `.catch(TypeError, SyntaxError, func)`
- an object defining required property values
 - example: `.catch({code: 'ENOENT'}, func)`
- a filter function
 - example: `.catch(function (err) {return err.statusCode === 404}, func)`

### .catchLater() -> *this*

Prevents an error from being logged if the promise gets rejected without yet having a rejection handler (see [Unhandled Rejections](#unhandled-rejections)).

### .finally(*handler*) -> *promise*

Pass a `handler` that will be called regardless of this promise's fate. The `handler` will be invoked with no arguments, and it cannot change the promise chain's current fulfillment value or rejection reason. If `handler` returns a promise, the promise returned by `.finally` will not be settled until that promise is settled.

This method is primarily used for cleanup operations.

### .tap(*handler*) -> *promise*

Like [`.finally`](#finallyhandler---promise), but the `handler` will not be called if this promise is rejected. The `handler` cannot change the promise chain's fulfillment value, but it can delay chained promises by returning an unsettled promise (just like [`.finally`](#finallyhandler---promise)). The handler is invoked with a single argument: the fulfillment value of the previous promise.

This method is primarily used for side-effects.

### .become(*value*) -> *promise*

Sugar for `.then(function () {return value})`.

### .else([*...predicates*], *value*) -> *promise*

Sugar for `.catch(function () {return value})`. This method is used for providing default values on a rejected promise chain. Predicates are supported, just like with the [`.catch`](#catchpredicates-onrejected---promise) method.

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

## License

[MIT](https://github.com/JoshuaWise/jellypromise/blob/master/LICENSE)
