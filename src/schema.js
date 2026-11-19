/*
 * Canonical field schema.
 *
 * Every field on every form gets collapsed to one of these keys, or to nothing.
 * If a label does not match here, the field is left alone. That is deliberate:
 * a field we cannot confidently name is a field we do not touch.
 *
 * `sensitive: true` means the field never mirrors unless the user explicitly
 * turns it on for the session. It resets to off when the session ends.
 */

const FIELD_SCHEMA = [
  // Identity
  { key: "first_name", label: "First name", synonyms: ["first name", "firstname", "given name", "fname", "first"] },
  { key: "middle_name", label: "Middle name", synonyms: ["middle name", "middlename", "middle initial", "mi", "mname"] },
  { key: "last_name", label: "Last name", synonyms: ["last name", "lastname", "surname", "family name", "lname", "last"] },
  { key: "preferred_name", label: "Preferred name", synonyms: ["preferred name", "goes by", "nickname", "alias", "aka"] },
  { key: "suffix", label: "Suffix", synonyms: ["suffix", "name suffix"] },
  { key: "dob", label: "Date of birth", synonyms: ["date of birth", "dob", "birth date", "birthdate", "born", "d.o.b."] },

  // High sensitivity
  { key: "ssn", label: "Social Security number", sensitive: true, synonyms: ["ssn", "social security number", "social security", "soc sec", "ss number", "ssn4", "last 4 of ssn"] },

  // Contact
  { key: "phone_primary", label: "Primary phone", synonyms: ["phone", "phone number", "primary phone", "cell", "cell phone", "mobile", "mobile phone", "telephone", "contact number"] },
  { key: "phone_alt", label: "Alternate phone", synonyms: ["alternate phone", "secondary phone", "other phone", "alt phone", "home phone", "work phone"] },
  { key: "email", label: "Email", synonyms: ["email", "e-mail", "email address", "e-mail address"] },

  // Address
  { key: "address_line1", label: "Street address", synonyms: ["address", "street address", "address line 1", "address 1", "street", "mailing address", "residence address"] },
  { key: "address_line2", label: "Address line 2", synonyms: ["address line 2", "address 2", "apt", "apartment", "unit", "suite", "apt/unit"] },
  { key: "city", label: "City", synonyms: ["city", "town", "city/town"] },
  { key: "state", label: "State", synonyms: ["state", "state/province", "province"] },
  { key: "zip", label: "ZIP code", synonyms: ["zip", "zip code", "zipcode", "postal code", "postal"] },
  { key: "county", label: "County", synonyms: ["county", "county of residence"] },

  // Demographics
  { key: "gender", label: "Gender", synonyms: ["gender", "gender identity"] },
  { key: "pronouns", label: "Pronouns", synonyms: ["pronouns", "preferred pronouns"] },
  { key: "race", label: "Race", synonyms: ["race"] },
  { key: "ethnicity", label: "Ethnicity", synonyms: ["ethnicity", "hispanic/latino", "hispanic or latino"] },
  { key: "primary_language", label: "Primary language", synonyms: ["language", "primary language", "preferred language", "language spoken"] },
  { key: "marital_status", label: "Marital status", synonyms: ["marital status", "married"] },

  // Program / HMIS common
  { key: "client_id", label: "Client ID", synonyms: ["client id", "participant id", "personal id", "client number", "case number", "record id"] },
  { key: "entry_date", label: "Program entry date", synonyms: ["entry date", "program entry date", "date of entry", "intake date", "enrollment date", "start date"] },
  { key: "exit_date", label: "Program exit date", synonyms: ["exit date", "program exit date", "date of exit", "discharge date", "end date"] },
  { key: "veteran_status", label: "Veteran status", synonyms: ["veteran", "veteran status", "us veteran"] },
  { key: "disabling_condition", label: "Disabling condition", synonyms: ["disabling condition", "disability", "has a disabling condition"] },
  { key: "household_size", label: "Household size", synonyms: ["household size", "number in household", "family size", "hh size"] },
  { key: "living_situation", label: "Living situation", synonyms: ["living situation", "prior living situation", "residence prior to entry", "housing status"] },
  { key: "income_monthly", label: "Monthly income", synonyms: ["monthly income", "total monthly income", "income", "gross monthly income"] },

  // Emergency contact
  { key: "emergency_contact_name", label: "Emergency contact name", synonyms: ["emergency contact", "emergency contact name", "next of kin"] },
  { key: "emergency_contact_phone", label: "Emergency contact phone", synonyms: ["emergency contact phone", "emergency phone", "emergency contact number"] },

  // Staff
  { key: "case_manager", label: "Case manager", synonyms: ["case manager", "assigned staff", "worker", "staff name", "navigator"] }
];

const SENSITIVE_KEYS = new Set(
  FIELD_SCHEMA.filter((f) => f.sensitive).map((f) => f.key)
);

// Flat lookup: normalized synonym -> canonical key.
const SYNONYM_INDEX = (() => {
  const index = new Map();
  for (const field of FIELD_SCHEMA) {
    for (const synonym of field.synonyms) {
      index.set(synonym, field.key);
    }
    index.set(field.label.toLowerCase(), field.key);
    index.set(field.key.replace(/_/g, " "), field.key);
  }
  return index;
})();

const FIELD_LABELS = new Map(FIELD_SCHEMA.map((f) => [f.key, f.label]));

// Attach to window so the other content scripts in the same isolated world
// can read them without a module loader.
self.FormMirrorSchema = {
  FIELD_SCHEMA,
  SYNONYM_INDEX,
  SENSITIVE_KEYS,
  FIELD_LABELS
};
