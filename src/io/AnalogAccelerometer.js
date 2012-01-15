 /**
 * Based on Accelerometer.as originally written in as3.
 * Copyright (c) the Funnel development team
 * http://www.funnel.cc
 *
 * Ported to JavaScript by Jeff Hoefs
 * Copyright (c) 2011-2012 Jeff Hoefs <soundanalogous@gmail.com>
 *
 * Released under the MIT license. See LICENSE file for details.
 */

JSUTILS.namespace('BREAKOUT.io.AnalogAccelerometer');

BREAKOUT.io.AnalogAccelerometer = (function() {
	"use strict";

	var AnalogAccelerometer;

		// dependencies
	var PhysicalInputBase = BREAKOUT.PhysicalInputBase,
		Event = JSUTILS.Event,
		Scaler = BREAKOUT.filters.Scaler,
		Convolution = BREAKOUT.filters.Convolution;

	/**
	 * Creates a new Analog Accelerometer object
	 *
	 * @exports AnalogAccelerometer as BREAKOUT.io.AnalogAccelerometer
	 * @constructor
	 * @augments BREAKOUT.PhysicalInputBase	 
	 * @param {IOBoard} board A reference to the IOBoard instance
	 * @param {Pin} xPin A reference to the Pin connected to the x axis of the accelerometer
	 * @param {Pin} yPin A reference to the Pin connected to the y axis of the accelerometer
	 * @param {Pin} zPin A reference to the Pin connected to the z axis of the accelerometer
	 * @param {Number} dynamicRange The range of the acceleromter in Gs (typically 2 or 3 for an 
	 * analog accelerometer). See the datasheet for the acceleromter to get the exact value.
	 * @param {Boolean} enableSmoothing True to enable smoothing, false to disable. Default is false.
	 */
	AnalogAccelerometer = function(board, xPin, yPin, zPin, dynamicRange, enableSmoothing) {

		// call the super class
		PhysicalInputBase.call(this);

		this.name = "AnalogAccelerometer";

		// enable the analog pins
		board.enableAnalogPin(xPin.analogNumber);
		board.enableAnalogPin(yPin.analogNumber);
		board.enableAnalogPin(zPin.analogNumber);		

		this._enableSmoothing = enableSmoothing || false;
		this._xPin = xPin || null;
		this._yPin = yPin || null;
		this._zPin = zPin || null;

		// common accelerometer interface values:
		this._dynamicRange = dynamicRange || 1;
		this._x = 0;
		this._y = 0;
		this._z = 0;

		if (this._xPin !== null) {
			this._xPin.addEventListener(Event.CHANGE, this.xAxisChanged.bind(this));
		}

		if (this._yPin !== null) {
			this._yPin.addEventListener(Event.CHANGE, this.yAxisChanged.bind(this));
		}
		
		if (this._zPin !== null) {
			this._zPin.addEventListener(Event.CHANGE, this.zAxisChanged.bind(this));
		}
		
	};

	AnalogAccelerometer.prototype = JSUTILS.inherit(PhysicalInputBase.prototype);
	AnalogAccelerometer.prototype.constructor = AnalogAccelerometer;

	// Implement Acceleromter interface:

	/**
	 * [read-only] The current range setting of the accelerometer in units 
	 * of gravity (9.8 m/sec2).
	 * @name AnalogAccelerometer#dynamicRange
	 * @property
	 * @type Number
	 */ 
	AnalogAccelerometer.prototype.__defineGetter__("dynamicRange", function() { return this._dynamicRange; });

	/**
	 * [read-only] The x axis of the accelerometer in units 
	 * of gravity (9.8 m/sec2).
	 * @name AnalogAccelerometer#x
	 * @property
	 * @type Number
	 */ 
	AnalogAccelerometer.prototype.__defineGetter__("x", function() { return this._x; });

	/**
	 * [read-only] The y axis of the accelerometer in units 
	 * of gravity (9.8 m/sec2).
	 * @name AnalogAccelerometer#y
	 * @property
	 * @type Number
	 */ 
	AnalogAccelerometer.prototype.__defineGetter__("y", function() { return this._y; });

	/**
	 * [read-only] The z axis of the accelerometer in units 
	 * of gravity (9.8 m/sec2).
	 * @name AnalogAccelerometer#z
	 * @property
	 * @type Number
	 */ 
	AnalogAccelerometer.prototype.__defineGetter__("z", function() { return this._z; });


	// Methods specific to this Accelerometer type:

	AnalogAccelerometer.prototype.__defineGetter__("xPin", function() { 
		return this._xPin;
	});

	AnalogAccelerometer.prototype.__defineGetter__("yPin", function() { 
		return this._yPin;
	});	
	
	AnalogAccelerometer.prototype.__defineGetter__("zPin", function() { 
		return this._zPin;
	});			

	/**
	 * [read-only] The rotation on the x axis 
	 * of gravity (9.8 m/sec2).
	 * @name AnalogAccelerometer#rotationX
	 * @property
	 * @type Number
	 */ 
	AnalogAccelerometer.prototype.__defineGetter__("rotationX", function() { 
		var sinX = Math.min(Math.max(this._x, -1), 1);
		return Math.asin(sinX) / Math.PI * 180;
	});	

	/**
	 * [read-only] The rotation on the y axis 
	 * of gravity (9.8 m/sec2).
	 * @name AnalogAccelerometer#rotationY
	 * @property
	 * @type Number
	 */ 
	AnalogAccelerometer.prototype.__defineGetter__("rotationY", function() { 
		var sinY = Math.min(Math.max(this._y, -1), 1);
		return Math.asin(sinY) / Math.PI * 180;
	});	

	/**
	 * [read-only] The rotation on the z axis 
	 * of gravity (9.8 m/sec2).
	 * @name AnalogAccelerometer#rotationZ
	 * @property
	 * @type Number
	 */ 
	AnalogAccelerometer.prototype.__defineGetter__("rotationZ", function() { 
		var sinZ = Math.min(Math.max(this._z, -1), 1);
		return Math.asin(sinZ) / Math.PI * 180;
	});		

	/**
	 * Scale the range for the specified axis (from 0 to 1) to (minimum to maximum).
	 * 
	 * @param axis the axis to set new range (AnalogAccelerometer.X_AXIS, 
	 * AnalogAccelerometer.Y_AXIS or AnalogAccelerometer.Z_AXIS).
	 * @param {Number} minimum The new minimum value
	 * @param {Number} maximum The new maximum value
	 */
	AnalogAccelerometer.prototype.setRangeFor = function(axis, minimum, maximum) {
		var range = this._dynamicRange;

		if (axis === AnalogAccelerometer.X_AXIS) {
			if (this._xPin !== null) {
				this._xPin.filters = [new Scaler(minimum, maximum, -range, range, Scaler.LINEAR)];
				if (this._enableSmoothing) {
					this._xPin.addFilter(new Convolution(Convolution.MOVING_AVERAGE));
				}
			}
		} else if (axis === AnalogAccelerometer.Y_AXIS) {
			if (this._yPin !== null) {
				this._yPin.filters = [new Scaler(minimum, maximum, -range, range, Scaler.LINEAR)];
				if (this._enableSmoothing) {
					this._yPin.addFilter(new Convolution(Convolution.MOVING_AVERAGE));
				}
			}
		} else if (axis === AnalogAccelerometer.Z_AXIS) {
			if (this._zPin !== null) {
				this._zPin.filters = [new Scaler(minimum, maximum, -range, range, Scaler.LINEAR)];
				if (this._enableSmoothing) {
					this._zPin.addFilter(new Convolution(Convolution.MOVING_AVERAGE));
				}
			}
		}
	};

	// calibration:
	// for each axis, calculate variance from -1 and 1
	// assume zero g = supply voltage/2 and sensitivity is supply voltage / 10 per g
	// at -1 g, voltage should be (supply voltage/2) - (supply voltage / 10)
	// at 1 g, voltage should be (supply voltage/2) + (supply voltage / 10)

	/**
	 * Use this method to get the minimum and maximum range values for an axis. Create a new object
	 * to store the return value and then pass obj.min and obj.max along with the respective axis
	 * identifier to the setRangeFor method.
	 * 
	 * @param {Number} minVoltage The minimum value reported on the axis
	 * @param {Number} maxVoltage The maximum value reported on the axis
	 * @param {Number} supplyVoltage The supply voltage of the Acceleromter (enter as 3.3, 3.0, 5.0, etc).
	 * @return {Object} An object containing the min and max range values to be passed to the 
	 * setRangeFor method.
	 */
	AnalogAccelerometer.prototype.getCalibratedRange = function(minVoltage, maxVoltage, supplyVoltage) {
		var range = {min:0, max:0};
		
		var mVPerG = (maxVoltage - minVoltage) / 2;
		
		// find zero G (average of min and max)
		var zeroG = (minVoltage + maxVoltage) / 2;
		
		range.min = (zeroG - (mVPerG * this._dynamicRange))/supplyVoltage;
		range.max = (zeroG + (mVPerG * this._dynamicRange))/supplyVoltage;
		
		return range;
	};		

	/**
	 * @private
	 */
	AnalogAccelerometer.prototype.xAxisChanged = function(event) {
		this._x = event.target.value;
		this.dispatchEvent(new Event(Event.CHANGE));
	};

	/**
	 * @private
	 */
	AnalogAccelerometer.prototype.yAxisChanged = function(event) {
		this._y = event.target.value;
		this.dispatchEvent(new Event(Event.CHANGE));
	};
	
	/**
	 * @private
	 */
	AnalogAccelerometer.prototype.zAxisChanged = function(event) {
		this._z = event.target.value;
		this.dispatchEvent(new Event(Event.CHANGE));
	};		

	/** @constant */
	AnalogAccelerometer.X_AXIS = 0;
	/** @constant */
	AnalogAccelerometer.Y_AXIS = 1;
	/** @constant */
	AnalogAccelerometer.Z_AXIS = 2;	

	return AnalogAccelerometer;

}());
