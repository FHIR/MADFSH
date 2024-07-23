### Conformance Requirements: Must Support

The elements flagged as must support within this IG’s profiles represent the implementation-time requirements for systems supporting the target set of measures. Systems conforming to this IG must demonstrate support for each such element. The criteria for support depends on the role played by the conforming system:

- Systems that create and provide instances conforming to profiles in this IG **SHALL** be able to populate each must support element.
- Systems that receive and process instances conforming to profiles in this IG **SHALL** be able to receive and handle without error instances containing each must support element.

### Data Requirement Sources 

The profiles in this implementation guide communicate data requirements using the must support flag. The set of elements marked as must support are taken from the following three sources:

#### Data Used in the Calculation of Specified Measures 

Data requirements represented within the profiles of this IG come primarily 
from the in-scope measures. The calculation logic for these measures must be
based on the FHIR data model meaning that they reference profiles of FHIR 
resource types and elements within them. The FHIR-based representation of these
measures includes explicit data requirements extracted from the calculation
logic. These extracted data requirements are used to build the profiles in this
IG. A sub-profile is included for each profile referenced within the 
extracted data requirements for in-scope measures. Each element used from a
referenced profile gets flagged as used by a measure within the generated
sub-profiles.

#### Additional Measure Program Data Requirements

Sets of quality measures are often associated with a quality program that has
processes for submitting measure data and / or results. Any data needs
associated with these processes or other considerations are represented as 
explicit data requirements and folded in during generation of this IG.

#### Inherited Data Requirements to Support Interoperability 

The profiles referenced in the measure calculation logic often come with their
own data requirements that are inherited by the profiles in this IG.
In the US Realm these parent profiles will typically themselves extend US Core
Profiles which seek to define a floor for interoperability data requirements
within the United States. The specific version of these parent profiles is
determined by the configuration set when generating this IG from a measure set.

### Interpreting Profiles in this IG 

The generated profile pages in this IG contain many details about the
[extracted data requirements](#data-requirement-sources).
The following sections detail how to interpret and understand these pages.

#### Information Included in Each Profile

To allow for both human consumption and machine-processing, the narrative 
content is mirrored within the formal StructureDefinition for the profile. In
the sections below, the narrative information is described, followed by details
of the structured representation.

##### Measure information 

Each profile page references the specified measures that use the profile,
meaning that instances conforming to this profile are relevant to the
calculation of the measure, which references one or more of the data elements
listed as required for measure calculation. This section provides links to the
measure definition on the [eCQI Resource Center](https://ecqi.healthit.gov/).

###### StructureDefinition Representation

Each measure that uses the profile is represented as an 
[extension](StructureDefinition-used-by-measure.html) instance
at the StructureDefinition root. One instance of the extension will be present
for each measure that uses the profile.

##### Data Elements 

This section lists the data elements that the profile requires support for
grouped by the source of the requirement. Source include the data elements
needed for calculation or as a part of the quality program and data 
requirements inherited from the parent profile. Each element entry includes
two parts:

1.	a narrative description of the information represented by the element’s
    content. These descriptions are taken from US Core profiles when present
    there, or created for the IG following the style in US Core.
2.	the location of the element in parentheses. This can be used to find the
    corresponding element details within the standard profile element table.

###### StructureDefinition Representation

The list of elements in these sections roughly corresponds to the list of
elements with the must support flag. However, some must support elements will
be filtered from the narrative list to keep entries at a common level of
abstraction. Two types of must support elements that might be filtered from the
narrative lists include:

1. *Grouper elements*: e.g., in a profile of 
    [US Core Encounter](https://hl7.org/fhir/us/core/STU6.1/StructureDefinition-us-core-encounter.html), 
    must support element `Encounter.hospitalization.dischargeDisposition` is
    under the `Encounter.hospitalization` grouper element which is also must
    support. The `Encounter.hospitalization` element might be filtered since it
    is a duplicative of `Encounter.hospitalization.dischargeDisposition` and
    too general in comparison.
2. *Detail elements*: e.g., In a profile of 
    [US Core Patient](https://hl7.org/fhir/us/core/STU6.1/StructureDefinition-us-core-patient.html), 
    must support element `Patient.identifier.value `is under the
    `Patient.identifier` element which is also must support. 
    `Patient.identifier.value` might be filtered since it is duplicative
    additional detail beyond `Patient.identifier`.

Choices of which must support elements to include in the narrative list are
configurable as a part of IG generation and so may differ between different
measure set IGs.

Elements used in the calculation of measures are further distinguished by three
element-level changes:

1.	An IG-specific prefix on the short description visible in the 
    [“Description & Constraints”](https://build.fhir.org/ig/FHIR/ig-guidance/readingIgs.html#table-views) 
    column of the profile’s standard element table.
2.	An element-level complex extension that contains the list of measure that
    use this element for calculation. 
3.	A suffix on the element comment field that contains the list of using
    measures with links to their definitions.

These element-level changes qualify those elements used in the calculation of
the measures to appear in the differential tab of the profile’s standard
element table, while inherited must support elements will not appear there. In
contrast, all must support elements, including inherited ones, will appear on
the key elements tab, which represents the full scope of implementation-time 
element support requirements.

##### In-scope Codes and Value Sets 

Codes and related value sets that define the scope of instances covered by
each profile can be found in the In-Scope Codes section of the profile. When
this section is present, it indicates that measure calculation will consider
only instances that contain in the indicated element a code that is present in
this table or is a member of a value set in this table. When possible, the
table includes links to the code or value set definition. Note that some of
these definition pages will require additional credentials to access, such as
value sets defined within the 
[Value Set Authority Center (VSAC)](https://vsac.nlm.nih.gov/).

Some profiles will not contain this section because they are not filtered by
codes. For example, profiles of the Patient resource type.

###### StructureDefinition Representation

The codes and value sets associated with a particular element of a profile are
represented as a [complex extension](StructureDefinition-associated-with-valueset.html) 
on the target element. The extension includes the required code or value set
along with a list of measures that use that code or value set. There will be an
instance of the extension for each possible code and value set referenced
within the in-scope measures.

##### Requirement Summary Table

The requirements summary table provides a single view of all data element
requirements including the source of that requirement (measures, program, or
inherited) and which measures use the element. All of this information can be
found elsewhere in the profile narrative and StructureDefinition, but is
collected here to provide a single human-readable view.

### Implementation Guide Generation Process 

Much of the content in this IG is generated from [extracted data requirements](#data-requirement-sources). 
IG generation involves a semi-automated process that includes
the specification of additional details that supplement and guide the
generation. The primary steps involved are detailed below.

#### Data Requirements Extraction

##### Requirements from Specified Quality Measures

The [HL7 FHIR Quality Measure IG](https://hl7.org/fhir/us/cqfmeasures/) defines
a [FHIR-based eCQM representation format](https://hl7.org/fhir/us/cqfmeasures/StructureDefinition-executable-library-cqfm.html)
that includes the [data requirements](https://hl7.org/fhir/R4/metadatatypes.html#DataRequirement)
abstracted from the CQL calculation logic that is used as an input to the
implementation guide generation logic. This information is not inherent to 
the authoring of CQL, but must be [formally extracted](https://cql.hl7.org/05-languagesemantics.html#artifact-data-requirements).
Tools supporting CQL authoring, including the open-source [cqframework](https://github.com/cqframework/clinical_quality_language)
tool, include logic to generate this measure representation including the data
requirements from the CQL logic created by measure developers. Such a tool must
be used to produce usable inputs for the rest of the generation pipeline.

##### Requirements from the Quality Program

Additional data requirements for participation in the quality program do not
currently have a formal representation. Thus, these must be analyzed
and represented formally so they can be provided to the generation process as a
separate input (TO BE IMPLEMENTED).

#### IG Content Generation 

The open source [MADFSH tool](https://gitlab.mitre.org/uscdi_qm/madie2fsh)
generates the Measure Set-Based IGs from the input measure bundles that 
include the extracted data requirements. See the MADFSH documentation for
details on the generation process and how to guide it through
configuration. These sections provide a high-level desription of the
process:

##### Requirement Aggregation

Each [data requirements](https://hl7.org/fhir/R4/metadatatypes.html#DataRequirement)
entry contains a resource type and a profile. MADFSH combines all data
requirements associated with each profile found, aggregating the associated
must support elements and code filters, while also keeping track of which
measures use each profile, element, and code filter.

##### Profile Generation

Each unique profile in the aggregated data requirements becomes the parent
profile for a new profile generated by MADFSH. MADFSH uses the profile’s list
of must support elements and code filters to identify the elements used for
measure calculation and the in-scope codes respectively. These 
measure-set-specific requirements are combined with details from the parent
profile to create both narrative content (formatted as markdown text) and a
corresponding formal StructureDefinition (represented in FHIR Shorthand).
Additional IG-specific inputs to MADFSH allow for the fine-tuning of the 
generated output, including which elements to include in a narrative list and
what description to use for those elements.

#### IG Rendering

The generated markdown and FHIR Shorthand files are combined with additional
configured and pre-created content and provided to the standard HL7 IG
publisher, which renders the IG into HTML for distribution and publication.
