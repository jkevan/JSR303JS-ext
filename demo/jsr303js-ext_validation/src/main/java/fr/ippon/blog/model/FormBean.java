package fr.ippon.blog.model;


import javax.validation.constraints.NotNull;

/**
 * This class represents the HTML form
 * 
 * @author afillatre@ippon.fr
 */
public class FormBean {

	@NotNull(message="Le prénom ne doit pas être vide")
	private String firstname;
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
