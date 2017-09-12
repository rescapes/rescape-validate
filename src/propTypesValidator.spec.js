/**
 * Created by Andy Likuski on 2017.08.16
 * Copyright (c) 2017 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
const R = require('ramda');
const {vProps} = require('./propTypesValidator');
const PropTypes = require('prop-types');

describe('propTypesValidator', () => {
  const myPropTypes = {
    name: PropTypes.string,
    age: PropTypes.number.isRequired
    // ... define your prop validations
  };
  test('validate prop types', () => {
    const props = {
      name: 'hello',
      age: 2
    };
    expect(vProps(myPropTypes, 'Snoopy', props)).toEqual(props);
  });

  test('validate passing only required prop types', () => {
    const props = {
      age: 2
    };
    expect(vProps(myPropTypes, 'Snoopy', props)).toEqual(props);
  });

  test('validate prop types error', () => {
    const props = {
      name: 'hello', // is valid
      age: 'world' // not valid
    };
    expect(() => vProps(myPropTypes, 'Snoopy', props)).toThrow(
      new Error([
        'Failed age for component Snoopy type: Invalid location `age` of type `string` supplied to `Snoopy`, expected `number`.'
      ])
    );
  });

  test('validate missing required prop types', () => {
    const props = {
      name: 'hello'
    };
    expect(() => vProps(myPropTypes, 'Snoopy', props)).toThrow(
      new Error([
        'Failed age for component Snoopy type: The location `age` is marked as required in `Snoopy`, but its value is `undefined`.'
      ])
    );
  });
});
