<%@ taglib uri="http://www.springframework.org/tags" prefix="spring"%>
<%@ taglib uri="http://www.springframework.org/tags/form" prefix="form"%>

<%@ taglib uri="http://kenai.com/projects/jsr303js/" prefix="jsr303js"%>

<form:form commandName="formBean" method="POST"
			cssClass="uni-form" servletRelativeAction="/send" id="FormBean">
	<div class="ctrl-holder">
		<form:label path="firstname">
			<spring:message code="firstname.label" />
		</form:label>
		<form:input path="firstname" />
		<span id="firstname_error" class="error"></span>
	</div>

	<div class="ctrl-holder">
		<form:label path="lastname">
			<spring:message code="lastname.label" />
		</form:label>
		<form:input path="lastname" />
	</div>
	
	<div class="ctrl-holder">
		<form:label path="age">
			<spring:message code="age.label" />
		</form:label>
		<form:input path="age" />
	</div>
	
	<div class="ctrl-holder">
		<input type="submit" value="<spring:message code="send" />" >
	</div>
</form:form>

<jsr303js:codebase />
<jsr303js:validate form="${formBean}" formId="FormBean">
	{
		customConfTest:"test"
	}
</jsr303js:validate>
<script type="text/javascript">

</script>