package org.lanark.jsr303js;

import org.junit.BeforeClass;
import org.junit.Test;

import javax.validation.Validation;
import javax.validation.Validator;
import javax.validation.ValidatorFactory;
import java.util.List;

import static org.junit.Assert.*;

/**
 * Class javadoc comment here...
 *
 * @author sam
 * @version $Id$
 */
public class TestConstraintJavaScriptTranslator {
  private static Validator validator;

	/*
  @BeforeClass
   public static void setUp() {
     ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
     validator = factory.getValidator();
   }

  @Test
  public void testParseMetaData() {
    ValidationTestBean testModelBean = new ValidationTestBean();

    RulesGenerator translator = new RulesGenerator();

    List<Rule> rules = translator.parseMetaData(testModelBean.getClass(), validator);

    assertTrue(!rules.isEmpty());

  }

/*
  @Test
  public void testTranslate() {
    TestModelBean testModelBean = new TestModelBean();

    RulesGenerator translator = new RulesGenerator();

    List<Rule> rules = translator.parseMetaData(testModelBean.getClass(), validator);

    assertTrue(!rules.isEmpty());

    for (Rule validationMetaData : rules) {
      String text = translator.toJavaScript(validationMetaData);
      System.err.println(text);
    }
  }
*/

}
