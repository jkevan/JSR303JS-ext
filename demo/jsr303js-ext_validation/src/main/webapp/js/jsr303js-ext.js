/* Default conf */
JSR303JSValidator.defaultConf = {
	errorLocalMessageTemplate: "<span class='{{class}}'>{{message}}</span>",
	errorGlobalMessageTemplate: "<span class='{{class}}'>{{message}}</span>"
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

	_validateRules: function (rules) {
		var ruleViolations = [];
		for (var i = 0; i < rules.length; i++) {
			console.log('Validating rule [' + rules[i].validationFunction + '] ' +
				'for field [' + rules[i].field + ']');
			if (!rules[i].validate(this)) {
				console.log('Failed');
				ruleViolations.push(this._buildRuleViolation(rules[i]));
			} else {
				console.log('Passed');
			}
		}

		return ruleViolations;
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

JSR303JSValidator.Field.prototype._executeConditions = function(){
	var instance = this;
	try{
		if(this.actions.conditions.length > 0){
			console.log("Execute validation conditions");
			this.actions.conditions.forEach(function(condition){
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

JSR303JSValidator.Field.prototype._doFieldRulesValidation = function () {
	var instance = this;
	var rules = this._getFieldRules();
	var failedRules = [];
	if (rules.length > 0) {
		failedRules = JSR303JSValidator.Utils._validateRules(rules);
	} else {
		console.log('Unable to find validation rules for field "' + instance.name + '"');
	}

	return failedRules;
};

JSR303JSValidator.Field.prototype._initFieldValidation = function(event, field){
	if(field._getActionsForEvent(event).validationTimeoutDelay
		&& !isNaN(field._getActionsForEvent(event).validationTimeoutDelay)){

		clearInterval(field._getActionsForEvent(event).validationTimeout);
		field._getActionsForEvent(event).validationTimeout = setTimeout(function(){
			field._doFieldValidation(field, event);
		}, field._getActionsForEvent(event).validationTimeoutDelay);

	}else {
		field._doFieldValidation(event, field);
	}
};

JSR303JSValidator.Field.prototype._doAction = function(event, field, ruleViolations, actionFnName) {
	var globalAction = field._getActionsForEventType("all");

	// Pre validation process
	if(globalAction && globalAction[actionFnName]){
		globalAction[actionFnName](event, field, ruleViolations);
	}
	if(field._getActionsForEvent(event)[actionFnName]){
		return field._getActionsForEvent(event)[actionFnName](event, field, ruleViolations);
	}
};

JSR303JSValidator.Field.prototype._doFieldValidation = function(event, field){
	console.log("Start validating field:" + field.name);

	// Do conditions
	if(!field._hasValidationRules() && !field._executeConditions()){
		return true;
	}

	field._doAction(event, field, null, "preValidationProcess");

	//Do validation
	var ruleViolations = field._doFieldRulesValidation();

	// Post validation process
	var updatedRuleViolations = field._doAction(event, field, ruleViolations, "postValidationProcessBeforeMessage");
	if(updatedRuleViolations){
		ruleViolations = updatedRuleViolations;
	}

	// Display error messages
	field._updateErrorMessages(ruleViolations);

	// Post validation process
	field._doAction(event, field, ruleViolations, "postValidationProcessAfterMessage");

	return ruleViolations;
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

JSR303JSValidator.Field.prototype.actions = [];
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

JSR303JSValidator.Field.Actions.prototype.conditions = [];
JSR303JSValidator.Field.Actions.prototype.addValidationCondition = function(condition){
	this.conditions.push(condition);
	return this;
};

JSR303JSValidator.Field.Actions.prototype.preValidationProcess = 0;
JSR303JSValidator.Field.Actions.prototype.addPreValidationProcess = function(fn){
	this.preValidationProcess = fn;
	return this;
};

JSR303JSValidator.Field.Actions.prototype.postValidationProcessBeforeMessage = 0;
JSR303JSValidator.Field.Actions.prototype.addPostValidationBeforeMessageProcess = function(fn){
	this.postValidationProcessBeforeMessage = fn;
	return this;
};

JSR303JSValidator.Field.Actions.prototype.postValidationProcessAfterMessage = 0;
JSR303JSValidator.Field.Actions.prototype.addPostValidationAfterMessageProcess = function(fn){
	this.postValidationProcessAfterMessage = fn;
	return this;
};

JSR303JSValidator.Field.Actions.prototype.validationTimeoutDelay = 0;
JSR303JSValidator.Field.Actions.prototype.validationTimeout = 0;
JSR303JSValidator.Field.Actions.prototype.setValidationDelay = function(delay){
	this.validationTimeoutDelay = delay;
	return this;
};

/* Form API */
JSR303JSValidator.Form.prototype.bindValidationToSubmit = function(){
	var instance = this;
	var fields = instance.getFields();

	fields.forEach(function(field){
		field.bindValidationToEvent("submit");
	});

	JSR303JSValidator.Utils._bindEvent(instance.formElement, "submit", function(event){

		// Do preValidation
		instance._doAction(event, null, "preSubmitValidationProcess");

		var validate = true;
		var ruleViolationsByField = [];
		instance.getFields().forEach(function(field){
			var ruleViolation = field._doFieldValidation(event, field);
			if(ruleViolation.length > 0){
				validate = false;
				ruleViolationsByField.push({
					field: field.name,
					ruleViolations: ruleViolation
				})
			}
		});

		// Do postValidation
		instance._doAction(event, ruleViolationsByField, "postSubmitValidationProcess");

		// if errors don't send the form
		if(ruleViolationsByField.length > 0){
			event.preventDefault();
		}

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

JSR303JSValidator.Form.Actions.prototype.preSubmitValidationProcess = 0;
JSR303JSValidator.Form.Actions.prototype.addPreSubmitValidationProcess = function(fn){
	this.preSubmitValidationProcess = fn;
	return this;
};

JSR303JSValidator.Form.Actions.prototype.postSubmitValidationProcess = 0;
JSR303JSValidator.Form.Actions.prototype.addPostSubmitValidationProcess = function(fn){
	this.postSubmitValidationProcess = fn;
	return this;
};
JSR303JSValidator.Form.prototype.actions = new JSR303JSValidator.Form.Actions();

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