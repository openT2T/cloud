# OpenT2T API HubController class + server Sample
A sample server that can be can be used to interact with similar devices using a common schema.


> **Important:** This is just a code sample and NOT intended for any sort of real use since it does not implement any real auth or persistent storage.

The API for this sample is documented at: http://docs.opent2t.apiary.io
> **Note:** The Apiary hasn't been updated yet for error cases but soon will be. Meanwhile the section below talks about the general behavior.

## HubController Class
As part of this sample server, we provide a hubController class and distribute it separately outside of this sample server. This class provides for a simple management interface to controlling existing hubs and corresponding devices that the hubs control. The calls ultimately call into the OpentT2T set of libraries (see https://github.com/opent2t/opent2t) to create the actual translators, invoke the corresponding translator functions etc.

### General Error handling notes
All APIs defined here return a custom Error object of type OpenT2TError defined in the opent2t common client library (https://github.com/openT2T/opent2t).

1. Any errors that are bubbled out from the library are wrapped in a custom OpenT2TError (extends built-in Error interface). All APIs are promise-based, and in case of errors, the promise is rejected with given error.

2. Users of this library will be able to handle the error in their code and view the status code, message, original 'inner' error for diagnostics.

3. The error code is typically matched to a corresponding HTTPStatusCode if not already originally one in the inner error. Eg 400's for bad request input or validation failures, 500 for default/unexpected/technical errors etc

4. Errors from providers eg WINK etc are returned as-is and their original error codes and messages retained. The original error is bubbled up in the nested err property of the message.

### Running tests

1. To run the tests, you need first install the node dependencies under the root cloud\node folder.
> `npm install`

2. Next, ensure install the rest of the dependencies in particular, ava (the testing framework), opent2t, and the specific hub translator you are working with, are explicitly installed. Only WINK is supported at this time in the tests. The tests also require actual wink hub setup (username/pwd etc and work against the production wink service)
> `npm install ava`
> `npm install opent2t`
> `npm install opent2t-translator-com-wink-hub`

3. Next,(temporary step only until we fix this) copy the node_modules folder into the tests directory

4. cd to the tests folder

5. create a new hubController-testConfig-auth.json file. This has to be named this exact name. Populate with the onboardinginfo below and replace the contents with your username + id:

{
 "onboardingInfo" : [
        {
            "username": "",
            "password": ""
        },
        {
            "client_id": "",
            "client_secret": ""
        }
    ]
}

6. Next if you know already your device ids + control ids (for wink) populate them in the hubController-testConfig.json file or run the test once, look at the output with your device information and populate with your deviceId, control id in the test config.

7. Run the test : ava hubcontroller.js


## Code of Conduct
This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
