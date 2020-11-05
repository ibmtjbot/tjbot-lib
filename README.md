# TJBot Library

> Node.js library that encapsulates TJBot's capabilities: seeing, listening, speaking, shining, and waving.

This library can be used to create your own recipes for [TJBot](http://ibm.biz/mytjbot).

Some of TJBot's capabilities require [IBM Cloud](https://www.ibm.com/cloud) services. For example, seeing is powered by the [IBM Watson Visual Recognition](https://www.ibm.com/cloud/watson-visual-recognition) service. Speaking and listening are powered by the [IBM Watson Text to Speech](https://www.ibm.com/cloud/watson-text-to-speech) and [IBM Watson Speech to Text](https://www.ibm.com/cloud/watson-speech-to-text) services.

To use these services, you will need to sign up for a free [IBM Cloud](https://www.ibm.com/cloud) account, create instances of the services you need, and download the authentication credentials.

## Usage

1. Install the library using `npm`.

```
$ npm install --save tjbot
```

> 💡 Note: The TJBot library was developed for use on Raspberry Pi. It may be possible to develop and test portions of this library on other Linux-based systems (e.g. Ubuntu), but this usage is not officially supported.

2. Instantiate the `TJBot` object.

```
import TJBot from 'tjbot';
const tj = new TJBot();
tj.initialize([TJBot.HARDWARE.LED, TJBot.HARDWARE.SERVO, TJBot.HARDWARE.MICROPHONE, TJBot.HARDWARE.SPEAKER]);
```

This code will configure your TJBot with an `LED`, `servo`, `microphone`, and `speaker`. The default configuration of TJBot uses English as the main language with a male voice. Here is an example of a TJBot that speaks with a female voice in Japanese:

```
const tj = new TJBot({ 
    robot: { 
        gender: TJBot.GENDERS.FEMALE 
    }, 
    speak: { 
        language: TJBot.LANGUAGES.SPEAK.JAPANESE 
    }
});
```

### IBM Watson Credentials

If you are using IBM Watson services, store your authentication credentials in a file named `ibm-credentials.env`. Credentials may be downloaded from the page for your service instance, in the section named "Credentials."

If you are using multiple IBM Watson services, you may combine all of the credentials together in a single file.

The file `ibm-credentials.sample.env` shows a sample of how credentials are stored.

> 💡 Note: You may also specify the path to the credentials file in the TJBot constructor using the `credentialsFile` argument. For example, `const tj = new TJBot(credentialsFile="/home/pi/my-credentials.env")`.

## Hardware Configuration

The entire list of hardware devices supported by TJBot is defined in `TJBot.HARDWARE` and includes `CAMERA`, `LED`, `MICROPHONE`, `SERVO`, and `SPEAKER`. Each of these hardware devices may be configured by passing in configuration options to the `TJBot` constructor as follows.

```
var configuration = {
    log: {
        level: 'info', // valid levels are 'error', 'warn', 'info', 'verbose', 'debug', 'silly'
    },
    robot: {
        gender: TJBot.GENDERS.MALE, // see TJBot.GENDERS
    },
    converse: {
        assistantId: undefined, // placeholder for Watson Assistant's assistantId
    },
    listen: {
        microphoneDeviceId: 'plughw:1,0', // plugged-in USB card 1, device 0; see 'arecord -l' for a list of recording devices
        inactivityTimeout: -1, // -1 to never timeout or break the connection. Set this to a value in seconds e.g 120 to end connection after 120 seconds of silence
        backgroundAudioSuppression: 0.4, // should be in the range [0.0, 1.0] indicating how much audio suppression to perform
        language: TJBot.LANGUAGES.LISTEN.ENGLISH_US, // see TJBot.LANGUAGES.LISTEN
    },
    wave: {
        servoPin: 7, // corresponds to BCM 7 / physical PIN 26
    },
    speak: {
        language: TJBot.LANGUAGES.SPEAK.ENGLISH_US, // see TJBot.LANGUAGES.SPEAK
        voice: undefined, // use a specific voice; if undefined, a voice is chosen based on robot.gender and speak.language
        speakerDeviceId: 'plughw:0,0', // plugged-in USB card 1, device 0; 'see aplay -l' for a list of playback devices
    },
    see: {
        confidenceThreshold: 0.6,
        camera: {
            height: 720,
            width: 960,
            verticalFlip: false, // flips the image vertically, may need to set to 'true' if the camera is installed upside-down
            horizontalFlip: false, // flips the image horizontally, should not need to be overridden
        },
        language: TJBot.LANGUAGES.SEE.ENGLISH_US,
    },
    shine: {
        grbFormat: false, // if false, the RGB color format will be used for the LED; if true, the GRB format will be used
    },
};
const tj = new TJBot(configuration);
```

## Capabilities

TJBot has a number of capabilities that you can use to bring it to life. Capabilities are combinations of hardware and Watson services that enable TJBot's functionality. For example, "listening" is a combination of having a `speaker` and the `speech_to_text` service. Internally, the `_assertCapability()` method checks to make sure your TJBot is configured with the right hardware and services before it performs an action that depends on having a capability. Thus, the method used to make TJBot listen, `tj.listen()`, first checks that your TJBot has been configured with a `speaker` and the `speech_to_text` service.

TJBot's capabilities are:

- **Analyzing Tone** with the [Watson Tone Analyzer](https://www.ibm.com/cloud/watson-tone-analyzer) service
- **Conversing** with the [Watson Assistant](https://www.ibm.com/cloud/watson-assistant/) service
- **Listening** with the [Watson Speech to Text](https://www.ibm.com/cloud/watson-speech-to-text) service
- **Seeing** with the [Watson Visual Recognition](https://www.ibm.com/cloud/watson-visual-recognition) service
- **Shining** its LED
- **Speaking** with the [Watson Text to Speech](https://www.ibm.com/cloud/watson-text-to-speech) service
- **Translating** between languages with the [Watson Language Translator](https://www.ibm.com/cloud/watson-language-translator) service
- **Waving**  its arm

The full list of capabilities can be accessed programatically via `TJBot.CAPABILITIES`, the full list of hardware components can be accessed programatically via `TJBot.HARDWARE`, and the full list of Watson services can be accessed programatically via `TJBot.SERVICES`.

## TJBot API

Please see [the API docs](https://ibmtjbot.github.io/docs/tjbot/2.0.0/) for documentation of the TJBot API.

> 💡 Please see the [Migration Guide](MIGRATING.md) for guidance on migrating your code to the latest version of the TJBot API.

## Tests

TJBotLib uses the [Jest](https://jestjs.io) framework for basic testing of the library. These tests may be run from the `tjbotlib` directory using `npm`:

    npm test

The tests run by this command only covers basic functionality of the library. A separate set of tests (see below) covers hardware-specific behaviors. These tests also do not cover functionality provided by Watson services.

### Hardware Tests

As TJBot has a number of hardware components that may or may not be hooked up correctly, we provide an additional set of hardware tests that may be run individually (i.e. outside of the Jest framework). These tests are contained in the `__tests__` directory and may be run via `npm run-script` from the `tjbotlib` directory:

    npm run-script test-led
    npm run-script test-mic
    npm run-script test-servo
    npm run-script test-speaker

> 💡 The `test-mic` tests requires authentication credientials for the Tone Analyzer service defined in an `ibm-credentials.env` file in the root `tjbotlib` directory.

# Contributing
We encourage you to make enhancements to this library and contribute them back to us via a pull request.

# License
This project uses the [Apache License Version 2.0](LICENSE) software license.
