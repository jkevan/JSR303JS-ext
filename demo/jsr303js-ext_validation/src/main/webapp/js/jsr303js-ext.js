/* Utils */
JSR303JSValidator.Utils = {
	_bindEvent: function (field, type, callback, propagation) {
		var fn = function(event){
			callback(field);
		};
		if (field.fieldElement.addEventListener) {
			field.fieldElement.addEventListener(type, fn, propagation);
		} else if (field.fieldElement.attachEvent) {
			field.fieldElement.attachEvent('on' + type, fn);
		}
	}
};

/* Field API */
JSR303JSValidator.Field.prototype.conditions = [];
JSR303JSValidator.Field.prototype.addCondition = function(condition){
	this.conditions.push(condition);
	return this;
};

JSR303JSValidator.Field.prototype.onSuccess = [];
JSR303JSValidator.Field.prototype.addSuccessCallBack = function(callback){
	this.onSuccess.push(callback);
	return this;
};

JSR303JSValidator.Field.prototype.onFailed = [];
JSR303JSValidator.Field.prototype.addFailedCallBack = function(callback){
	this.onFailed.push(callback);
	return this;
};

JSR303JSValidator.Field.prototype.bindValidationToEvent = function(type){
	var instance = this;
	JSR303JSValidator.Utils._bindEvent(this, type, instance.validate, false);
	return this;
};

JSR303JSValidator.Field.prototype._executeConditions = function(){
	var instance = this;
	try{
		if(this.conditions.length > 0){
			console.log("Execute condition on validation");
			this.conditions.forEach(function(condition){
				if(!condition(instance)){
					throw "conditionFailed";
				}
			});
		}else {
			console.log("No conditions");
		}
	}catch (err){
		if(err == "conditionFailed"){
			console.log("Conditions failed");
			return false;
		}
	}
	console.log("Conditions succeeded");
	return true;
};

JSR303JSValidator.Field.prototype.validate = function(field){
	console.log("Start validating field:" + field.name);

	// Do conditions
	if(!field._executeConditions()){
		return;
	}

	// TODO validate




};

/* Validator */
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