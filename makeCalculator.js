/**
 * Create a calculator by:
 * 1. creating a <form /> with a specified id="my-calculator-id" that contains the input fields you need
 * 2. use an <output /> field for your calculated result
 * 3. add a <script/> section in the footer of the <body/> section in your html where you call makeCalculator().
 *    - The first argument is the id of your calculator form
 *    - The second argument is a callback function that receives two arguments: the input (object) and the output (text value).
 *      This callback function should return a valid FHIR Observation that with a valueQuantity that contains the result.
 *
 * Example for BMI:
 *
 * <script>
 *    makeCalculatorV2(
 *      "my-calculator-id",
 *      function (data) {
 *        const observation = {
 *          resourceType: "Observation",
 *          code: {
 *            text: "BMI"
 *          },
 *          valueQuantity: {
 *            value: parseFloat(data.bmi),
 *            unit: "kg/m²",
 *            code: "kg/m2",
 *            system: "http://unitsofmeasure.org"
 *          }
 *        };
 *        return observation;
 *      },
 *      { autoSave: true }
 *    );
 * </script>
 **/
console.debug(
  "******************************\n* Tiro.health Calc-connector *\n******************************",
);

function getFormInputOutput(event) {
  var formElement = event.currentTarget;
  if ((!formElement) instanceof HTMLFormElement) {
    console.warn(
      "Invalid submissions. Submission target is not a form but a",
      event.currentTarget,
    );
    return;
  }
  var formData = new FormData(formElement);
  var inputData = Object.fromEntries(formData.entries());
  var output = Array.from(formElement.elements).find(
    (elem) => elem instanceof HTMLOutputElement,
  );
  return [inputData, output];
}

function makeCalculator(calculatorId, callback, options = {}) {
  const { autoSave } = options;
  console.debug("> Creating calculator with options:", options);
  try {
    var url_string = window.location.href.toLocaleLowerCase();
    var url = new URL(url_string);
    var params = url.searchParams;
  } catch (err) {
    console.debug("Issues with Parsing URL Parameters");
  }
  console.debug("> Prepopulating fields with params", params);

  for (const [key, value] of params.entries()) {
    $(`form#calculator input[name=${key}]`).val(value);
  }
  $("#calculator").trigger("input");
  $("#calculator").on("submit", function (event) {
    event.preventDefault();
    var [input, output] = getFormInputOutput(event);
    var result = callback(input, output);
    if (window.parent) {
      console.debug("> Result submitted to parent.");
      window.parent.postMessage(result, "*");
    }
  });
  if (autoSave) {
    $("#calculator").submit();
    console.debug("> AutoSave enabled.");
    $("#calculator").on("input", function (event) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    });
  }
}
function getFormData(event) {
  var formElement = event.currentTarget;
  if ((!formElement) instanceof HTMLFormElement) {
    console.warn(
      "Invalid submissions. Submission target is not a form but a",
      event.currentTarget,
    );
    return;
  }
  var formData = new FormData(formElement);

  Array.from(formElement.elements)
    .filter((elem) => elem instanceof HTMLOutputElement)
    .map((elem) => formData.append(elem.name, elem.value));
  var data = Object.fromEntries(formData.entries());
  return data;
}

function makeCalculatorV2(calculatorId, callback, options = {}) {
  const { autoSave } = options;
  const selector = `form#${calculatorId}`;
  console.debug("> Creating calculator with options:", options);
  try {
    var url_string = window.location.href.toLocaleLowerCase();
    var url = new URL(url_string);
    var params = url.searchParams;
  } catch (err) {
    console.debug("Issues with Parsing URL Parameters");
  }
  console.debug("> Prepopulating fields with params", params);

  for (const [key, value] of params.entries()) {
    $(selector + ` input[name=${key}]`).val(value);
  }
  $(selector).trigger("input");
  $(selector).on("submit", function (event) {
    event.preventDefault();
    var data = getFormData(event);
    var result = callback(data);
    if (window.parent) {
      console.debug("> Result submitted to parent.");
      window.parent.postMessage(result, "*");
    }
  });
  if (autoSave) {
    console.debug("> AutoSave enabled.");
    $(selector).on("input", function (event) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    });
  }
}

function randomString(length) {
  var result = "";
  var characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  var charactersLength = characters.length;
  var length = length || 10;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * Make a calculator that sends the result to the parent window.
 * version 3 has a strict messaging protocol following the SMART Web Messaging specification, albeit loosly.
 * This improves security when messaging between windows.
 * @param {*} calculatorId
 * @param {*} callback
 * @param {*} options
 */
function makeCalculatorV3(calculatorId, callback, options = {}) {
  const { autoSave } = options;
  const selector = `form#${calculatorId}`;
  console.debug("> Creating calculator with options:", options);
  try {
    var url_string = window.location.href;
    var url = new URL(url_string);
    var params = url.searchParams;
    var targetOrigin = url.searchParams.get("targetOrigin");
    var messagingHandle = url.searchParams.get("messagingHandle");
  } catch (err) {
    console.debug("Issues with Parsing URL Parameters");
  }
  console.debug(
    "> Prepopulating fields with params",
    Object.fromEntries(params.entries()),
  );

  for (const [key, value] of params.entries()) {
    $(selector + ` input[name='${key}']`).val([value]);
  }
  $(selector).trigger("input");
  $(selector).on("submit", function (event) {
    event.preventDefault();
    var data = getFormData(event);
    var payload = callback(data);
    var message = {
      payload: payload,
      messageType: "scratchpad.update",
      messagingHandle: messagingHandle,
      messageId: randomString(10),
    };
    if (window.parent) {
      console.debug("> Result submitted to parent.");
      window.parent.postMessage(message, targetOrigin);
    }
  });
  if (autoSave) {
    console.debug("> AutoSave enabled.");
    $(selector).on("input", function (event) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    });
  }
}

/**
 * FHIR Resource
 * @typedef {Object} FHIRResource
 * @property {string} resourceType - The type of the FHIR resource
 */

/**
 * Convert form data to FHIR data
 * @callback fhirToFormData
 * @param {FHIRResource} resource - The FHIR resource that contains the form data
 * @returns {FormData} - The form data
 */

/**
 * Convert FHIR data to form data
 * @callback formDataToFHIR
 * @param {FormData} data - The form data
 * @returns {FHIRResource} - The FHIR resource that contains the form data
 */

/**
 * Make a calculator that sends the result to the parent window.
 * version 4 has a strict messaging protocol following the SMART Web Messaging specification
 * This improves security when messaging between windows but also allows for storage of the entire form data
 * @param {string} calculatorId - The id of the form element that contains the calculator
 * @param {Object} transformer - A transformer object that contains two functions: formDataToFHIR and FHIRToFormData
 * @param {formDataToFHIR} transformer.formDataToFHIR - A function that transforms form data to FHIR data. This is used to store the form data in the parent window.
 * @param {fhirToFormData} transformer.fhirToFormData - A function that transforms FHIR data to form data. This is used to read the form data from the parent window.
 * @param {Object} options - Options for the calculator
 * @param {boolean} [options.autoSave] - Automatically save the form data on input
 */
function makeCalculatorV4(
  calculatorId,
  { fhirToFormData, formDataToFHIR },
  options = {},
) {
  const { autoSave } = options;
  const selector = `form#${calculatorId}`;
  console.debug("> Creating calculator with options:", options);
  /**
   * READ URL PARAMETERS
   */
  try {
    var url_string = window.location.href;
    var url = new URL(url_string);
    var params = url.searchParams;
    var targetOrigin = params.get("targetOrigin");
    params.delete("targetOrigin");
    var messagingHandle = params.get("messagingHandle");
    params.delete("messagingHandle");
    var reference = url.searchParams.get("reference");
    params.delete("reference");
    var resourceId = reference?.split("/")?.pop();
  } catch (err) {
    console.debug(
      "Issues with Parsing URL Parameters. Aborting calculator setup.",
    );
    console.warn(err.toString());
    return;
  }

  console.debug(
    "> Prepopulating fields with params",
    Object.fromEntries(params.entries()),
  );
  /**
   * PREPOPULATE FORM FIELDS
   */
  params.keys().forEach((key) => {
    $(selector + ` input[name='${key}']`).val(params.getAll(key));
    $(selector + ` input[name='${key}']`).trigger("input");
  });

  /**
   * REQUEST FORM DATA FROM PARENT
   */
  if (window.parent && reference) {
    console.debug("> Requesting form data from parent.");
    var message = {
      messageType: "scratchpad.read",
      messagingHandle: messagingHandle,
      messageId: randomString(10),
      payload: {
        location: reference,
      },
    };
    console.log("> Sending message to parent.", message);
    window.parent.postMessage(message, targetOrigin);
    const handler = (event) => {
      if (event.origin !== targetOrigin) return;
      if (
        "responseToMessageId" in event.data &&
        event.data.responseToMessageId == message.messageId
      ) {
        event.preventDefault();
        console.debug(
          "> Received form data from parent.",
          event.data.payload.resource,
        );
        const formData = fhirToFormData(event.data.payload.resource);
        formData.keys().forEach((key) => {
          $(selector + ` input[name='${key}']`).val(formData.getAll(key));
          $(selector + ` input[name='${key}']`).trigger("input");
        });
        window.removeEventListener("message", handler);
      }
    };
    window.addEventListener("message", handler);
  }
  /**
   * ADD OUTPUT VALUE TO FORM DATA
   */
  console.debug("> Adding output value to form data.");
  $(selector)
    .get(0)
    .addEventListener("formdata", function (event) {
      var formData = event.formData;
      Array.from(event.currentTarget.elements)
        .filter((elem) => elem instanceof HTMLOutputElement)
        .map((elem) => formData.append(elem.name, elem.value));
    });
  /**
   * TRANSFORM FORM DATA TO FHIR RESOURCE AND SEND PARENT
   */
  $(selector).on("submit", function (event) {
    event.preventDefault();
    var data = new FormData(event.currentTarget);
    const { submitter } = event.originalEvent;
    if (submitter && submitter.name) {
      data.append(submitter.name, submitter.value);
    }
    var resource = formDataToFHIR(data);
    resource.id = resourceId;

    if (!window.parent) return;
    var message = {
      payload: { resource },
      messageType: resourceId ? "scratchpad.update" : "scratchpad.create",
      messagingHandle: messagingHandle,
      messageId: randomString(10),
    };
    window.parent.postMessage(message, targetOrigin);
    function handler(event) {
      if (event.origin !== targetOrigin) return;
      if (
        "responseToMessageId" in event.data &&
        event.data.responseToMessageId == message.messageId
      ) {
        event.preventDefault();
        if ("location" in event.data.payload) {
          resourceId = event.data.payload.location.split("/").pop();
        }
        window.removeEventListener("message", handler);
      }
    }
    window.addEventListener("message", handler);
    console.debug("> Result submitted to parent.");
    if (data.get("intent") == "close") {
      console.debug("> Sending close request to parent.");
      var message = {
        messageType: "ui.done",
        messagingHandle: messagingHandle,
        messageId: randomString(10),
        payload: {},
      };
      window.parent.postMessage(message, targetOrigin);
    }
  });
  /**
   * AUTOSAVE FORM DATA
   */
  if (autoSave) {
    console.debug("> AutoSave enabled.");
    $(selector).on("input", function (event) {
      event.preventDefault();
      event.currentTarget.requestSubmit();
    });
  }
}
