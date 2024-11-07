"use strict";
/* eslint-disable import/extensions */
/**
 * Copyright 2016-2024 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// internal helpers
const rpi_detect_js_1 = __importDefault(require("./rpi-detect.js"));
const rpi_neopixel_js_1 = __importDefault(require("./rpi-neopixel.js"));
// node modules
const temp_1 = __importDefault(require("temp"));
const bluebird_1 = __importDefault(require("bluebird"));
const fs_1 = __importDefault(require("fs"));
const colornames_1 = __importDefault(require("colornames"));
const color_model_1 = __importDefault(require("color-model"));
const winston_1 = __importStar(require("winston"));
const events_1 = require("events");
const toml_1 = __importDefault(require("@iarna/toml"));
const js_easing_functions_1 = require("js-easing-functions");
const node_path_1 = __importDefault(require("node:path"));
const import_meta_resolve_1 = require("import-meta-resolve");
// hardware modules
const mic_1 = __importDefault(require("mic"));
const libcamera_1 = require("libcamera");
const pigpio_1 = require("pigpio");
const sound_player_1 = __importDefault(require("sound-player"));
// watson modules
const v1_js_1 = __importDefault(require("ibm-watson/speech-to-text/v1.js"));
const v1_js_2 = __importDefault(require("ibm-watson/text-to-speech/v1.js"));
/**
* Class representing a TJBot
*/
class TJBot {
    /**
     * TJBot constructor. After constructing a TJBot instance, call initialize() to configure its hardware.
     * @param  {object=} configuration   (optional) Configuration for the TJBot.
     * @param  {string=} credentialsFile (optional) Path to the 'ibm-credentials.env' file containing authentication credentials for IBM AI services.
     * @return {TJBot} Instance of the TJBot class
     */
    constructor(configFile = 'tjbot.toml', credentialsFile = 'ibm-credentials.env') {
        this.config = TJBot._loadTJBotConfig(configFile);
        // set up logging
        winston_1.default.configure({
            level: this.config.Log.level || 'info',
            format: winston_1.default.format.simple(),
            transports: [
                new winston_1.default.transports.Console(),
            ],
        });
        // automatically track and clean up temporary files
        temp_1.default.track();
        // keep track of IBM Cloud service credentials
        if (credentialsFile !== '') {
            process.env.IBM_CREDENTIALS_FILE = credentialsFile;
        }
        // figure out which RPi we're running on
        this.rpiModel = rpi_detect_js_1.default.model();
        winston_1.default.info(`👋 Hello from TJBot! Running on ${this.rpiModel}`);
        winston_1.default.verbose(`🤖 TJBot library version ${TJBot.VERSION}`);
        winston_1.default.debug(`🤖 TJBot configuration: ${JSON.stringify(this.config)}`);
    }
    /**
     * Helper method to load user-specific configuration from the user-facing TJBot configuration file.
     * @param  {string=} configFile   Path to the TOML file to load, usually 'tjbot.toml'.
     * @return {TOML.JsonMap} The TOML configuration.
     */
    static loadUserConfig(configFile = 'tjbot.toml') {
        var config = {};
        try {
            const configData = fs_1.default.readFileSync(configFile, 'utf8');
            config = toml_1.default.parse(configData);
        }
        catch (err) {
            throw new Error(`unable to read TOML from ${configFile}: ${err}`);
        }
        return config;
    }
    /**
     * Helper method to load recipe-specific configuration from the user-facing TJBot configuration file.
     * @param  {string=} configFile   Path to the TOML file to load, usually 'tjbot.toml'.
     * @return {TOML.JsonMap} The TOML configuration specified in the [Recipe] section.
     */
    static loadRecipeConfig(configFile = 'tjbot.toml') {
        return TJBot.loadUserConfig().Recipe;
    }
    /**
     * Internal helper method to load TJBot's default TOML configuration from a specified file. Do not use this method within TJBot recipes. Instead, use `TJBot.loadUserConfig()`.
     * @param  {string=} configFile   Path to the TOML file to load.
     * @return {TOML.JsonMap} The TOML configuration.
     */
    static _loadInternalConfigFromTOML(configFile) {
        const configPath = (0, import_meta_resolve_1.resolve)(configFile, import.meta.url);
        var config = {};
        try {
            const configData = fs_1.default.readFileSync(new URL(configPath), 'utf8');
            config = toml_1.default.parse(configData);
        }
        catch (err) {
            throw new Error(`unable to read TOML from ${configFile}: ${err}`);
        }
        return config;
    }
    /**
    * Load TJBot's configuration from TOML files.
    * @private
    */
    static _loadTJBotConfig(configFile) {
        // load base config
        let baseConfig = TJBot._loadInternalConfigFromTOML('./tjbot.default.toml');
        let userConfig = '';
        try {
            if (fs_1.default.existsSync(configFile) && fs_1.default.lstatSync(configFile).isFile()) {
                userConfig = TJBot.loadUserConfig(configFile);
            }
        }
        catch (err) {
            throw new Error(`unable to read tjbot configuration from ${configFile}: ${err}`);
        }
        const config = Object.assign(Object.assign({}, baseConfig), userConfig);
        return config;
    }
    /**
     * @param  {array} hardware List of hardware peripherals attached to TJBot.
     * @see {@link #TJBot+Hardware} for a list of supported hardware.
     * @async
     */
    initialize(hardware) {
        return __awaiter(this, void 0, void 0, function* () {
            // set up the hardware
            if (hardware === undefined) {
                throw new Error('must define a hardware configuration for TJBot');
            }
            if (!Array.isArray(hardware)) {
                throw new Error('hardware must be an array');
            }
            winston_1.default.info(`🤖 Initializing TJBot with ${hardware}`);
            hardware.forEach((device) => {
                switch (device) {
                    case TJBot.Hardware.CAMERA:
                        this._setupCamera();
                        break;
                    case TJBot.Hardware.LED_NEOPIXEL:
                        this._setupLEDNeopixel();
                        break;
                    case TJBot.Hardware.LED_COMMON_ANODE:
                        this._setupLEDCommonAnode(this.config.Shine.CommonAnode.redPin, this.config.Shine.CommonAnode.greenPin, this.config.Shine.CommonAnode.bluePin);
                        break;
                    case TJBot.Hardware.MICROPHONE:
                        this._setupMicrophone();
                        break;
                    case TJBot.Hardware.SERVO:
                        this._setupServo(this.config.Wave.servoPin);
                        break;
                    case TJBot.Hardware.SPEAKER:
                        this._setupSpeaker();
                        break;
                    default:
                        break;
                }
            }, this);
        });
    }
    /**
    * Change the level of TJBot's logging.
    * @param {string} level Logging level (see Winston's [list of logging levels](https://github.com/winstonjs/winston?tab=readme-ov-file#using-logging-levels))
    */
    setLogLevel(level) {
        winston_1.default.level = level;
    }
    /** ------------------------------------------------------------------------ */
    /** INTERNAL HARDWARE & WATSON SERVICE INITIALIZATION                        */
    /** ------------------------------------------------------------------------ */
    /**
    * Configure the camera hardware.
    * @private
    */
    _setupCamera() {
        winston_1.default.verbose(`📷 initializing ${TJBot.Hardware.CAMERA}`);
        this._camera = libcamera_1.libcamera;
    }
    /**
    * Configure the Neopixel LED hardware.
    * @private
    */
    _setupLEDNeopixel() {
        var config = {};
        if (rpi_detect_js_1.default.isPi5()) {
            // if we're on an RPi 5, we need to use the SPI interface
            config['spiInterface'] = this.config.Shine.NeoPixel.spiInterface;
            winston_1.default.verbose(`💡 initializing ${TJBot.Hardware.LED_NEOPIXEL} on SPI ${config['spiInterface']}`);
        }
        else {
            // otherwise we use which ever GPIO pin was specified in the config
            config['gpioPin'] = this.config.Shine.NeoPixel.gpioPin;
            winston_1.default.verbose(`💡 initializing ${TJBot.Hardware.LED_NEOPIXEL} on SPI ${config['gpioPin']}`);
        }
        this._neopixelLed = rpi_neopixel_js_1.default.led(config);
    }
    /**
    * Configure the common anode RGB LED hardware.
    * @param {int} redPin The pin number to which the led red pin is connected.
    * @param {int} greenPin The pin number to which the led green pin is connected.
    * @param {int} bluePin The pin number to which the led blue pin is connected.
    * @private
    */
    _setupLEDCommonAnode(redPin, greenPin, bluePin) {
        winston_1.default.verbose(`💡 initializing ${TJBot.Hardware.LED_COMMON_ANODE} on RED PIN ${redPin}, GREEN PIN ${greenPin}, and BLUE PIN ${bluePin}`);
        this._commonAnodeLed = {
            redPin: new pigpio_1.Gpio(redPin, {
                mode: pigpio_1.Gpio.OUTPUT,
            }),
            greenPin: new pigpio_1.Gpio(greenPin, {
                mode: pigpio_1.Gpio.OUTPUT,
            }),
            bluePin: new pigpio_1.Gpio(bluePin, {
                mode: pigpio_1.Gpio.OUTPUT,
            }),
        };
    }
    /**
     * Configure the microphone for speech recognition.
     * @private
     */
    _setupMicrophone() {
        winston_1.default.verbose(`🎤 initializing ${TJBot.Hardware.MICROPHONE}`);
        const params = {
            rate: this.config.Listen.microphoneRate || 44100,
            channels: this.config.Listen.microphoneChannels || 2,
            debug: false,
            exitOnSilence: 6,
        };
        if (this.config.Listen.device) {
            winston_1.default.verbose('🎤 listening through user-defined audio device: ' + this.config.Listen.device);
            params.device = this.config.Listen.device;
        }
        else {
            winston_1.default.verbose('🎤 listening through default audio device');
        }
        // create the microphone
        this._mic = (0, mic_1.default)(params);
        // save the input stream so we can pipe it to STT
        this._micInputStream = this._mic.getAudioStream();
        // event handlers
        this._micInputStream.on('startComplete', () => {
            winston_1.default.verbose('🎤 microphone started');
        });
        this._micInputStream.on('pauseComplete', () => {
            winston_1.default.verbose('🎤 microphone paused');
        });
        this._micInputStream.on('data', (data) => {
            // turn this on for serious debugging, otherwise it's very noisy :)
            // winston.verbose('🎤 microphone received data: ' + data.length + ' bytes');
        });
        // log errors in the mic input stream
        this._micInputStream.on('error', (err) => {
            winston_1.default.error('🎤 microphone input stream experienced an error', err);
        });
        this._micInputStream.on('processExitComplete', () => {
            winston_1.default.verbose('🎤 microphone recording process exited');
        });
        // ignore silence
        this._micInputStream.on('silence', () => {
            winston_1.default.verbose('🎤 microphone silence');
        });
    }
    /**
     * Configure the servo module for the given pin number.
     * @param  {int} pin The pin number to which the servo is connected.
     * @private
     */
    _setupServo(pin) {
        winston_1.default.verbose(`🦾 initializing ${TJBot.Hardware.SERVO} on PIN ${pin}`);
        this._motor = new pigpio_1.Gpio(pin, {
            mode: pigpio_1.Gpio.OUTPUT,
        });
    }
    /**
     * Configure the speaker.
     * @private
     */
    _setupSpeaker() {
        winston_1.default.verbose(`🔈 initializing ${TJBot.Hardware.SPEAKER}`);
        this._soundplayer = sound_player_1.default;
    }
    /**
     * Instantiate the specified Watson service.
     * @param {string} service The name of the service. Valid names are defined in TJBot.services.
     * @param {string} version The version of the service (e.g. "2018-09-20"). If null, the default version will be used.
     * @private
     */
    _createServiceAPI(service) {
        winston_1.default.verbose(`🧠 initializing ${service} service`);
        switch (service) {
            case TJBot.Service.SPEECH_TO_TEXT: {
                // https://cloud.ibm.com/apidocs/speech-to-text
                this._stt = new v1_js_1.default({});
                break;
            }
            case TJBot.Service.TEXT_TO_SPEECH: {
                // https://cloud.ibm.com/apidocs/text-to-speech
                this._tts = new v1_js_2.default({});
                break;
            }
            default:
                break;
        }
    }
    /**
     * Assert that TJBot is able to perform a specified capability. Instantiates Watson
     * services as needed.
     * @param {string} capability The capability assert (see TJBot.prototype.capabilities).
     * @private
     */
    _assertCapability(capability) {
        switch (capability) {
            case TJBot.Capability.LISTEN:
                if (!this._mic) {
                    throw new Error('TJBot is not configured to listen. '
                        + 'Please check that you included the '
                        + `${TJBot.Hardware.MICROPHONE} hardware in the TJBot initialize() method.`);
                }
                if (!this._stt) {
                    this._createServiceAPI(TJBot.Service.SPEECH_TO_TEXT);
                }
                break;
            case TJBot.Capability.LOOK:
                if (!this._camera) {
                    throw new Error('TJBot is not configured to look. '
                        + 'Please check that you included the '
                        + `${TJBot.Hardware.CAMERA} hardware in the TJBot initialize() method.`);
                }
                break;
            case TJBot.Capability.SHINE:
                // one LED should be defined
                if (!this._neopixelLed && !this._commonAnodeLed) {
                    throw new Error('TJBot is not configured with an LED. '
                        + 'Please check that you included the '
                        + `${TJBot.Hardware.LED_NEOPIXEL} or ${TJBot.Hardware.LED_COMMON_ANODE} `
                        + 'hardware in the TJBot initialize() method.');
                }
                break;
            case TJBot.Capability.SPEAK:
                if (!this._soundplayer) {
                    throw new Error('TJBot is not configured to speak. '
                        + 'Please check that you included the '
                        + `${TJBot.Hardware.SPEAKER} hardware in the TJBot initialize() method.`);
                }
                if (!this._tts) {
                    this._createServiceAPI(TJBot.Service.TEXT_TO_SPEECH);
                }
                break;
            case TJBot.Capability.WAVE:
                if (!this._motor) {
                    throw new Error('TJBot is not configured with an arm. '
                        + 'Please check that you included the '
                        + `${TJBot.Hardware.SERVO} hardware in the TJBot initialize() method.`);
                }
                break;
            default:
                break;
        }
    }
    /** ------------------------------------------------------------------------ */
    /** UTILITY METHODS                                                          */
    /** ------------------------------------------------------------------------ */
    /**
     * Put TJBot to sleep.
     * @param {int} sec Number of seconds to sleep for.
     */
    static sleep(sec) {
        const msec = sec * 1000;
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, msec);
    }
    /** ------------------------------------------------------------------------ */
    /** LISTEN                                                                   */
    /** ------------------------------------------------------------------------ */
    /**
     * Listen for a spoken utterance.
     * @async
     */
    listen() {
        return __awaiter(this, void 0, void 0, function* () {
            // make sure we can listen
            this._assertCapability(TJBot.Capability.LISTEN);
            // lazy create the sttTextStream
            if (this._sttTextStream === undefined) {
                // initialize the microphone because if stopListening() was called, we don't seem to
                // be able to re-use the microphone twice
                this._setupMicrophone();
                // create the microphone -> STT recognizer stream
                // see this page for additional documentation on the STT configuration parameters:
                // https://cloud.ibm.com/apidocs/speech-to-text?code=node#recognize-audio-websockets-
                const rate = this.config.Listen.microphoneRate || 44100;
                const channels = this.config.Listen.microphoneChannels || 2;
                const inactivityTimeout = this.config.Listen.inactivityTimeout || 60;
                const backgroundAudioSuppression = this.config.Listen.backgroundAudioSuppression || 0.0;
                const params = {
                    objectMode: false,
                    contentType: `audio/l16; rate=${rate}; channels=${channels}`,
                    model: this.config.Listen.model || 'en-US_Multimedia',
                    inactivityTimeout: inactivityTimeout,
                    interimResults: true,
                    backgroundAudioSuppression: backgroundAudioSuppression,
                };
                winston_1.default.debug(`🎤 recognizeUsingWebSocket() params: ${JSON.stringify(params)}`);
                // Create the stream.
                this._recognizeStream = this._stt.recognizeUsingWebSocket(params);
                this._recognizeStream.setEncoding('utf8');
                // create the mic -> STT recognizer -> text stream
                this._sttTextStream = this._micInputStream.pipe(this._recognizeStream);
                this._sttTextStream.setEncoding('utf8');
                // start the microphone
                this._mic.start();
                // handle errors
                this._sttTextStream.on('error', (err) => {
                    winston_1.default.error('an error occurred in the STT text stream: ', err);
                });
            }
            const fd = this._sttTextStream;
            const end = new bluebird_1.default((resolve) => {
                fd.once('data', resolve);
            });
            const transcript = yield end;
            winston_1.default.info(`🎤 TJBot heard: "${transcript.trim()}"`);
            return transcript.trim();
        });
    }
    /**
     * Internal method for pausing listening, used when
     * we want to play a sound but we don't want to assert
     * the 'listen' capability.
     * @private
     */
    _pauseListening() {
        if (this._mic !== undefined) {
            winston_1.default.verbose('🎤 listening paused');
            this._mic.pause();
        }
    }
    /**
     * Internal method for resuming listening, used when
     * we want to play a sound but we don't want to assert
     * the 'listen' capability.
     * @private
     */
    _resumeListening() {
        if (this._mic !== undefined) {
            winston_1.default.verbose('🎤 listening resumed');
            this._mic.resume();
        }
    }
    /** ------------------------------------------------------------------------ */
    /** LOOK                                                                      */
    /** ------------------------------------------------------------------------ */
    /**
     * Capture an image and save it in the given path.
     * @param  {string=} filePath (optional) Path at which to save the photo file. If not
     * specified, photo will be saved in a temp location.
     * @return {string} Path at which the photo was saved.
     * @async
     */
    look() {
        return __awaiter(this, arguments, void 0, function* (filePath = '') {
            this._assertCapability(TJBot.Capability.LOOK);
            if (filePath === '') {
                filePath = temp_1.default.path({
                    prefix: 'tjbot',
                    suffix: '.jpg',
                });
            }
            winston_1.default.verbose(`📷 capturing image at path: ${filePath}`);
            // set the configuration options, which may have changed since the camera was initialized
            const cameraConfig = {
                output: filePath,
                nopreview: true,
                hflip: this.config.See.horizontalFlip,
                vflip: this.config.See.vertifalFlip,
                width: this.config.See.cameraResolution[0],
                height: this.config.See.cameraResolution[1],
            };
            winston_1.default.debug(`📷 camera options: ${JSON.stringify(cameraConfig)}`);
            try {
                yield this._camera.jpeg({ config: cameraConfig });
                return filePath;
            }
            catch (err) {
                winston_1.default.error('error taking picture', err);
                throw err;
            }
        });
    }
    /** ------------------------------------------------------------------------ */
    /** SHINE                                                                    */
    /** ------------------------------------------------------------------------ */
    /**
     * Change the color of the LED.
     * @param {string} color The color to shine the LED. May be specified in a number of
     * formats, including: hexadecimal, (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off",
     * "random", or may be a named color in the `colornames` package. Hexadecimal colors
     * follow an #RRGGBB format.
     * @see {@link https://github.com/timoxley/colornames|Colornames} for a list of color names.
     */
    shine(color, asPulse = false) {
        this._assertCapability(TJBot.Capability.SHINE);
        // normalize the color
        let c = this._normalizeColor(color);
        // remove leading '#' if present
        if (c.startsWith('#')) {
            c = c.substring(1);
        }
        // shine! will shine on both LEDs if they are both set up
        if (this._commonAnodeLed) {
            this._renderCommonAnodeLed(c);
        }
        if (this._neopixelLed) {
            this._renderNeopixelLed(c);
        }
    }
    /**
     * Pulse the LED a single time.
     * @param {string} color The color to shine the LED. May be specified in a number of
     * formats, including: hexadecimal, (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off",
     * "random", or may be a named color in the `colornames` package. Hexadecimal colors
     * follow an #RRGGBB format.
     * @param {float=} duration The duration the pulse should last. The duration should be in
     * the range [0.5, 2.0] seconds.
     * @see {@link https://github.com/timoxley/colornames|Colornames} for a list of color names.
     * @async
     */
    pulse(color_1) {
        return __awaiter(this, arguments, void 0, function* (color, duration = 1.0) {
            this._assertCapability(TJBot.Capability.SHINE);
            if (duration < 0.5) {
                throw new Error('TJBot does not recommend pulsing for less than 0.5 seconds.');
            }
            if (duration > 2.0) {
                throw new Error('TJBot does not recommend pulsing for more than 2 seconds.');
            }
            // number of easing steps
            const numSteps = 20;
            // quadratic in-out easing
            let ease = [];
            for (let i = 0; i < numSteps; i += 1) {
                ease.push(i);
            }
            ease = ease.map((x, i) => (0, js_easing_functions_1.easeInOutQuad)(i, 0, 1, ease.length));
            // normalize to 'duration' sec
            ease = ease.map((x) => x * duration);
            // convert to deltas
            const easeDelays = [];
            for (let i = 0; i < ease.length - 1; i += 1) {
                easeDelays[i] = ease[i + 1] - ease[i];
            }
            // color ramp
            const rgb = this._normalizeColor(color).slice(1); // remove the #
            const hex = new color_model_1.default.HexRgb(rgb);
            const colorRamp = [];
            for (let i = 0; i < numSteps / 2; i += 1) {
                const l = 0.0 + (i / (numSteps / 2)) * 0.5;
                colorRamp[i] = hex.toHsl().lightness(l).toRgb().toHexString()
                    .replace('#', '0x');
            }
            // perform the ease
            winston_1.default.info(`💡 pulsing my LED to RGB color ${rgb}`);
            for (let i = 0; i < easeDelays.length; i += 1) {
                const c = i < colorRamp.length
                    ? colorRamp[i]
                    : colorRamp[colorRamp.length - 1 - (i - colorRamp.length) - 1];
                this.shine(c, true);
                // eslint-disable-next-line no-await-in-loop
                TJBot.sleep(easeDelays[i]);
            }
        });
    }
    /**
     * Get the list of all colors recognized by TJBot.
     * @return {array} List of all named colors recognized by `shine()` and `pulse()`.
     */
    shineColors() {
        if (this._shineColors === undefined) {
            this._shineColors = colornames_1.default.all().map((elt) => elt.name);
        }
        return this._shineColors;
    }
    /**
     * Get a random color.
     * @return {string} Random named color.
     */
    randomColor() {
        const colors = this.shineColors();
        const randIdx = Math.floor(Math.random() * colors.length);
        const randColor = colors[randIdx];
        return randColor;
    }
    /**
     * Normalize the given color to #RRGGBB.
     * @param {string} color The color to shine the LED. May be specified in a number of
     * formats, including: hexadecimal, (e.g. "0xF12AC4", "11FF22", "#AABB24"), "on", "off",
     * "random", or may be a named color in the `colornames` package. Hexadecimal colors
     * follow an #RRGGBB format.
     * @return {string} Hex string corresponding to the given color (e.g. "#RRGGBB")
     * @private
     */
    _normalizeColor(color) {
        let normColor = color;
        // assume undefined == "off"
        if (normColor === undefined) {
            normColor = 'off';
        }
        // is this "on" or "off"?
        if (normColor === 'on') {
            normColor = 'FFFFFF';
        }
        else if (normColor === 'off') {
            normColor = '000000';
        }
        else if (normColor === 'random') {
            normColor = this.randomColor();
        }
        // strip prefixes if they are present
        if (normColor.startsWith('0x')) {
            normColor = normColor.slice(2);
        }
        if (normColor.startsWith('#')) {
            normColor = normColor.slice(1);
        }
        // is this a hex number or a named color?
        const isHex = /(^[0-9A-F]{6}$)|(^[0-9A-F]{3}$)/i;
        let rgb;
        if (!isHex.test(normColor)) {
            rgb = (0, colornames_1.default)(normColor);
        }
        else {
            rgb = normColor;
        }
        // did we get something back?
        if (rgb === undefined) {
            throw new Error(`TJBot did not understand the specified color "${color}"`);
        }
        // prefix rgb with # in case it's not
        if (!rgb.startsWith('#')) {
            rgb = `#${rgb}`;
        }
        // throw an error if we didn't understand this color
        if (rgb.length !== 7) {
            throw new Error(`TJBot did not understand the specified color "${color}"`);
        }
        return rgb;
    }
    /**
    * Convert hex color code to RGB value.
    * @param {string} hexColor Hex color code
    * @return {array} RGB color (e.g. (255, 128, 128))
    * @private
    */
    // eslint-disable-next-line class-methods-use-this
    _convertHexToRgbColor(hexColor) {
        return hexColor.replace(/^#?([a-f\d])([a-f\d])([a-f\d])$/i, (m, r, g, b) => `#${r}${r}${g}${g}${b}${b}`)
            .substring(1).match(/.{2}/g)
            .map((x) => parseInt(x, 16));
    }
    /**
    * Render the given rgb color for the common anode led.
    * @param {string} hexColor Color in hex format (e.g. "AA00FF", no leading "0x")
    * @private
    */
    _renderCommonAnodeLed(hexColor) {
        const rgb = this._convertHexToRgbColor(hexColor);
        this._commonAnodeLed.redPin.pwmWrite(rgb[0] == null ? 255 : 255 - rgb[0]);
        this._commonAnodeLed.greenPin.pwmWrite(rgb[1] == null ? 255 : 255 - rgb[1]);
        this._commonAnodeLed.bluePin.pwmWrite(rgb[2] == null ? 255 : 255 - rgb[2]);
    }
    /**
    * Render the given rgb color for the NeoPixel led.
    * @param {string} hexColor Color in hex format (e.g. "AA00FF", no leading "0x")
    * @private
    */
    _renderNeopixelLed(hexColor) {
        this._neopixelLed.render(hexColor);
    }
    /** ------------------------------------------------------------------------ */
    /** SPEAK                                                                    */
    /** ------------------------------------------------------------------------ */
    /**
     * Speak a message.
     * @param {string} message The message to speak.
     * @async
     */
    speak(message) {
        return __awaiter(this, void 0, void 0, function* () {
            this._assertCapability(TJBot.Capability.SPEAK);
            // make sure we're trying to say something
            if (message === undefined || message === '') {
                winston_1.default.error('TJBot tried to speak an empty message.');
                return; // exit if there's nothing to say!
            }
            winston_1.default.verbose(`🔈 TJBot speaking with voice ${this.config.Speak.voice}`);
            const params = {
                text: message,
                voice: this.config.Speak.voice,
                accept: 'audio/wav',
            };
            const info = temp_1.default.openSync('tjbot');
            const response = yield this._tts.synthesize(params);
            // pipe the audio buffer to a file
            winston_1.default.debug('🔈 writing audio buffer to temp file', info.path);
            const fd = fs_1.default.createWriteStream(info.path);
            response.result.pipe(fd);
            // wait for the pipe to finish writing
            const end = new bluebird_1.default((resolve, reject) => {
                fd.on('close', resolve);
                fd.on('error', reject);
            });
            yield end;
            // now play it
            winston_1.default.info(`🔈 TJBot speaking: ${message}`);
            yield this.play(info.path);
        });
    }
    /**
     * Play a sound at the specified path.
     * @param {string} soundFile The path to the sound file to be played.
     * @async
     */
    play(soundFile) {
        return __awaiter(this, void 0, void 0, function* () {
            // pause listening while we play a sound -- using the internal
            // method to avoid a capability check (and potential fail if the TJBot
            // isn't configured to listen)
            this._pauseListening();
            // if we don't have a speaker, throw an error
            if (this._soundplayer === undefined) {
                throw new Error('unable to play audio, TJBot hardware doesn\'t include a "speaker"');
            }
            // initialize soundplayer lib
            const params = {
                filename: soundFile,
                gain: 100,
                debug: true,
                player: 'aplay'
            };
            if (this.config.Speak.device) {
                winston_1.default.verbose('🔈 playing through user-defined audio device: ' + this.config.Speak.device);
                params.device = this.config.Speak.device;
            }
            else {
                winston_1.default.verbose('🔈 playing through default audio device');
            }
            const player = new this._soundplayer(params);
            winston_1.default.debug('🔈 playing audio with parameters: ', params);
            // capture 'this' context so we can reference it in the callback
            const self = this;
            player.on('complete', () => {
                winston_1.default.debug('🔈 audio playback finished');
                // resume listening
                self._resumeListening();
            });
            player.on('error', (err) => {
                winston_1.default.error('error occurred while playing audio', err);
            });
            // play the audio
            player.play(soundFile);
            // wait for the audio to finish playing, either by completing playback or by throwing an error
            yield bluebird_1.default.race([(0, events_1.once)(player, 'complete'), (0, events_1.once)(player, 'error')]);
        });
    }
    /** ------------------------------------------------------------------------ */
    /** WAVE                                                                     */
    /** ------------------------------------------------------------------------ */
    /**
     * Moves TJBot's arm all the way back. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_BACK may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.armBack()
     */
    armBack() {
        // make sure we have an arm
        this._assertCapability(TJBot.Capability.WAVE);
        winston_1.default.info("🦾 Moving TJBot's arm back");
        this._motor.servoWrite(TJBot.Servo.ARM_BACK);
    }
    /**
     * Raises TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_UP may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.raiseArm()
     */
    raiseArm() {
        // make sure we have an arm
        this._assertCapability(TJBot.Capability.WAVE);
        winston_1.default.info("🦾 Raising TJBot's arm");
        this._motor.servoWrite(TJBot.Servo.ARM_UP);
    }
    /**
     * Lowers TJBot's arm. If this method doesn't move the arm all the way back, the servo motor stop point defined in TJBot.Servo.ARM_DOWN may need to be overridden. Valid servo values are in the range [500, 2300].
     * @example tj.lowerArm()
     */
    lowerArm() {
        // make sure we have an arm
        this._assertCapability(TJBot.Capability.WAVE);
        winston_1.default.info("🦾 Lowering TJBot's arm");
        this._motor.servoWrite(TJBot.Servo.ARM_DOWN);
    }
    /**
     * Waves TJBots's arm once.
     */
    wave() {
        return __awaiter(this, void 0, void 0, function* () {
            this._assertCapability(TJBot.Capability.WAVE);
            winston_1.default.info("🦾 Waving TJBot's arm");
            const delay = 200;
            this._motor.servoWrite(TJBot.Servo.ARM_UP);
            TJBot.sleep(delay);
            this._motor.servoWrite(TJBot.Servo.ARM_DOWN);
            TJBot.sleep(delay);
            this._motor.servoWrite(TJBot.Servo.ARM_UP);
            TJBot.sleep(delay);
        });
    }
}
/**
 * TJBot library version
 * @readonly
*/
TJBot.VERSION = 'v3.0.0';
/**
 * TJBot capabilities
 * @readonly
 * @enum {string}
 */
TJBot.Capability = {
    LISTEN: 'listen',
    LOOK: 'look',
    SHINE: 'shine',
    SPEAK: 'speak',
    WAVE: 'wave',
};
/**
 * TJBot hardware
 * @readonly
 * @enum {string}
 */
TJBot.Hardware = {
    CAMERA: 'camera',
    LED_NEOPIXEL: 'led_neopixel',
    LED_COMMON_ANODE: 'led_common_anode',
    MICROPHONE: 'microphone',
    SERVO: 'servo',
    SPEAKER: 'speaker',
};
/**
 * IBM AI services
 * @readonly
 * @enum {string}
 */
TJBot.Service = {
    SPEECH_TO_TEXT: 'speech_to_text',
    TEXT_TO_SPEECH: 'text_to_speech',
};
/**
 * TJBot servo motor stop positions
 * @readonly
 * @enum {int}
 */
TJBot.Servo = {
    ARM_BACK: 500,
    ARM_UP: 1400,
    ARM_DOWN: 2300,
};
/** ------------------------------------------------------------------------ */
/** MODULE EXPORTS                                                           */
/** ------------------------------------------------------------------------ */
/**
 * Export TJBot!
 */
exports.default = TJBot;
