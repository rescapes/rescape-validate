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
const {mappedThrowIfLeft} = require('rescape-ramda').throwing;

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
;

// Like validateObject but converts Validation objects to Either
const validateObjectEither = R.curry((itemValidator, componentName, expectedItems) =>
  R.compose(
    // Then fold the Validation.Success|Failure into Either.Right|Left
    // (predefined fold function has an error in it)
    // TODO this should be fixed now
    R.ifElse(
      obj => obj.isSuccess,
      obj => Either.Right(obj.value),
      obj => Either.Left(obj.value)),
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
module.exports.vProps = R.curry((propTypes, componentName, props) =>
  R.compose(
    // If Either.Left, map each Error value within Either to a useful message and then throw
    mappedThrowIfLeft(error => `Failed ${error.propName} for ${error.componentName} type: ${error.message}`),
    // Pass actual so we can dump the object in an Error message
    validateObjectEither(
      // function to check
      componentName,
      // expected types
      propTypes,
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
module.exports.vPropOfFunction = R.curry((propType, funcName, name, actual) =>
  // Do a single PropType validation and map a success validation to the actual value that was tested
  validatePropType(funcName, name, propType, actual).map(_ => actual)
);

/**
 * Modified from https://github.com/facebook/prop-types/issues/34
 * @param {String} componentName A descriptor of the object being validated
 * @param {String} propName The key of the object to validate
 * @param {Function} propType The PropType function
 * @param {Object} props The object to validate
 * @returns {Validation} Validation success or failure
 */
const validatePropType = module.exports.validatePropType = R.curry((componentName, propName, propType, props) => {
  if (typeof (propType) !== 'function') {
    return Validation.failure([{
      componentName,
      propName,
      message: 'TypeChecker should be a function'
    }]);
  }
  const error = propType(
    props,
    propName,
    componentName,
    'location',
    null,
    'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED');
  // specified using prop-types version 15.5.8 only in package.json
  if (error instanceof Error) {
    return Validation.failure([{
      componentName,
      propName,
      propType,
      message: error.message
    }]);
  }
  // No value is passed. The caller should map Validation success to the original value passed,
  // since some callers need to return the aggregate props
  return Validation.of();
});
