package fr.ippon.blog.model;


import fr.ippon.blog.jsr303js.validation.ajax.Ajaxable;
import org.hibernate.validator.constraints.NotEmpty;

/**
 * This class represents the HTML form
 * 
 * @author afillatre@ippon.fr
 */
public class FormBean {

	@NotEmpty(message="Le prénom ne doit pas être vide")
	private String firstname;
	@NotEmpty(message = "Le nom ne doit pas être vide")
	@Ajaxable
	private String lastname;
	private long age;
	
	public String getFirstname() {
		return firstname;
	}
	public void setFirstname(String firstname) {
		this.firstname = firstname;
	}
	public String getLastname() {
		return lastname;
	}
	public void setLastname(String lastname) {
		this.lastname = lastname;
	}
	public long getAge() {
		return age;
	}
	public void setAge(long age) {
		this.age = age;
	}
}
