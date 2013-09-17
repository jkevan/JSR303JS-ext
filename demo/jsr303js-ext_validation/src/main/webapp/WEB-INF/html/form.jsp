<%@ taglib uri="http://www.springframework.org/tags" prefix="spring" %>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form" %>

<%@taglib prefix="jsr303js" uri="http://ippon.fr/projects/jsr303js/" %>

<form:form commandName="formBean" method="POST"
		   cssClass="uni-form" servletRelativeAction="/send" id="FormBean">
	<div id="FormBean_errors">

	</div>

	<div class="ctrl-holder">
		<form:label path="firstname">
			<spring:message code="firstname.label"/>
		</form:label>
		<form:input path="firstname"/>
		<div id="firstname_error" class="error"></div>
	</div>

	<div class="ctrl-holder">
		<form:label path="lastname">
			<spring:message code="lastname.label"/>
		</form:label>
		<form:input path="lastname"/>
	</div>

	<div class="ctrl-holder">
		<form:label path="age">
			<spring:message code="age.label"/>
		</form:label>
		<form:input path="age"/>
	</div>

	<div class="ctrl-holder">
		<input type="submit" value="<spring:message code="send" />">
	</div>
</form:form>

<script type="text/javascript" src="js/jsr303js-codebase.js"></script>
<script type="text/javascript" src="js/jsr303js-ext.js"></script>
<jsr303js:validator formId="FormBean" form="${formBean}" var="formBeanValidator">

</jsr303js:validator>
<script type="text/javascript">
	var firstNamefield = formBeanValidator.getFirstFieldWithName("firstname");
	firstNamefield.bindValidationToEvent("keyup,change")
			.addPreValidationProcess(function(event, field){
				console.log("PRE VALIDATING KEYUP");
			});

	firstNamefield.bindValidationToEvent("focus")
			.addPreValidationProcess(function(event, field){
				console.log("PRE VALIDATING FOCUS");
			});
</script>