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
const {Either} = require('ramda-fantasy');
const prettyFormat = require('pretty-format');


/**
 * Pure function validation wrapper returning Either
 * @param {Function} func The function to validate against and call with the validated
 * items.
 * The expectedItems and actualItems must be the length of this function's number of arguments.
 * If validating an object this can be a function created that expects each property
 * of the object and simply returns the object
 * @param {[[string, *]]} expectedItems An array of pairs of expected items, either exact matches
 * or a structure that can be used for validation using itemValidator. Each pair is a name
 * and a value. The name is only used for error messages.
 *
 * For a function argument validation, for instance:
 * ['param1', [Object, String]] to call itemValidator('param1', [Object, String]) for function argument
 * validation.
 *
 * To validate an object convert it to pairs before passing as expectedItems
 *
 * @param {Function} itemValidator in the form (descriptor, name, expected, actual) => Validation.success|failure
 * A validator that compares and array or object of expected to an array of actual.
 *
 * @param {*} descriptor Name of thing being validated. This could be the function name
 * or potentially the thing passed in to validate. It is only used for error messages
 * @returns {Function} A function that expects the same arguments in number as func (not an array0. When
 * called with those arguments, the function returns a Validation.success if all validations
 * pass or a Validation.failure with messages for all of the
 * failing validations
 */
const validateItems = (func, expectedItems, itemValidator, descriptor) =>
  // useWith returns a function that expects sequence, in this case the actual parameters to validate.
  // Each expected parameter value is given to a curried validate function as the value parameter (the forth
  // value of the itemValidator)
  // useWith applies the results of all the validate calls to Validation.liftAN,
  // which in turn returns a Validation.failure or else calling func and wrapping the result in a Validation.success
  R.ifElse(
    R.equals(R.length(func)),
    // Return this function, which expects the pairs of items
    len => R.useWith(
      Validation.liftAN(len, func),
      R.map(([expectedKey, expectedValue]) => itemValidator(descriptor, expectedKey, expectedValue), expectedItems)
    ),
    // Return a function here since this will be called with the actual
    // parameters, which we'll ignore. It would be better to short-circuit
    // the Compose call in vEither but I don't want to deal with this special Validation container
    len => () => {
      // Generate an error so we have a stack trace
      let error = null;
      const message = `Function ${func.name || '(unnamed)'}: argument length ${R.length(func)} is not matched by validators' length ${len}:\n${prettyFormat(expectedItems)})`;
      try {
        throw new Error(message);
      } catch (e) {
        error = e;
      }
      return Validation.failure([
        {
          message,
          error
        }
      ]);
    }
  )(R.length(expectedItems));

// See validateItems. This simply converts Validation to Either an maintains the curryability
module.exports.validateItemsEither = (func, expectedItems, itemValidator, descriptor) =>
  // Return a function that curries until all of func's arguments are received
  R.curryN(
    func.length,
    R.compose(
      // Then fold the Validation.Success|Failure into Either.Right|Left
      // (predefined fold function has an error in it)
      // TODO this should be fixed now
      R.ifElse(
        obj => obj.isSuccess,
        obj => Either.Right(obj.value),
        obj => Either.Left(obj.value)),
      // Pass all the arguments to the result of this validator function
      validateItems(func, expectedItems, itemValidator, descriptor)
    )
  );

/**
 * Test helper to extract validation error messages
 * @param {Function} validatorCall Unary function expected to throw a validation error
 * @return {String[]} Error messages
 **/
module.exports.expectValidationError = validatorCall => {
  try {
    validatorCall();
  }
  catch (e) {
    // Extract error message strings
    return R.map(str => R.slice(0, R.indexOf(', Stack', str), str), R.split('; ', e.message));
  }
  throw Error("No validation error occured");
};
