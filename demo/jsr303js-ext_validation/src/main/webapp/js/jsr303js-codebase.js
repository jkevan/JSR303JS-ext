if (!Array.prototype.push) {
	// Based on code from http://prototype.conio.net/
	Array.prototype.push = function() {
		var startLength = this.length
		for (var i = 0; i < arguments.length; i++) {
			this[startLength + i] = arguments[i]
		}
		return this.length
	}
}
if (!Function.prototype.apply) {
	// Based on code from http://prototype.conio.net/
	Function.prototype.apply = function(object, parameters) {
		var parameterStrings = []
		if (!object) {
			object = window
		}
		if (!parameters) {
			parameters = []
		}
		for (var i = 0; i < parameters.length; i++) {
			parameterStrings[i] = 'parameters[' + i + ']'
		}
		object.__apply__ = this
		var result = eval('object.__apply__(' + parameterStrings.join(', ') + ')')
		object.__apply__ = null
		return result
	}
}

/*
 * Core validation object.
 */
var JSR303JSValidator = function(name, formObjectName, rules, config) {
	this.name = name;
	this.objectName = formObjectName;
	this.config = config;
	this.rules = rules;
	this.form = this._findForm(name);
};

JSR303JSValidator.prototype = {
	_findForm: function(name) {
		var element = document.getElementById(name);
		if (!element || element.tagName.toLowerCase() != 'form') {
			element = document.getElementById(name + 'JSR303JSValidator');
			if (!element || element.tagName.toLowerCase() != 'script') {
				throw 'unable to find form with ID \'' + name + '\' or script element with ID \'' + name + 'JSR303JSValidator\'';
			}
		}
		var foundElement = element;
		while (element && element.tagName.toLowerCase() != 'form') {
			element = element.parentNode;
		}
		if (!element) {
			throw 'unable to find FORM element enclosing element with ID \'' + foundElement.id + '\'';
		}
		return new JSR303JSValidator.Form(element, this);
	}
};

/*
 * Encapsulates a HTML form
 *
 * Based on code from http://prototype.conio.net/
 */
JSR303JSValidator.Form = function(formElement, validator) {
	this.formElement = formElement;
	this.validator = validator;
	this.fields = this._findFields();
};
JSR303JSValidator.Form.prototype = {
	getValue: function(fieldName) {
		return this.getFieldWithName(fieldName).getValue();
	},
	getFieldWithName: function(fieldName) {
		var fields = this.getFields();
		for (var i = 0; i < fields.length; i++) {
			if(fields[i].name == fieldName){
				return fields[i];
			}
		}
		return null;
	},
	getFields: function() {
		return this.fields;
	},
	_findFields: function() {
		var instance = this;
		var fields = [];
		var tagElements = this.formElement.elements;
		var inputNames = [];
		for (var i = 0; i < tagElements.length; i++) {
			if(tagElements[i].tagName.toLowerCase() != "fieldset" &&
				tagElements[i].name &&
				!inputNames[tagElements[i].name]){

				inputNames[tagElements[i].name] = true;
				var field = new JSR303JSValidator.Field(document.getElementsByName(tagElements[i].name), instance.validator);
				if(field._hasValidationRules()){
					fields.push(field);
				}
			}
		}
		return fields;
	}
};

/*
 * Encapsulates a HTML form field
 *
 * Based on code from http://prototype.conio.net/
 */
JSR303JSValidator.Field = function(fieldElements, validator) {
	this.validator = validator;
	this.name = fieldElements[0].name;
	this.tagName = fieldElements[0].tagName.toLowerCase();
	this.type = fieldElements[0].type.toLowerCase();
	this.fieldElements = fieldElements;
	this.actions = [];

	if (JSR303JSValidator.Field.ValueGetters[this.tagName]) {
		this.getValue = JSR303JSValidator.Field.ValueGetters[this.tagName];
	} else if (this.tagName == 'input') {
		switch (this.type) {
			case 'submit':
			case 'hidden':
			case 'password':
			case 'text':
				this.getValue = JSR303JSValidator.Field.ValueGetters['textarea'];
				break
			case 'checkbox':
				this.getValue = JSR303JSValidator.Field.ValueGetters['checkbox'];
				break
			case 'radio':
				this.getValue = JSR303JSValidator.Field.ValueGetters['radio'];
				break
			default:
				throw 'unexpected input field type \'' + this.type + '\'';
		}
	} else {
		throw 'unexpected form field tag name \'' + this.tagName + '\'';
	}
};

JSR303JSValidator.Field.ValueGetters = {
	radio: function() {
		var value = null;
		for(var i = 0; i< this.fieldElements.length; i++){
			if(this.fieldElements[i].checked){
				value = this.fieldElements[i].value;
			}
		}
		return value;
	},
	checkbox: function() {
		var value = [];
		for(var i = 0; i< this.fieldElements.length; i++){
			if(this.fieldElements[i].checked){
				value.push(this.fieldElements[i].value);
			}
		}
		return value;
	},
	textarea: function() {
		if(this.fieldElements.length == 1){
			return this.fieldElements[0].value;
		}else if(this.fieldElements.length > 1){
			var arrayValue = [];
			for (var i = 0; i < this.fieldElements.length; i++) {
				var fieldElement = this.fieldElements[i];
				arrayValue.push(fieldElement.value);
			}
			return arrayValue;
		}
		return null
	},
	select: function() {
		var value = null;
		if (this.fieldElements[0].type == 'select-one') {
			value = this.fieldElements[0].value;
		} else if(this.fieldElements[0].type == 'select-multiple') {
			value = [];
			for (var i = 0; i < this.fieldElements[0].options.length; i++) {
				var option = this.fieldElements[0].options[i];
				if (option.selected) {
					value.push(option.value)
				}
			}
		}
		return value
	}
};

/*
 * Represents a single JSR-303 validation constraint and the functions needed
 * to evaluate that constraint.
 */
JSR303JSValidator.Rule = function(field, validationFunction, params) {
	this.field = field;
	this.params = params;
	this.validationFunction = validationFunction;
}
JSR303JSValidator.Rule.prototype = {
	validate: function(validator) {
		var f = this[this.validationFunction];
		if (!f || typeof f != 'function') {
			return true;
		}
		return f(this.getPropertyValue(this.field), this.params, this.field, validator.config);
	},
	getErrorMessage: function() {
		return (this.params.message || 'Invalid value for ' + this.field);
	},

// Property Accessor
	getPropertyValue: function(propertyName, expectedType) {
		return this.form.getValue(propertyName)
	},

// Assertions
	_assertHasLength: function(value) {
		if (!value.length) {
			throw 'value \'' + value + '\' does not have length'
		}
	},
	_assertLength: function(value, length) {
		this._assertHasLength(value)
		if (value.length != length) {
			throw 'value\'s length != \'' + length + '\''
		}
	},
	_throwError: function(msg) {
		throw msg
	},

// Type safety checks

// This function tries to convert the lhs into a type
// that are compatible with the rhs for the various
// JS compare operations. When there is a choice between
// converting to a string or a number; number is always
// favoured.
	_makeCompatible: function(lhs, rhs) {
		try {
			this._forceNumber(rhs)
			return this._forceNumber(lhs)
		} catch(ex) {
		}
		var lhsType = typeof lhs
		var rhsType = typeof rhs
		if (lhsType == rhsType) {
			return lhs
		} else if (lhsType == 'number' || rhsType == 'number') {
			return this._forceNumber(lhs)
		} else {
			throw 'unable to convert [' + lhs + '] and [' + rhs + '] to compatible types'
		}
	},
	_forceNumber: function(value) {
		if (typeof value != 'number') {
			try {
				var newValue = eval(value.toString())
			} catch(ex) {
			}
			if (newValue && typeof newValue == 'number') {
				return newValue
			}
			throw 'unable to convert value [' + value + '] to number'
		}
		return value
	},
	// JSR-303 validations
	AssertFalse: function(value, params) {
		return (value == 'false');
	},
	AssertTrue: function(value, params) {
		return (value == 'true');
	},
	DecimalMax: function(value, params) {
		var valid = true;
		if (value) {
			var valueNumber = new Number(value).valueOf();
			if (isNaN(valueNumber)) {
				valid = false;
			} else {
				valid = valueNumber <= new Number(params.value).valueOf();
			}
		}
		return valid;
	},
	DecimalMin: function(value, params) {
		var valid = true;
		if (value) {
			var valueNumber = new Number(value).valueOf();
			if (isNaN(valueNumber)) {
				valid = false;
			} else {
				valid = valueNumber >= new Number(params.value).valueOf();
			}
		}
		return valid;
	},
	Digits: function(value, params) {
		var valid = true;
		if (value) {
			var valueNumber = new Number(value).valueOf();
			if (isNaN(valueNumber)) {
				valid = false;
			} else {
				var valueNumberString = valueNumber.toString();
				var numberParts = valueNumberString.split('.');
				if (params.integer && numberParts[0].length > params.integer) {
					valid = false;
				}
				if (valid && params.fraction && numberParts.length > 1 && numberParts[1].length > params.fraction) {
					valid = false;
				}
			}
		}
		return valid;
	},
	Max: function(value, params) {
		var valid = true;
		if (value) {
			var valueNumber = new Number(value).valueOf();
			if (isNaN(valueNumber)) {
				valid = false;
			} else {
				valid = valueNumber <= new Number(params.value).valueOf();
			}
		}
		return valid;
	},
	Min: function(value, params) {
		var valid = true;
		if (value) {
			var valueNumber = new Number(value).valueOf();
			if (isNaN(valueNumber)) {
				valid = false;
			} else {
				valid = valueNumber >= new Number(params.value).valueOf();
			}
		}
		return valid;
	},
	NotNull: function(value, params) {
		return (value && value.toString().length > 0);
	},
	Null: function(value, params) {
		return (!value || value.toString().length == 0);
	},
	Pattern: function(value, params) {
		var valid = true;
		if (value) {
			var caseInsensitive = false;
			if (params.flag && params.flag.length > 0) {
				for (var flagIndex = 0; flagIndex < params.flag.length; flagIndex++) {
					if (params.flag[flagIndex] == 'CASE_INSENSITIVE') {
						caseInsensitive = true;
						break;
					}
				}
			}
			var regularExpression = caseInsensitive ? new RegExp(params.regexp, 'i') : new RegExp(params.regexp);
			valid = value.search(regularExpression) > -1;
		}
		return valid;
	},
	Size: function(value, params) {
		var valid = true;
		if (value) {
			var valueLength = value.length;
			if (params.min && valueLength < params.min) {
				valid = false;
			}
			if (valid && params.max && valueLength > params.max) {
				valid = false;
			}
		}
		return valid;
	},
	Future: function(value, params, fieldName, config) {
		var valid = true;
		if (value) {
			var dateFormat = (config[fieldName] && config[fieldName].dateFormat ? config[fieldName].dateFormat : JSR303JSValidator.DateParser.defaultFormat);
			try {
				var dateValue = JSR303JSValidator.DateParser.parseDate(dateFormat, value);
				valid = dateValue && dateValue.getTime() > new Date().getTime();
			} catch(e) {
				console.log(e);
			}
		}
		return valid;
	},
	Past: function(value, params, fieldName, config) {
		var valid = true;
		if (value) {
			var dateFormat = (config[fieldName] && config[fieldName].dateFormat ? config[fieldName].dateFormat : JSR303JSValidator.DateParser.defaultFormat);
			try {
				var dateValue = JSR303JSValidator.DateParser.parseDate(dateFormat, value);
				valid = dateValue && dateValue.getTime() < new Date().getTime();
			} catch(e) {
				console.log(e);
			}
		}
		return valid;
	},
	// Hibernate Validator validations
	Email: function(value, params) {
		return (!value || value.search(JSR303JSValidator.Rule.emailPattern) > -1);
	},
	Length: function(value, params) {
		var valid = true;
		if (value) {
			var valueLength = value.toString().length;
			if (params.min && valueLength < params.min) {
				valid = false;
			}
			if (valid && params.max && valueLength > params.max) {
				valid = false;
			}
		}
		return valid;
	},
	NotEmpty: function(value, params) {
		return (value && value.toString().search(/\w+/) > -1);
	},
	Range: function(value, params) {
		var valid = true;
		if (value) {
			var valueNumber = new Number(value).valueOf();
			if (isNaN(valueNumber)) {
				valid = false;
			} else {
				if (params.min && valueNumber < params.min) {
					valid = false;
				}
				if (valid && params.max && valueNumber > params.max) {
					valid = false;
				}
			}
		}
		return valid;
	}
}
// email validation regular expressions, from Hibernate Validator EmailValidator
JSR303JSValidator.Rule.emailPatternAtom = '[^\x00-\x1F^\\(^\\)^\\<^\\>^\\@^\\,^\\;^\\:^\\^\"^\\.^\\[^\\]^\\s]';
JSR303JSValidator.Rule.emailPatternDomain = JSR303JSValidator.Rule.emailPatternAtom + '+(\\.' + JSR303JSValidator.Rule.emailPatternAtom + '+)*';
JSR303JSValidator.Rule.emailPatternIPDomain = '\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\]';
JSR303JSValidator.Rule.emailPattern = new RegExp(
	"^" + JSR303JSValidator.Rule.emailPatternAtom + "+(\\." + JSR303JSValidator.Rule.emailPatternAtom + "+)*@("
		+ JSR303JSValidator.Rule.emailPatternDomain
		+ "|"
		+ JSR303JSValidator.Rule.emailPatternIPDomain
		+ ")$", 'i');
/**
 * Very simple Date parsing utility, for @Future/@Past validation.
 * Provide a date format in the tag body in a JSON object, keyed on
 * field name, e.g.:
 *
 * { fieldName : { dateFormat : 'y/M/d' } }
 *
 * Only supports numerical values for days and months. At most one
 * occurrence of each character is allowed (e.g. 'y' but not 'yy'
 * or 'yyyy' or 'y   y').
 *
 * The 'y' year format character is required, other characters are
 * optional, and dates parsed will get default values for fields not
 * represented in the format string.
 *
 * If fewer than four numbers are used for the year then the year
 * will be set according to the browser defaults.
 */
JSR303JSValidator.DateParser = {
	defaultFormat : 'M/d/y',
	formatChars : {
		// this order avoids errors with regex replace calls later on
		'd' : { regexp : '\\d{1,2}' }, // day of month
		'm' : { regexp : '\\d{1,2}' }, // minute of hour
		'M' : { regexp : '\\d{1,2}' }, // month of year
		'a' : { regexp : '[aApP][mM]+' }, // AM/PM, required for 12-hour time
		'y' : { regexp : '\\d{1,4}' }, // year, required
		'h' : { regexp : '\\d{1,2}' }, // 12-hour hour, requires 'a'
		'H' : { regexp : '\\d{1,2}' }, // 24-hour hour, cannot be used with 'a'
		's' : { regexp : '\\d{1,2}' } // second of minute
	},
	parseDate : function(dateFormat, dateValue) {
		var parsedDate = null;
		if (!dateFormat || dateFormat.search(/\w/) < 0) {
			throw('date format must not be blank');
		}
		if (dateFormat.search(/y/) < 0) {
			throw('date format must at least contain year character ("y")');
		}
		if (dateFormat.indexOf('h') > -1 && dateFormat.indexOf('a') < 0) {
			throw('date format must contain AM/PM ("a") if using 12-hour hours ("h")');
		}
		if (dateFormat.indexOf('H') > -1 && dateFormat.indexOf('a') > -1) {
			throw('date format must not contain AM/PM ("a") if using 24-hour hours ("H")');
		}
		if (!dateValue || dateValue.search(/\w/) < 0) {
			throw('date value must not be blank');
		}

		// create map of date piece name to index of capturing group
		var formatChar;
		var partOrderMap = {};
		var partOrder = 1;
		for (var i = 0; i < dateFormat.length; i++) {
			var userFormatChar = dateFormat.charAt(i);
			for (formatChar in this.formatChars) {
				if (userFormatChar == formatChar) {
					if (partOrderMap[formatChar]) {
						throw('date format must not contain more than one of the same format character');
//              } else if ((userFormatChar == 'h' && partOrderMap['H']) || (userFormatChar == 'H' && partOrderMap['h'])) {
//                alert('date format must contain either \'h\' or \'H\', but not both');
					}
					partOrderMap[formatChar] = partOrder++;
				}
			}
		}
		// create regexp from date format
		var dateRegExp = dateFormat;
		for (formatChar in this.formatChars) {
			dateRegExp = dateRegExp.replace(formatChar, '(' + this.formatChars[formatChar].regexp + ')');
		}
		dateRegExp = new RegExp(dateRegExp);

		// run regexp
		var matches = dateValue.match(dateRegExp);

		if (!matches) {
//      throw('date value does not match date format');
			return null;
		}

		// create date pulling values from match array using map of piece name to capturing group indexes
		var yearValue = Math.max(0, matches[partOrderMap['y']] || 0);
		var monthValue = Math.max(0, (matches[partOrderMap['M']] || 0) - 1);
		var dayValue = Math.max(1, matches[partOrderMap['d']] || 0);
		var twelveHourValue = matches[partOrderMap['h']];
		var ampmValue = matches[partOrderMap['a']];
		var twentyFourHourValue = matches[partOrderMap['H']];
		var hourValue;
		if (twelveHourValue) {
			hourValue = twelveHourValue % 12;
			if (ampmValue.toLowerCase().indexOf('p') > -1) {
				hourValue += 12;
			}
		} else {
			hourValue = twentyFourHourValue || 0;
		}
		hourValue = Math.max(0, hourValue);
		var minuteValue = Math.max(0, matches[partOrderMap['m']] || 0);
		var secondValue = Math.max(0, matches[partOrderMap['s']] || 0);

		parsedDate = new Date(yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue);

		return parsedDate;
	}
};
