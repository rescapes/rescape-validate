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

import Validation from 'ramda-fantasy-validation';
import * as R from 'ramda';
import Result from 'folktale/result';
import {mappedThrowIfResultError} from '@rescapes/ramda';

/**
 * Validates each key/value of an object against the expectedItems
 * @param {Function} itemValidator Function with arguments (componentName, propName, propValue, prop),
 * where componentName is a descriptor for error messages, propNmae is the expected object key, propValue is the
 * expected object value or propType, and prop is the actual value
 * @param {String} componentName Descriptor of the object or component being evaluated. Used only for error messages
 * @param {Object} expectedItems An objects of items to match. This need not be matching values, but could instead
 * be PropTypes or something similar. The passed in object contain all expectedItems if they are not required.
 * This is determined by the itemValidator, which is called for each expectedItem
 * @param {Object} props Actual props to validate
 * @returns {Function} A function that takes on argument, the object to validate, and returns a Validation
 * object containing the object if successful and an array of errors if unsuccessful
 */
const validateObject = R.curry((itemValidator, componentName, expectedItems, props) => {
    const length = R.length(R.keys(expectedItems));
    return R.apply(R.useWith(
      // Lift the expected number of Validation objects.
      // If all successful just return the props in a Validation.Success
      Validation.liftAN(length, R.curryN(length, () => props)),
      // Map each pair to the itemValidator, each of which returns a Validation.success or Validation.failure
      R.repeat(
        // Always pass all props
        ([expectedKey, expectedValue]) => itemValidator(componentName, expectedKey, expectedValue, props),
        // Apply the same function for each expectedItem
        length
      )
    ), R.toPairs(expectedItems));
  }
);

// Like validateObject but converts Validation objects to Result
const validateObjectResult = R.curry((itemValidator, componentName, expectedItems) =>
  R.compose(
    // Then fold the Validation.Success|Failure into Result.Ok|Error
    // (predefined fold function has an error in it)
    // TODO it should be fixed now
    R.ifElse(
      obj => obj.isSuccess,
      obj => Result.Ok(obj.value),
      obj => Result.Error(obj.value)),
    // Pass all the arguments to the result of this validator function
    validateObject(itemValidator, componentName, expectedItems)
  )
);

/**
 * Validates an object's props against a prop-types object
 * @param {Object} propTypes PropTypes to validate the props, keyed by prop and valued by PropType
 * @param {String} componentName The name of the component being validated, used only for error messages
 * @param {*} props The object of props to validate
 * @returns {Object} The props
 */
export const vProps = R.curry((propTypes, componentName, props) =>
  R.compose(
    // Extract the Result.Ok
    result => result.unsafeGet(),
    // If Result.Error, map each Error value within Result to a useful message and then throw
    mappedThrowIfResultError(({propName, component, error: {message, stack}}) => `Failed ${propName} for ${componentName} type: ${message} Stack: ${stack}`),
    // Pass actual so we can dump the object in an Error message
    validateObjectResult(
      // Used to validate each prop
      validatePropType,
      // function to check
      componentName,
      // expected types
      propTypes
    )
  )(props)
);

/**
 * Validates a function argument based on a PropType, returning a Validation
 * @param {Object} propType PropType function to validate the prop value
 * @param {String} funcName The name of the function being validated, used only for error messages
 * @param {String} name The name of the argument being validated, used only for error messages
 * @param {Object} actual. The actual value to validate again the PropType
 * @returns {Object} The props
 *
 */
export const vPropOfFunction = R.curry((propType, funcName, name, actual) =>
  // Do a single PropType validation and map a success validation to the actual value that was tested
  validatePropType(funcName, name, propType, {[name]: actual}).map(_ => actual)
);

/**
 * Modified from https://github.com/facebook/prop-types/issues/34
 * @param {String} componentName A descriptor of the object being validated
 * @param {String} propName The key of the object to validate
 * @param {Function} propType The PropType function
 * @param {Object} props The object to validate
 * @returns {Validation} Validation success or failure
 */
export const validatePropType = R.curry((componentName, propName, propType, props) => {
  if (typeof (propType) !== 'function') {
    // Generate an error so we have a stack trace
    let error = null;
    try {
      throw new Error('TypeChecker should be a function');
    } catch (e) {
      error = e;
    }
    return Validation.failure([
      {
        componentName,
        propName,
        error
      }
    ]);
  }
  const propTypeError = propType(
    props,
    propName,
    componentName,
    'location',
    null,
    'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED');
  // specified using prop-types version 15.5.8 only in package.json
  if (propTypeError instanceof Error) {
    // Generate an error so we have a stack trace
    let error = null;
    try {
      throw new Error(propTypeError.message);
    } catch (e) {
      error = e;
    }
    return Validation.failure([
      {
        componentName,
        propName,
        propType,
        error
      }
    ]);
  }
  // No value is passed. The caller should map Validation success to the original value passed,
  // since some callers need to return the aggregate props
  return Validation.of();
});
