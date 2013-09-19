/* AJAX Util */
var ajax = {};
ajax.x = function() {
	try {
		return new ActiveXObject('Msxml2.XMLHTTP')
	} catch (e1) {
		try {
			return new ActiveXObject('Microsoft.XMLHTTP')
		} catch (e2) {
			return new XMLHttpRequest()
		}
	}
};

ajax.send = function(url, callback, method, data, sync) {
	var x = ajax.x();
	x.open(method, url, sync);
	x.onreadystatechange = function() {
		if (x.readyState == 4) {
			callback(x.responseText)
		}
	};
	if (method == 'POST') {
		x.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
	}
	x.send(data)
};

ajax.get = function(url, data, callback, sync) {
	var query = [];
	for (var key in data) {
		query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
	}
	ajax.send(url + '?' + query.join('&'), callback, 'GET', null, sync)
};

ajax.post = function(url, data, callback, sync) {
	var query = [];
	for (var key in data) {
		query.push(encodeURIComponent(key) + '=' + encodeURIComponent(data[key]));
	}
	ajax.send(url, callback, 'POST', query.join('&'), sync)
};

/* Default conf */
JSR303JSValidator.defaultConf = {
	errorLocalMessageTemplate: "<span class='{{class}}'>{{message}}</span>",
	errorGlobalMessageTemplate: "<span class='{{class}}'>{{message}}</span>",
	ajaxValidateFieldURL: 0
};

/* Utils */
JSR303JSValidator.Utils = {
	_getProp: function (propName, options){
		if(options && options[propName]){
			return options[propName];
		}else {
			return JSR303JSValidator.defaultConf[propName];
		}
	},

	_bindEvent: function(element, type, fn, propagation){
		if (element.addEventListener) {
			element.addEventListener(type, fn, propagation);
		} else if (element.attachEvent) {
			element.attachEvent('on' + type, fn);
		}
	},

	_bindFieldToEvent: function (field, type, callback, propagation) {
		var fn = function(event){
			callback(event, field);
		};

		this._bindEvent(field.fieldElement, type, fn, propagation);
	},

	_getAjaxableInRules: function (rules){
		var ajaxables = [];
		rules.forEach(function(rule){
			if(rule.params.ajaxable){
				ajaxables.push(rule);
			}
		});
		return ajaxables;
	},

	_getDefaultInRules: function(rules){
		var defaults = [];
		rules.forEach(function(rule){
			if(!rule.params.ajaxable){
				defaults.push(rule);
			}
		});
		return defaults;
	},

	_buildErrorLine: function (field, ruleViolation, global) {
		if (!ruleViolation.params.message) {
			return "";
		}
		var error = global ? JSR303JSValidator.Utils._getProp("errorGlobalMessageTemplate", field.validator.config)
			: JSR303JSValidator.Utils._getProp("errorLocalMessageTemplate", field.validator.config);
		error = error.replace("{{class}}", this._buildErrorClassName(field, ruleViolation.constraint));
		error = error.replace("{{message}}", ruleViolation.params.message);

		return error;
	},

	_buildErrorClassName: function(field, constraint) {
		return field.name + "_" + constraint + "_error"
	},

	_buildRuleViolation: function(rule){
		return {
			constraint: rule.validationFunction,
			params: JSON.parse(JSON.stringify(rule.params))
		};
	}
};

/* Field API */
JSR303JSValidator.Field.prototype.bindValidationToEvent = function(type){
	var instance = this;
	var actions = new JSR303JSValidator.Field.Actions();
	var atype = 0;
	type.trim().split(",").forEach(function(theType){
		atype = theType;
		instance._addActionsToEventType(theType, actions);
		JSR303JSValidator.Utils._bindFieldToEvent(instance, theType, instance._initFieldValidation, false);
	});
	if(atype){
		return instance._getActionsForEventType(atype);
	}
};

JSR303JSValidator.Field.prototype._executeConditions = function(event){
	var instance = this;
	try{
		if(instance._getActionsForEvent(event).conditions.length > 0){
			console.log("Execute validation conditions");
			instance._getActionsForEvent(event).conditions.forEach(function(condition){
				if(!condition(instance)){
					throw "conditionFailed";
				}
			});
		}
	}catch (err){
		if(err == "conditionFailed"){
			console.log("Conditions failed");
			return false;
		}
	}
	return true;
};

JSR303JSValidator.Field.prototype._getFieldRules = function () {
	var instance = this;
	var rules = [];
	for (var i = 0; i < instance.validator.rules.length; i++) {
		if (instance.validator.rules[i].field == instance.name) {
			var rule = instance.validator.rules[i];
			rule.form = instance.validator.form;
			rules.push(rule);
		}
	}
	return rules;
};

JSR303JSValidator.Field.prototype._hasValidationRules = function () {
	return this._getFieldRules().length > 0;
};

JSR303JSValidator.Field.prototype._doValidateRules = function (callback) {
	var instance = this;
	var rules = this._getFieldRules();
	if (rules.length > 0) {
		instance._validateRules(rules, callback);
	} else {
		console.log('Unable to find validation rules for field "' + instance.name + '"');
	}
};

JSR303JSValidator.Field.prototype._validateRules = function (rules, validationCallBack) {
	var instance = this;
	var ruleViolations = [];

	// Validate default rules
	var defaultRules = JSR303JSValidator.Utils._getDefaultInRules(rules);
	defaultRules.forEach(function(defaultRule){
		console.log('Validating rule [' + defaultRule.validationFunction + '] ' +
			'for field [' + defaultRule.field + ']');

		if (!defaultRule.validate(this)) {
			console.log('Failed');
			ruleViolations.push(JSR303JSValidator.Utils._buildRuleViolation(defaultRule));
		} else {
			console.log('Passed');
		}
	});

	// Validate ajax rules
	var ajaxServiceURL = JSR303JSValidator.Utils._getProp("ajaxValidateFieldURL", instance.validator.config);
	var ajaxRules = JSR303JSValidator.Utils._getAjaxableInRules(rules);
	if(ajaxServiceURL && ajaxRules.length > 0){
		var constraints = [];
		ajaxRules.forEach(function(ajaxRule){
			constraints.push(ajaxRule.validationFunction);
		});

		//TODO generic params
		var data = {
			objectName: instance.validator.objectName,
			fieldName: ajaxRules[0].field,
			fieldValue: instance.getValue(),
			constraints: constraints.join(",")
		};

		console.log('AJAX Validating rules ' +
			'for field [' + ajaxRules[0].field + ']');
		ajax.get(ajaxServiceURL, data, function(data){
			if(data){
				ruleViolations = ruleViolations.concat(JSON.parse(data));
				if(ruleViolations.length > 0){
					console.log('Failed');
				}else{
					console.log('Passed');
				}
			}

			if(validationCallBack){
				validationCallBack(ruleViolations);
			}
		})
	}else if(!ajaxServiceURL && ajaxRules.length > 0){
		console.log('Unable to validates rules in AJAX, ' +
			'no service URL provide in validator config');
	}else {
		if(validationCallBack){
			validationCallBack(ruleViolations);
		}
	}
};

JSR303JSValidator.Field.prototype._initFieldValidation = function (event, field) {
	if (field._getActionsForEvent(event).validationTimeoutDelay
		&& !isNaN(field._getActionsForEvent(event).validationTimeoutDelay)) {

		clearInterval(field._getActionsForEvent(event).validationTimeout);
		field._getActionsForEvent(event).validationTimeout =
			setTimeout(function () {
					field._doValidateField(event, field);
				},
				field._getActionsForEvent(event).validationTimeoutDelay);

	} else {
		field._doValidateField(event, field);
	}
};

JSR303JSValidator.Field.prototype._doAction = function(event, field, ruleViolations, actionFnName) {
	var globalAction = field._getActionsForEventType("all");

	if(globalAction && globalAction[actionFnName]){
		globalAction[actionFnName](event, field, ruleViolations);
	}

	if(field._getActionsForEvent(event)[actionFnName]){
		field._getActionsForEvent(event)[actionFnName](event, field, ruleViolations);
	}
};

JSR303JSValidator.Field.prototype._doValidateField = function(event, field, callback){
	console.log("Start validating field:" + field.name);

	// Do conditions
	if(!field._hasValidationRules() || !field._executeConditions(event)){
		return true;
	}

	field._doAction(event, field, null, "preValidationProcess");

	//Do validation
	field._doValidateRules(function(ruleViolations){
		// Post validation process
		field._doAction(event, field, ruleViolations,
				"postValidationProcessBeforeMessage");

		// Display error messages
		field._updateErrorMessages(ruleViolations);

		// Post validation process
		field._doAction(event, field, ruleViolations, "postValidationProcessAfterMessage");

		if (callback) {
			callback(ruleViolations);
		}
	});
};

JSR303JSValidator.Field.prototype._updateErrorMessages = function(ruleViolations){
	this._updateLocalErrorMessages(ruleViolations);
	this._updateGlobalErrorMessages(ruleViolations);
};

JSR303JSValidator.Field.prototype._updateGlobalErrorMessages = function(ruleViolations){
	var instance = this;
	var errorContainer = document.getElementById(instance.validator.form.formElement.getAttribute("id")
		+ "_errors");
	if(errorContainer){
		var newErrorContainer = errorContainer.cloneNode(true);

		// Clean errors related to this field in global container
		var fieldRules = instance._getFieldRules();
		fieldRules.forEach(function(rule){
			var errorLineToDelete = newErrorContainer.getElementsByClassName(
				JSR303JSValidator.Utils._buildErrorClassName(instance, rule.validationFunction))
			if(errorLineToDelete.length > 0){
				newErrorContainer.removeChild(errorLineToDelete[0]);
			}
		});

		// Add errors related to this field
		ruleViolations.forEach(function(ruleViolation){
			newErrorContainer.innerHTML += JSR303JSValidator.Utils._buildErrorLine(instance, ruleViolation, true);
		});

		errorContainer.parentNode.replaceChild(newErrorContainer, errorContainer);
	}
};

JSR303JSValidator.Field.prototype._updateLocalErrorMessages = function(ruleViolations){
	var instance = this;
	var errorContainer = document.getElementById(instance.name + "_error");
	if(errorContainer){
		var newErrorContainer = errorContainer.cloneNode(false);
		ruleViolations.forEach(function(ruleViolation){
			newErrorContainer.innerHTML += JSR303JSValidator.Utils._buildErrorLine(instance, ruleViolation, false);
		});

		errorContainer.parentNode.replaceChild(newErrorContainer, errorContainer);
	}
};

JSR303JSValidator.Field.prototype._addActionsToEventType = function(type , actions){
	this.actions[type] = actions;
};
JSR303JSValidator.Field.prototype._getActionsForEvent = function(event){
	return this._getActionsForEventType(event.type)
};
JSR303JSValidator.Field.prototype._getActionsForEventType = function(eventType){
	return this.actions[eventType];
};

JSR303JSValidator.Field.Actions = function(){
};

JSR303JSValidator.Field.Actions.prototype.addValidationCondition = function(condition){
	if(!this.conditions){
		this.conditions = [];
	}
	this.conditions.push(condition);
	return this;
};

JSR303JSValidator.Field.Actions.prototype.addPreValidationProcess = function(fn){
	this.preValidationProcess = fn;
	return this;
};

JSR303JSValidator.Field.Actions.prototype.addPostValidationBeforeMessageProcess = function(fn){
	this.postValidationProcessBeforeMessage = fn;
	return this;
};

JSR303JSValidator.Field.Actions.prototype.addPostValidationAfterMessageProcess = function(fn){
	this.postValidationProcessAfterMessage = fn;
	return this;
};

JSR303JSValidator.Field.Actions.prototype.setValidationDelay = function(delay){
	this.validationTimeoutDelay = delay;
	return this;
};

/* Form API */
JSR303JSValidator.Form.prototype.bindValidationToSubmit = function(){
	var instance = this;
	instance.actions = new JSR303JSValidator.Form.Actions();

	var fields = instance.getFields();

	fields.forEach(function(field){
		field.bindValidationToEvent("submit");
	});

	JSR303JSValidator.Utils._bindEvent(instance.formElement, "submit", function(event){

		// Do preValidation
		instance._doAction(event, null, "preSubmitValidationProcess");

		var validate = true;
		instance.getFields().forEach(function(field){
			field._doValidateField(event, field, function(ruleViolation){
				var ruleViolationsByField = [];

				if(ruleViolation.length > 0){
					validate = false;
					ruleViolationsByField.push({
						field: field.name,
						ruleViolations: ruleViolation
					})
				}

				// Do postValidation
				instance._doAction(event, ruleViolationsByField, "postSubmitValidationProcess");

				// if errors don't send the form
				if(ruleViolationsByField.length > 0){
					event.preventDefault();
				}
			});

		});



	}, false);

	return instance.actions;
};

JSR303JSValidator.Form.prototype._doAction = function(event, ruleViolations, actionFnName) {
	if(this.actions[actionFnName]){
		this.actions[actionFnName](event, ruleViolations);
	}
};

JSR303JSValidator.Form.Actions = function(){
};

JSR303JSValidator.Form.Actions.prototype.addPreSubmitValidationProcess = function(fn){
	this.preSubmitValidationProcess = fn;
	return this;
};

JSR303JSValidator.Form.Actions.prototype.addPostSubmitValidationProcess = function(fn){
	this.postSubmitValidationProcess = fn;
	return this;
};

JSR303JSValidator.Form.prototype._addGlobalProcess = function (fn, actionsFnName){
	var instance = this;
	var fields = instance.getFields();

	var newGlobalActions = new JSR303JSValidator.Field.Actions();
	newGlobalActions[actionsFnName](fn);

	fields.forEach(function(field){
		var globalActions = field._getActionsForEventType("all");
		if(globalActions) {
			globalActions[actionsFnName](fn);
		}else {
			field._addActionsToEventType("all", newGlobalActions);
		}
	});
};

JSR303JSValidator.Form.prototype.addFieldsPreValidationProcess = function(fn){
	this._addGlobalProcess(fn, "addPreValidationProcess");
	return this;
};

JSR303JSValidator.Form.prototype.addFieldsPostValidationBeforeMessageProcess = function(fn){
	this._addGlobalProcess(fn, "addPostValidationBeforeMessageProcess");
	return this;
};

JSR303JSValidator.Form.prototype.addFieldsPostValidationAfterMessageProcess = function(fn){
	this._addGlobalProcess(fn, "addPostValidationAfterMessageProcess");
	return this;
};

/* Validator */
JSR303JSValidator.prototype.getForm = function(){
	return this.form;
};

JSR303JSValidator.prototype.getFirstFieldWithName = function(fieldName){
	var fields = this.getFieldsWithName(fieldName);
	if(fields.length > 0){
		return fields[0];
	}
};

JSR303JSValidator.prototype.getFieldsWithName = function(fieldName){
	return this.form.getFieldsWithName(fieldName);
};

JSR303JSValidator.prototype.getFields = function(){
	return this.form.getFields();
};