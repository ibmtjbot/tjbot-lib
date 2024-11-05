/**
 * Copyright 2024 IBM Corp. All Rights Reserved.
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
import RPiDetect from './rpi-detect.js';
import winston from 'winston';
import ws281x from 'rpi-ws281x-native';
import SPI from 'pi-spi';
class RPINeopixel {
    static led(config) {
        if (RPiDetect.isPi5()) {
            winston.verbose(`RPINeopixel detected we are running on an RPi 5, returning SPI interface`);
            const led = new RPINeopixelLED_SPI(config);
            return led;
        }
        else {
            winston.verbose(`RPINeopixel detected we are not running on an RPi 5, returning ws281x interface`);
            const led = new RPINeopixelLED_ws281x(config);
            return led;
        }
    }
}
// abstract class RPINeopixelLED {
//     abstract render(color: number): void;
// }
// class RPINeopixelLED_ws281x extends RPINeopixelLED {
class RPINeopixelLED_ws281x {
    constructor(config) {
        // super();
        const gpioPin = config.gpioPin;
        if (gpioPin === undefined) {
            throw new Error("gpioPin is undefined in RPILED_ws281x");
        }
        // on RPi models prior to the 5 (e.g. 3B, 4), we can address the LED using the ws281x interface
        this._neopixelLed = ws281x;
        this._neopixelLed.init(1, {
            gpioPin,
        });
        // capture 'this' context so we can reference it in the callback
        const self = this;
        // reset the LED before the program exits
        process.on('SIGINT', () => {
            self._neopixelLed.reset();
            process.nextTick(() => {
                process.exit(0);
            });
        });
    }
    render(color) {
        const colors = new Uint32Array(1);
        colors[0] = color;
        this._neopixelLed.render(colors);
    }
}
// class RPINeopixelLED_SPI extends RPINeopixelLED {
class RPINeopixelLED_SPI {
    // this class is based on pi5neo.py
    // https://github.com/vanshksingh/Pi5Neo/blob/main/pi5neo/pi5neo.py
    constructor(config) {
        // super();
        const spiInterface = config.spiInterface || "/dev/spidev0.0";
        this._spi = SPI.initialize(spiInterface);
    }
    static bitMask(byte, index) {
        return (byte & (1 << index)) != 0;
    }
    static byteToBitstream(byte) {
        // Initialize with low bits
        let bitstream = [0xC0, 0xC0, 0xC0, 0xC0, 0xC0, 0xC0, 0xC0, 0xC0];
        for (let i = 0; i < 8; i++) {
            if (RPINeopixelLED_SPI.bitMask(byte, i)) {
                // Set high bits for '1'
                bitstream[i] = 0xF8;
            }
        }
        return bitstream;
    }
    static rgbToSpiBitstream(red, green, blue) {
        const red_bits = RPINeopixelLED_SPI.byteToBitstream(red);
        const green_bits = RPINeopixelLED_SPI.byteToBitstream(green);
        const blue_bits = RPINeopixelLED_SPI.byteToBitstream(blue);
        const bitstream = Buffer.from(red_bits.concat(green_bits).concat(blue_bits));
        return bitstream;
    }
    /**
     * Render the LED a specified color.
     * @param {string} color The color to shine the LED, specified as a string of hexadecimal digits with no
     * leading '0x' or '#' in RRGGBB format.
     */
    render(color) {
        const c = parseInt(color, 16);
        const r = (c & 0xFF0000) >> 16;
        const g = (c & 0x00FF00) >> 8;
        const b = (c & 0x0000FF) >> 0;
        winston.verbose(`rendering LED color ${color} (RGB: ${r} ${g} ${b})`);
        const bitstream = RPINeopixelLED_SPI.rgbToSpiBitstream(r, g, b);
        this._spi.transfer(bitstream, bitstream.length, function (e, d) {
            if (e) {
                throw e;
            }
        });
    }
}
export default RPINeopixel;
