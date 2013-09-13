package fr.ippon.blog.jsr303js.taglib;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import javax.servlet.jsp.JspException;
import javax.servlet.jsp.JspWriter;
import javax.servlet.jsp.tagext.BodyContent;
import javax.servlet.jsp.tagext.BodyTagSupport;
import javax.validation.Validation;
import javax.validation.Validator;
import org.lanark.jsr303js.ValidationJavaScriptGenerator;
import org.lanark.jsr303js.ValidationMetaData;
import org.lanark.jsr303js.ValidationMetaDataParser;

/**
 * Created with IntelliJ IDEA.
 * User: kjahan
 * Date: 13/09/13
 * Time: 10:35
 * To change this template use File | Settings | File Templates.
 */
public class ValidatorTag extends BodyTagSupport{

	private final ValidationMetaDataParser parser = new ValidationMetaDataParser();
	private final ValidationJavaScriptGenerator generator = new ValidationJavaScriptGenerator();

	// Allow to identify the data model
	private String formClassName;
	private Object form;

	// Used for the generated validator
	private String formId;

	// JavaScript var name for the validator in the page
	private String var;

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

	public void setVar(String var) {
		this.var = var;
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
			generator.generateJavaScript(out, formId, var, true, bodyString, rules);
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
