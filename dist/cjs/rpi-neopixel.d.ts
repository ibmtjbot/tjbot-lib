export default RPINeopixel;
declare class RPINeopixel {
    static led(config: any): RPINeopixelLED_SPI | RPINeopixelLED_ws281x;
}
declare class RPINeopixelLED_SPI {
    static bitMask(byte: any, index: any): boolean;
    static byteToBitstream(byte: any): number[];
    static rgbToSpiBitstream(red: any, green: any, blue: any): Buffer;
    constructor(config: any);
    _spi: any;
    /**
     * Render the LED a specified color.
     * @param {string} color The color to shine the LED, specified as a string of hexadecimal digits with no
     * leading '0x' or '#' in RRGGBB format.
     */
    render(color: string): void;
}
declare class RPINeopixelLED_ws281x {
    constructor(config: any);
    _neopixelLed: any;
    render(color: any): void;
}
