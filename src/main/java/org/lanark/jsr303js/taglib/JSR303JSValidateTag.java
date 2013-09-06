/*
 * Copyright 2002-2005 the original author or authors.
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

package org.lanark.jsr303js.taglib;

import javax.servlet.jsp.tagext.BodyTagSupport;
import javax.validation.Validation;
import org.lanark.jsr303js.ValidationMetaData;
import org.lanark.jsr303js.ValidationJavaScriptGenerator;
import org.lanark.jsr303js.ValidationMetaDataParser;

import javax.servlet.jsp.JspException;
import javax.servlet.jsp.JspWriter;
import javax.servlet.jsp.tagext.BodyContent;
import javax.servlet.jsp.tagext.BodyTag;
import javax.validation.Validator;
import java.io.IOException;
import java.util.*;

/**
 * Generates JavaScript validation code from JSR-303 validation constraint
 * annotations. The generated code requires a set of JavaScript objects to
 * have been placed into the page either by using the {@link JSR303JSCodebaseTag}
 * or by directly including the code from the file "jsr303js-codebase.js"
 * located in the top level of the jsr303js jar.
 * <p/>
 * You may provide additional configuration for the validation rules by
 * placing a JSON object in the body of this tag. Currently this feature is
 * used to provide date formats for fields that have the {@link javax.validation.constraints.Past}
 * or {@link javax.validation.constraints.Future} annotations. (See the documentation
 * in the jsr303js-codebase.js file for information about the JavaScript date parsing code.)
 * You may put custom configuration for JavaScript implementations of custom constraints
 * into the JSON object in the tag body as well.
 * <p/>
 * This tag must be placed inside the Spring form tags that the validation
 * rules are expected to apply too; failure to do this will result in a JavaScript
 * exception being thrown when the page loads.
 *
 * @author sdouglass
 * @version $Id$
 */
public class JSR303JSValidateTag extends BodyTagSupport implements BodyTag {

    private final ValidationMetaDataParser parser = new ValidationMetaDataParser();
    private final ValidationJavaScriptGenerator generator = new ValidationJavaScriptGenerator();

    private String formClassName;
    private String formId;
	private Object form;

    private BodyContent bodyContent;

	public void setFormClassName(String formClassName) {
		this.formClassName = formClassName;
	}

	public void setFormId(String formId) {
		this.formId = formId;
	}

	public void setForm(Object form) {
		this.form = form;
	}

	protected int doStartTagInternal() {
        return EVAL_BODY_BUFFERED;
    }

    public void doInitBody() {
        // do nothing
    }

    public void setBodyContent(BodyContent bodyContent) {
        this.bodyContent = bodyContent;
    }

    public int doAfterBody() throws JspException {
        return SKIP_BODY;
    }

    public int doEndTag() throws JspException {
        try {
            List<ValidationMetaData> rules = new ArrayList<ValidationMetaData>();
            if (form != null) {
                rules.addAll(getValidationMetaDataForObject(form));
            } else if(formClassName != null) {
				rules.addAll(getValidationMetaDataForClassName(formClassName));
			} else {
				throw new JspException("specify the form or the formClassName attributs");
			}

            String bodyString = null;
            if (bodyContent != null) {
              // body can be a JSON object, specifying date formats, or other extra configuration info
              bodyString = bodyContent.getString().trim().replaceAll("\\s{2,}"," ");
            }

            JspWriter out = pageContext.getOut();
            out.write("<script type=\"text/javascript\" id=\"");
            out.write(formId + "JSR303JSValidator");
            out.write("\">");
            generator.generateJavaScript(out, formId, true, bodyString, rules);
            out.write("</script>");
            return EVAL_PAGE;
        }
        catch (IOException e) {
            throw new JspException("Could not write validation rules", e);
        } catch (ClassNotFoundException e) {
			throw new JspException("Could not find class with name " + formClassName, e);
		}
	}

	public List<ValidationMetaData> getValidationMetaDataForClassName(String fullQualifiedName) throws ClassNotFoundException {
		return parser.parseMetaData(Class.forName(fullQualifiedName), getDefaultValidator());
	}

	public List<ValidationMetaData> getValidationMetaDataForObject(Object o) {
		return parser.parseMetaData(o.getClass(), getDefaultValidator());
	}

	private Validator getDefaultValidator(){
		return Validation.buildDefaultValidatorFactory().getValidator();
	}
}