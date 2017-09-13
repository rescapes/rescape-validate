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
const {mappedThrowIfLeft} = require('rescape-ramda').throwing;
const prettyFormat = require('pretty-format');
const {validateItemsEither} = require('./validatorHelpers');
const {vPropOfFunction} = require('./propTypesValidator');

/**
 * Validation function that throws on Error. Since validation is always
 * a coding error, not an IO error, we should never expect the caller to handle it
 * @param {Function} func The function to validate
 * @param {[Array]} expectedItems Array of arrays. Each array contains the name of the argument and either an
 * array of allowed types (e.g. ['arg1', [Object, String]]) or a PropType function, such as.
 *  [
 *    arg1: PropType.String.isRequired,
 *    arg2:
 *  ]
 * @param {String} [funcName] Optional name of the function. Defaults to func.name
 * @returns {Function} A function expecting the actual arguments to validate, which in turn returns
 * a results of the function call (if valid) or throws if not
 */
module.exports.v = (func, expectedItems, funcName = func.name) =>
  R.curryN(
    // Curry based on func length. This lets us return a curried function that can take each of func's actual
    // arguments in a curried manner
    func.length,
    // This compose will act upon the arguments passed to func
    R.compose(
      // Then, If validation failed we'll get an Either.Left with an Error object in it. Parse that object into a
      // helpful message
      mappedThrowIfLeft(error =>
        // Since we handle either Javascript types or PropTypes for validation, the two error objects spit out are
        // different. In the latter case we get a complete error message from the PropTypes module
        error.types ?
          `Function ${error.funcName}, Requires ${error.name} as one of ${R.join(', ', R.map(t => R.type(t()), error.types))}, but got ${prettyFormat(error.actual)}` :
          `${error.message}`),
      // First pass the arguments to the result of this function to validate each argument
      validateItemsEither(func, expectedItems, validateArgument, funcName)
    )
  );

/**
 * Validates a function argument using Validation
 * @param {String} funcName The name of the function being validated, only for Error messages
 * @param {String} name The name of the argument, only for Error messages
 * @param {[Type], Function} Javascript types, e.g. Number, Object, etc allowed as the type,
 * or a single PropType function, e.g. PropType.shape({PropType.string.isRequired}).isRequired
 * @param {Object} value The actual argument value
 * @returns {Validation.Success|Validation.Failure} A Validation.Success or Validation.Failure
 */
const validateArgument = R.curry((funcName, name, typesOrPropType, actual) =>
  R.ifElse(

    // If javascript types they'll be in a array (e.g. [String, Number]
    R.is(Array),

    // Validate that actual matches one of the types or else fail
    types => R.ifElse(
      v => R.any(type => R.is(type, v), types),
      Validation.of,
      _ => Validation.failure([
        {
          funcName,
          name,
          types,
          actual
        }
      ])
    )(actual),

    // Otherwise validate the PropType instance
    propType => vPropOfFunction(propType, funcName, name, actual)
  )(typesOrPropType)
);

