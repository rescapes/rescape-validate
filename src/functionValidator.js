/**
 * Created by Andy Likuski on 2017.08.16
 * Copyright (c) 2017 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const Validation = require('ramda-fantasy-validation');
const R = require('ramda');
const {throwIfLeft} = require('rescape-ramda').throwing;
const prettyFormat = require('pretty-format');
const {validateItemsEither} = require('./validatorHelpers');

/**
 * Validation function that throws on Error. Since validation is always
 * a coding error, not an IO error, we should never expect the caller to handle it
 * @param {Function} func The function to validate
 * @param {[Array]} expectedItems Array of arrays. Each array contains the name of the argument and an
 * array of allowed types (e.g. ['arg1', [Object, String]])
 * @param {String} [funcName] Optional name of the function. Defaults to func.name
 * @returns {Function} A function expecting the actual arguments to validate, which in turn returns
 * a results of the function call (if valid) or throws if not
 */
module.exports.v = (func, expectedItems, funcName = func.name) =>
  R.curryN(
    func.length,
    R.compose(
      throwIfLeft,
      validateItemsEither(func, expectedItems, validateArgument, funcName)
    )
  );

/**
 * Validates a function argument using Validation
 * @param {String} funcName The name of the function being validated, only for Error messages
 * @param {String} name The name of the argument, only for Error messages
 * @param {[Type]} actual Javascript types, e.g. Number, Object, etc allowed as the type
 * @param {Object} value The actual argument value
 * @returns {Validation.Success|Validation.Failure} A Validation.Success or Validation.Failure
 */
const validateArgument = R.curry((funcName, name, types, actual) =>
  R.ifElse(
    v => R.any(type => R.is(type, v), types),
    Validation.of,
    _ => Validation.failure([`Function ${funcName}, Requires ${name} as one of ${R.join(', ', R.map(t => R.type(t()), types))}, but got ${prettyFormat(actual)}`])
  )(actual)
);
