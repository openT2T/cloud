# OpenT2T API Server Sample
A sample server that can be can be used to interact with similar devices using a common schema.

> **Important:** This is just a code sample and NOT intended for any sort of real use since it does not implement any real auth or persistent storage.

The API for this sample is documented at: http://docs.opent2t.apiary.io
> **Note:** The Apiary hasn't been updated yet for error cases but soon will be. Meanwhile the section below talks about the general behavior.

## General Error handling notes
All APIs defined here return a custom Error object of type OpenT2TError defined in the opent2t common client library (https://github.com/openT2T/opent2t).

1. Any errors that are bubbled out from the library are wrapped in a custom OpenT2TError (extends built-in Error interface). All APIs are promise-based, and in case of errors, the promise is rejected with given error.

2. Users of this library will be able to handle the error in their code and view the status code, message, original 'inner' error for diagnostics.

3. The error code is typically matched to a corresponding HTTPStatusCode if not already originally one in the inner error. Eg 400's for bad request input or validation failures, 500 for default/unexpected/technical errors etc

4. Errors from providers eg WINK etc are returned as-is and their original error codes and messages retained. The original error is bubbled up in the nested err property of the message.

## Running tests

1. To run the tests, you need first install the test framework 'ava'.
``
## Code of Conduct
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
