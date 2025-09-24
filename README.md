# MADFSH: A Tool to Create an FHIR IG Representation of Quality Measure Data Requirements

This tool takes as input FHIR-based representations for a set of quality
measures that include explicit data requirements and outputs a set of FHIR
Shorthand files for a FHIR Profile-based representation of those data
requirements. These files can be combined with additional IG content and run
through the IG Publisher infrastructure to create a FHIR Implementation Guide
representing data requirements for the input measure set.

## FHIR Foundation Project Statement

### Maintainers

This project is maintained by the MITRE Corporation.

### Issues / Discussion
For MADFSH issues, visit the [MADFSH GitHub Issues page](https://github.com/FHIR/MADFSH/issues).

### License
All contributions to this project will be released under the Apache 2.0 License; see https://github.com/FHIR/MADFSH#license

### Contribution Policy
The MADFSH Contribution Policy can be found in [CONTRIBUTING.md](CONTRIBUTING.md).

### Security Information
The MADFSH Security Information can be found in [SECURITY.md](SECURITY.md).

## Getting started

To install the application, download the source code and then run `npm install` from the root directory.
*Note: The instructions assume that ts-node is installed globally. If you do not wish to install ts-node globally, you can use node_modules\.bin\ts-node src/app.ts for execution.*

To run the converter on some sample input, from the root directory run
`ts-node src/app.ts`. This command will execute on a small set of measures as
configured in the `default-config.json` file.

See the [CLI](#cli) section below for how to specify credentials needed to load
terminology details.

### CLI

The following options are recommended for use when invoking MADFSH

- `-c <path>` (or `--config-file <path>`): path to configuration file to use
    on this run
- `-a <value>` (or `--apikey <value>`): umls api key for fetching vsac value
    set details
- `-lu <value>` (or `--loincuser <value>`): LOINC username for fetching LOINC
    code details
- `-lp <value>` (or `--loincpassword <value>`): LOINC password for fetching
    LOINC code details

The following additional options can help with fine-tuning and debugging

- `-n <path>` (or `--narrative-file <path>`): specifies a relative path to a
    JSON file containing element descriptions for use in generating narrative
    content.
- `-oidr` (or `--outputintermediatedatareqjson`): flag to output intermediate
    data requirements to file `aggr-data-require.json`.

### Configuration File Format

MADFSH uses a configuration file to determine what measures to include in the
generated content, where to find them, and details needed to fine-tune the
conversion.

- **projectName**: short string describing the project used for prefixes where generating IG identifiers and urls.
- **projectMarkdownNameAndLink**: a markdown string, typically containing a link (form = `[text](url)`) used in narrative content to describe where the in-scope measures come from and provide readers of the IG a way to get more information.
- **inputRoot**: root folder where measure input files will be found.
- **inputFileList**: list of filenames for measure files inside the
    **inputRoot**. If empty, all `.json` files in the **inputRoot** directory
    will be included.
- **outputRoot**: root folder where output files will be placed. A
    `sushi-config.yaml` file must be present in the directory that includes IG
    configuration details including IG dependencies, as well as an `input`
    directory with `fsh` and `pagecontent` subfolders.
- **exampleMarkdownFile**: name of a file to place generated narrative content around examples. Will be placed in the **outputRoot**/input/pagecontent/ folder. If not present, examples will not be processed.
- **exampleInputFolder**: folder to load example instances from, relative to the **inputRoot**.
- **exampleOutputFolder**: folder where output example files will be placed, relative to the **outputRoot** (Default = **outputRoot**/input/examples/).
- **profileURLReplace**: list of replacements for unresolvable profile URLs
    found in the measures. Each entry is an object with two keys:
  - *source*: profile URL that will be replaced
  - *target*: profile URL that will be used instead
- **measureExtensionURL**: url defining the extension to use for indicating
    measure that use a profile or element.
- **measureLinkFile**: file path relative to the **inputRoot** for a file
    that includes measure details such as an identifier. The file MUST
    contain a `json` list of objects each with the following four keys:
  - *name*: short name of the measure used for display in the generated
        narrative.
  - *identifier*: id for the measure.
  - *keyURL*: url used to identify the measure within the measure files.
  - *definitionURL*: resolvable url that contains measure details used to
        populate links in the generated narrative.
- **valueSetDetails**: value set details provided manually for use in cases
    where they cannot be loaded. Each element of this list is an object with
    four keys:
  - *url*: key for the value set for which details are being provided.
  - *name*: short name for the value set used for display in the generated
        narrative.
  - *id*: identifier for the value set used to identify it.
  - *webLinkUrl*: resolvable url with value set information used in the
        generated narrative. Defaults to the key *url*.
- **codeDetails**: code details provided manually for use in cases where they
    cannot be loaded. Each element of this list is an object with four keys:
  - *code*: target code as seen in the measure definitions.
  - *system*: target code system as seen in the measure definitions.
  - *display*: text describing what the code represents for use in the
        generated narrative.
  - *webLinkUrl*: resolvable url with information on the code used in the
        generated narrative.
- **elementDetailOverrides**: By default, only must support elements at the
    root level of a resource are listed in narrative descriptions of which
    elements are required. In some cases, root level elements should not be
    included in this list and sub-elements should. This list supports
    overriding that behavior to support these use cases. Each entry in the list
    is an object with these keys:
  - *parentProfileKey*: parent profile that will be adjusted
  - *path*: element id for the item for which the default logic is changed.
  - *includeInNarrative*: boolean indicating whether the the target element
        will appear in the narrative list.
- **createDataReqJSON**: debugging option. If `true` then the
    `aggr-data-require.json` in the root folder will contain the aggregated
    data requirements extracted from the target measure set prior to generation
    of the IG.

### Input / Output

As an input, measure bundle files containing [FHIR Library resources](https://build.fhir.org/library.html) should be located under the configured
*inputRoot* (Default: `measure_input/`). Files should be formatted as `*.json`.

After successful execution, outputs will be located under the configured
*outputRoot* (Default: `.` - used by sushi and the ig-publisher for their
input): - `.fsh` files will be created under `input/fsh/` subdirectory - `.md`
files will be created under `input/pagecontent/` subdirectory.

## FHIR IG Generation

Based on the .fsh and .md created, you can generate a FHIR IG using SUSHI on
the same repository. See the [SUSHI installation documentation](https://fshschool.org/docs/sushi/installation/) for installing
the SUSHI tool on your system. If the output of MADFSH has gone to the default
location, then to compile FSH files execute

`sushi .`

To generate complete FHIR IG (which includes sushi, but takes much longer)
execute

`./_genonce.sh` (for Mac) `./_genonce.bat` (for Windows)

## Project Initialization Walkthrough

The following list provides step-by-step instructions for taking a set of
measures and creating an IG that describes
the data requirements for that set of measures. The process of creating
a measure set IG is iterative, so these steps will only get you to a first
version of the IG which will then need to be tweaked using the configuration
options described above and in [`sushi`](https://fshschool.org/docs/sushi/project/#ig-projects) and the crafting of additional static content.

### Pre-requisites

#### Inputs

Obtain a measure set to use for IG generation that meet the following
requirements:

1. Measures must be FHIR-based: they must be built off of the FHIR data model.
    This will typically mean a version of QI-Core (see
    [additional notes](#qi-core-versions-for-measures-and-igs) for specific considerations).
2. Measures must be packaged using the
    [FHIR-based eCQM representation format](https://hl7.org/fhir/us/cqfmeasures/StructureDefinition-executable-library-cqfm.html).

These pre-requisites are consistent with how FHIR-based measures are currently
authored and distributed, such as from [MADiE](https://ecqi.healthit.gov/tool/madie).

##### Optional Additional Inputs

Because the FHIR-based infrastructure for measure publishing is not yet in place,
additional details on the measure, such as the an identifier like the CMS number
and a link to a publicly-available definition of the measure, are not avilable
directly from the measure. In order to provide this information, an additional
measure details file following the format specified in the **measureLinkFile**
configuration optional can be provided as an input as well. The IG can be generated
without this information, but the output will be nicer with it.

#### System

The following software needs to be installed on your system in order to install and run MADFSH and the rest of the toolchain.

1. [Java](https://www.oracle.com/java/technologies/downloads/#java11)
2. [Jekyll] (<https://jekyllrb.com/>)
3. [Node.js and npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
4. [SUSHI](https://github.com/FHIR/sushi?tab=readme-ov-file#installation-for-sushi-users)

### MADFSH install

Download the code in this repository and [install the code in this repository](#getting-started).
Note the parent `<source>` directory and the `<source>/<MADFSH source>` directory for use later.

### MADFSH project initialization

1. From a terminal in the `<source>/<MADFSH source>` directory, execute the command `ts-node src/app.ts init-madfsh-project <project root>`. This will create a `<source>/<project root>` folder.
2. Place the measure bundle files into
    the `<project root>/madfsh-input` folder: this is where MADFSH will look to find
    them. You can delete the `measure_json_files_go_here` file in that directory,
    but MADFSH will ignore it you do not remove it.
3. Place any available example instance files in the
    `<project root>/madfsh-input/examples` folder. You can delete the
    `example_json_files_go_here` file in that directory, but MADFSH will
    ignore it you do not remove it.
4. If you have a measure details file, place it in the `<project root>/madfsh-input`
    directory and update the `<project root>/madfsh-config.json` file with a path to
    that file relative to `<project root>`. For example, if the file is
    `measure-details.json` and is the in the `madfsh-input` folder, then the path
    to use would be `"measureLinkFile": measure-details.json`.

### MADFSH execution

In a terminal navigate to the MADFSH install directory (`<source>/<MADFSH source>`). From there
execute:

```bash
ts-node src/app.ts -c ../<project root>/madfsh-config.json
```

See the [CLI](#cli) section above for details on the `-a`, `-lu`, and `-lp` arguments
which can be added to this initial run, or can be added during later runs.

### Download the IG publisher

Change to the `<project root>` directory and run the following command
to download the ig publisher:

`./_updatePublisher.sh` (for Mac) `./_updatePublisher.bat` (for Windows)

Follow the prompts to get the publisher downloaded.

### IG generation

In a terminal navigate to the `<project root>` directory
and execute:

`./_madfsh_genonce.sh` (for Mac) `./_madfsh_genonce.bat` (for Windows)

This will run through the standard IG publication logic, resulting in content within
the `output` directory. You can open the `igShortcut.html` file in your
`<project root>` directory, which will redirect you to the IG home page,
or alternatively find and open the `index.html` or other target file from
the `output` folder in a web browser to access the generated IG. Using the `_madfsh`
version of the scripts will also copy compressed files with ig content to
the `distribution` folder.

#### Additional information on _genonce and _gencontinuous

Included in this repository is both the standard _genonce and _gencontinuous IG scripts relevant to the IG publisher. More information on the difference between these scripts is documented in the [IG Publisher Scripts Repository](https://github.com/HL7/ig-publisher-scripts).

### Next Steps

Assuming you were able to generate an IG using these steps, you can now start to
tweak settings, investigate issues flagged in the MADFSH output, and otherwise
improve the generated IG.

Helpful resources include:

- [this README's section on MADFSH configuration](#configuration-file-format)
- [`sushi` IG projects documentation](https://fshschool.org/docs/sushi/project/#ig-projects)

Good luck!

### Additional Notes

#### QI-Core Versions for Measures and IGs

As of early 2024, most FHIR-based measures are written against the
[QI-Core 4.1.1 version](https://hl7.org/fhir/us/qicore/STU4.1.1/). However,
this version adds many must support elements beyond the US Core version it
inherits from, making it a poor version from which to generate the IG
because many additional elements would appear to be inherited, likely
swamping the measure-specific ones. Thus, the default configuration currently uses the
[QI-Core 6.0.0 version](https://hl7.org/fhir/us/qicore/STU6/),
which has reduced the number must support elements added by QI-Core.

It is possible to use QI-Core 4.1.1-based measures and generate the IG based on
the QI-Core 6.0.0 version. The necessary mapping of QI-Core 4.1.1 profiles
to QI-Core 6.0.0 profiles is setup in the `default-config.json` file as well as the configuration in the template using the
**profileURLReplace** configuration option.

## Optional Final Step: IG Summary - Creating a data dictionary spreadsheet

[IG Summary](https://github.com/mitre/ig-summary) is an open-source tool intended to be run by those developing measure set FHIR IGs. IG Summary takes outputs of the IG Publisher to create an automated spreadsheet summarization from the FHIR IG. This output provides the FHIR IG content in a format that may be more accessible than the default FHIR artifact pages. The intended audience for this output is policy or other domain experts that are interested in a non-technical view of the data represented by the FHIR IG.

### Interpreting IG Summary Outputs

The output of the IG Summary tool is a flattened list of data elements from the selected FHIR IG displayed in Microsoft Excel format. This file comes with several caveats:

- Only must-support (MS) data elements are included.
- Profiles defined externally to the IG, such as vital signs defined in base FHIR or US Core, are not included.
- Sub-elements of complex types are not explicitly included.

**If there is a discrepancy between this output and the FHIR artifacts, the FHIR artifacts are taken as the source of truth.**

Running IG Summary on the FHIR IG is an optional, final step of the MADFSH process. The default set up of the MADFSH-generated IG Downloads page includes an overview of IG Summary and link to the generated output. Successfully running the IG Summary step will includes a download of the IG Summary excel sheet on the IG Downloads page.

If this step is not run or run incorrectly, the rest of the IG content and FHIR artifacts will remain applicable, but the IG Downloads page will contain a broken link in the IG Summary section.

### Instructions for NOT Including a Data Dictionary Spreadsheet

If you **do not** want to include a data dictionary spreadsheet
with the IG, then:

1. Open the `<project root>/input/pagecontent/4_downloads.md` file and delete all markdown content starting from the header *"### Data Dictionary"*.
2. Delete the `<project root>/input/images/DataDictionary` folder.

### Instructions for Data Dictionary Spreadsheet Generation

Information for installing and running, as well as further developing and testing, the IG Summary tool that is used to create the data dictionary spreadsheet can be found on the [IG Summary Github](https://github.com/mitre/ig-summary). An ongoing area of development is modifying the output of IG summary to capture additional information relevant to generating implementation information from a measure set.
Right now, a prototype modification to capture this additional information that is helpful when looking at a measure set is in the [measure-set-prototype branch](https://github.com/mitre/ig-summary/tree/measure-set-prototype). This adds on an additional column to the Data Elements tab. The column "Used by Measure" is specified "true" if the data element is used by one or more quality measure provided in the input measure set.

After the IG is finalized and run through the publisher, follow these steps to
include a generated data dictionary spreadsheet:

1. **Run the IG Summary Tool**: The IG Summary tool uses the `package.tgz` file found in the `<project root>/output` folder. To run this prototype version of IG Summary, follow all additional IG Summary instructions but use the specific node run command `node --require ts-node/register src/ig-summary.ts create` instead of `ig-summary create`.
2. **Add The Data Dictionary File to the `input` folder**: Move the file created in step 1 to the `<project root>/input/images/DataDictionary` folder, which was created as a part of the template process. Remove the `data-dictionary-empty.xslx` file present there.
3. **Update the "data dictionary" link on the *downloads* page**: open the `<project root>/input/pagecontent/4_downloads.md` file and replace the text `data-dictionary-empty.xlsx` with the name of the file moved in step 2.
4. **Re-run the IG Publisher**: Run the IG Generation steps above again to run the IG Publisher and include the data dictionary file in the generated IG.

If any updates are made to the formal definitions within the IG, e.g.,
the measure inputs are updated or the configuration is tweaked, the IG
Summary tool should be run again and the updated spreadsheet placed in
the `<project root>/input/images/DataDictionary` folder.

### Additional Notes on IG Summary

IG Summary is currently at a "beta" level of maturity and may have bugs or behave in unexpected ways. Any issues using the tool can be reported to the [IG Summary project's Issues page](https://github.com/mitre/ig-summary/issues).

## Identifying and Resolving IG Generation Issues

The output from MADFSH is verbose and aims to provide users with enough information
to determine where MADFSH encountered issues such as input that didn't match
MADFSH assumptions. Some of these issues can be resolved through MADFSH configuration
updates, while others may require changes to measures, or may not be actual issues.

This section details the different sections of MADFSH output, typical errors and warnings
encountered in each of them, and possible resolution paths. Other errors may appear and
suggested resolutions may not be appropriate for your project.

The three sections that typically have errors to resolve are:

- [Aggregating Data Requirements Across Measures](#aggregating-data-requirements-across-measures)
- [Loading Profiles and Identifying Elements](#loading-profiles-and-identifying-elements)
- [Identifying Narrative Elements](#identifying-narrative-elements)

### Loading IG Dependencies

During this step, MADFSH is pulling in definitions from the base FHIR specification
and IGs configured within the `sushi-config.yaml` file, typically including
QI-Core and US Core versions.

Errors logged during this step indicate either problems in the underlying
FHIR package infrastructure or in the specification of the packages in the
`sushi-config.yaml` file.

### Loading Measures

During this step, MADFSH is loading the input measures.

Errors logged during this step typically indicate that the format of the input
measures was incorrect or corrupted in some way.

If a a warning of the form `Measure link details not present for measure...` appears,
that is an indication that the measure link file doesn't have details
for the indicated measure URL. Details for the indicated measure should be
added to the measure link file, either the project-specific one of the default
if in use. See the **measureLinkFile** configuration option for details.

### Aggregating Data Requirements Across Measures

During this step, MADFSH is pulling the data requirements out of the input
measure files and combining them into a single set of data requirements
to use in generating IG profiles. The aggregation algorithm groups requirements
using the [profile element](https://hl7.org/fhir/R4/metadatatypes-definitions.html#DataRequirement.profile) of the [DataRequirement](https://hl7.org/fhir/R4/metadatatypes.html#DataRequirement) data type. MADFSH logs each measure and each dataRequirement
entry as it processes them, allowing users to identify the entries that cause each error.

This section typically has errors that require resolution or at least consideration.

#### Data requirement broken assumption or missing information

MADFSH will flag as an error any situation where the data requirements don't
meet its assumptions or are missing information it needs. Situations it flags include:

- No code filters on clinical resource types: Clinical resource types like Condition
  Medication, Observation, and others are general and measures will almost always be
  looking at only certain ones identified by codes from a value set. MADFSH logs an
  error when it sees a dataRequirement entry for one of these resource types without
  a code filter. Note that which resource types are considered clinical has been built
  into MADFSH. Reach out if there is a resource type getting these errors that shouldn't
  be as it may simply need to be added. There are some known cases, e.g., for Observation
  profiles for vital signs, where the profile specifies a particular code and the
  data requirements don't contain this information.
- Missing information in a code files: if MADFSH sees a codeFitler entry without
  details such as a code or value set, it will throw an error.

Most often, errors encountered during this phase of MADFSH processing are issues
with the requirements extraction that happens upstream of MADFSH. In most cases
the issues will need to be addressed in that software.

### Gathering Value Sets

During this step, MADFSH is loading details on value set and codes that it
found within codeFilter entries. The specification of these value sets and
codes in the data requirements is focused on machine rather than human processing.
Fetching details such as the name and description allows MADFSH to provide
these details in the generated narrative content so that it is easier for
people to read and comprehend.

Errors logged in this sections are related to problems fetching the details
which could be missing or incorrect credentials provided with the MADFSH
command (see the `-a`, `-lu`, and `-lp` command options in the [CLI](#cli)),
or may be transient server availability issues. In some cases, the
value set or code may be inproperly specified in the measure, requiring
upstream changes to resolve the issue.

### Loading Profiles and Identifying Elements

During this step, MADFSH is matching elements found in the data requirements
with the specific element definition within the identified profile. It will
use this information to flag this element as a data requirement for measure
calculation in the generated IG.

This section typically has errors that require resolution or at least consideration.

#### Unable to find element definition

If MADFSH is not able to find the element definition, then it is not able to include
it in the requirements. In this case, an error will be logged.

There are generally two possible reasons for this type of error:

- The data requirement extraction process (or less likely the measure logic)
  has mis-identified the element. In this case, a fix is needed upstream.
- MADFSH does not have the capability to find the element, such as in the known
  case of sub-elements within datatypes. For example, the element
  `Condition.abatementPeriod.start` is not included explicitly within profiles on
  the Condition resource because `start` is an element defined in the Period
  datatype, not within Condition. Logic may be added to allow MADFSH to resolve
  these elements at a future date. Typically, these situations involve details
  down to a level that isn't needed, but if you have a use case for them being
  flagged explicitly, please reach out.

These errors need to be resolved or carefully considered because they indicate a data
requirement from the measures is not being reflected within the IG.

### Identifying Narrative Elements

During this step, MADFSH is determining which elements will be listed in the narrative
and the description to use for them.

This section typically has errors that require resolution or at least consideration.
The following sub-sections detail two typical issues and how to resolve.

#### Identifying the list

The list will be a subset of the elements that are required for measure calculation
and those that are flagged as must support within the parent profile. Not all of these
elements should be listed. Two general cases where flagged elements should not be
listed include:

1. *Grouper elements*: e.g., in a profile of
    [US Core Encounter](https://hl7.org/fhir/us/core/STU6.1/StructureDefinition-us-core-encounter.html),
    must support element `Encounter.hospitalization.dischargeDisposition` is
    under the `Encounter.hospitalization` grouper element which is also must
    support. The `Encounter.hospitalization` element might be filtered since it
    is a duplicative of `Encounter.hospitalization.dischargeDisposition` and
    too general in comparison.
2. *Detail elements*: e.g., In a profile of
    [US Core Patient](https://hl7.org/fhir/us/core/STU6.1/StructureDefinition-us-core-patient.html),
    must support element `Patient.identifier.value` is under the
    `Patient.identifier` element which is also must support.
    `Patient.identifier.value` might be filtered since it is duplicative
    additional detail beyond `Patient.identifier`.

However, MADFSH does not know which elements fall into which case. The current default
heuristic used by MADFSH is that top-level elements are included in the narrative list
while nested elements are not. In the future, improved heuristics may be implemented.
In the meantime, MADFSH provides

- A warning when a nested must support element is NOT included in the narrative, including
  whether that element is used by the measure or is an inherited must support requirement
  since that might inform how important it is to include in the list.
- A way to override the heuristic through configuration
  using the **elementDetailOverrides** [configuration option](#configuration-file-format).

Users can resolve these errors by adding configuration entries to either tell MADFSH
that the element explicitly should not be included in the list or to add it to the list.
Configuration entries can also be added for top-level grouper elements that should
be removed from the list.

#### Identifying the description

By default, MADFSH uses the short description defined with the FHIR element. However,
that description is often inappropriate for a narrative section, e.g., because it is
a list of possible values or are prefixed with flags like `(USCDI)`. The US Core
IG team has recognized this and writes their own narrative descriptions that they
put into the narrative. MADFSH has extracted these US Core narrative descriptions
for use on elements that are also used in MADFSH-generated IGs. However,
MADFSH-generated IGs typically have data requirements that go beyond US Core.

To help users identify potential narrative description problems, MADFSH

- logs a warning when an element included in the narrative list uses the default
  short description in the narrative.
- provides a way for users to [specify a narrative description for elements]  (#add-the-additional-descriptions-manually).
  Note that this configuration is not currently project-specific, but is shared.

### Generating FSH

During this step, MADFSH is using the collected information to generate
FHIR Shorthand representations of the profiles needed for the generated
IG.

Errors logged during this step typically indicate a bug in the MADFSH code
or a problem that was missed in an earlier step.

### Generating Markdown Files

During this step, MADFSH is using the collected information to generate
profile narrative content needed for the generated IG.

Errors logged during this step typically indicate a bug in the MADFSH code
or a problem that was missed in an earlier step.

### Generating Examples

During this step, MADFSH is pulling the example bundles provided and
associating the entries within those bundles with the profiles generated
for the IG. It is also creating a markdown file providing links to the
example instances for using in the IG.

Errors logged during this step typically indicate a bug in the MADFSH code
or a problem in the example inputs.

## Narrative Description Configuration

By default, the application uses element descriptions from US Core whenever
possible. While this provides a strong basis for automatically populating
element descriptions, there may be elements that are not covered by these
default descriptions.

There are two options withing the application for the user to add custom
element descriptions:

### Add the additional descriptions manually

Additional descriptions can be added to storage by following these steps:

1. Copy the default mapping file
    (`src/narrative-mappings/default-narrative-mapping.json`) to a new file.
2. Manually add new descriptions to the copied file with the format
    `<profile name>: {<element path>: <string description>}`. The profiles are
    mapped to a collection of element paths, and each element path is mapped to
    a single description.

Example:

``` json
{
    "us-core-allergyintolerance": {
        "AllergyIntolerance.patient": "a patient"
    }
}
```

### Add the additional descriptions via the CLI

New descriptions can be added to the running mapping using the CLI by running
the following command from the terminal:

``` bash
ts-node src/app.ts update-mapping <file path> <profile name> <element path> <desired description>
```

The required inputs to the command are as follows:

1. `file path` - A relative file path for the file containing your mapping.
    If the file does not exist, a new mapping is created by copying the default
    narrative mappings retrieved from US Core. The new mapping will be written
    to this file.
2. `profile name` - The name of the profile that the element belongs to.
    Examples include `us-core-allergyintolerance` and
    `us-core-immunization`.
3. `element path` - An element path that will be written to the file.
    Examples include `Observation.status`, `Medication.manufacturer`,
    and `Procedure.performed[x]`.
4. `desired description` - A string representing the description of the element
    path. This description must be entered in quotes to be properly processed
    by the application. Example description:
    `"Estimated or actual date, date-time, period, or age when the procedure was performed."`

### Using a custom narrative description file

By default, the narrative descriptions are derived from
`src/narrative-mappings/default-narrative-mapping.json`. To specify a different
description file, use the `-n / --narrative-mapping` option:

``` bash
ts-node src/app.ts -n <file-name>
```

## Using external terminology services

MADFSH can use web calls to get VSAC value sets and LOINC code details. To do
so, [UMLS API key](https://documentation.uts.nlm.nih.gov/rest/authentication.html)
and LOINC credentials need to be provided as parameters below.

``` bash
ts-node src/app.ts -a "[umls api key]" -lu "[loinc username]" -lp "[loinc password]"
```

## Environment/Dependencies

The tool runs best with node version 20. We also use the following development
dependencies, which are installed automatically with npm install and are
documented below for the sake of clarity:

- Code auto-formatting: prettier; eslint
- Logging: winston

## Contributing

### Code standards

Run the following commands to keep code format consistent before commiting any
changes:

- `npm run prettier-format`
- `npm run lint:fix`

### High-level Architecture

A MADFSH run proceeds through several steps. The primary code for each step
lives in a single file:

- Setup ([`config` folder](/src/config))
  - [Load config](#load-config)
    ([`config/settings.ts`](/src/config/settings.ts))
  - [Load FHIR packages](#load-fhir-packages)
    ([`config/fhirPackages.ts`](/src/config/fhirPackages.ts))
- Analysis ([`analysis folder`](/src/analysis/))
  - [Load target measures](#load-target-measures)
    ([`analysis/loadMeasures.ts`](/src/analysis/loadMeasures.ts))
  - [Aggregate measure requirements](#aggregate-measure-requirements)
    ([`analysis/aggregateRequirements.ts`](/src/analysis/aggregateRequirements.ts))
  - [Gather value set details](#gather-value-set-details)
    ([`analysis/terminologyDetails.ts`](/src/analysis/terminologyDetails.ts))
  - [Identify profile elements](#identify-profile-elements)
    ([`analysis/elementDetails.ts`](/src/analysis/elementDetails.ts))
- Generation ([`generation` folder](/src/generation/))
  - [Generate FSH content](#generate-fsh-content)
    ([`generation/generateFSH.ts`](/src/generation/generateFSH.ts))
  - [Generate narrative markdown content](#generate-narrative-markdown-content)
    ([`generation/generateNarrative.ts`](/src/generation/generateNarrative.ts))
  - [Generate example content](#generate-example-content)
    ([`generate/generateExamples.ts`](/src/generation/generateExamples.ts))

The rest of this section provides a high-level overview of what happens during each step

#### Load config

The first step loads configuration from the [configuration file](#configuration-file-format)
into a run-time representation. This includes:

- Converting lists to maps for easy look-up during the analysis and generation steps.
- Defaulting unconfigured values.

Key definitions in the [`settings.ts`](src/config/settings.ts) file include

- The type definitions for the static configuration data and the runtime representation.
- The `settingsToRuntime` function which performs the conversion to the runtime representation.

#### Load FHIR packages

Because generated content will eventually be compiled into an IG using
[sushi](https://github.com/FHIR/sushi) and the IG publisher,
MADFSH uses the sushi configuration file (`sushi-config.yaml`) to identify dependency
and FHIR packages to load for use in analysis and generation. This step

1. Identifies the `sushi-config.yaml` file to use within the **outputRoot** directory.
2. Finds the [dependency list](https://fshschool.org/docs/sushi/configuration/#dependencies)
   within the identified file.
3. Uses the [fhir-package-loader](https://www.npmjs.com/package/fhir-package-loader) tool
   to load a javascript representation of the FHIR dependencies in a searchable construct.
4. Adds the FHIR depencies to the runtime settings object.

The key definition in the [`fhirPackages.ts`](src/config/fhirPackages.ts) file is
the `identifyAndLoadDependencyPackages` function which contains the root logic for
FHIR package loading.

#### Load target measures

To start the analysis step, the target measures are loaded from file. Files in the
**inputRoot** directory that meet the following criteria are loaded:

1. Have a `.json` extension.
2. Are parseable json with a top-level object that has a `resourceType` member
   with the value `Bundle`.
3. If an **inputFileList** was provided, the filename appears in that list.

For each file that meets those criteria, the raw json is loaded and used for the
rest of the processing steps.

The key definition in the [`loadMeasures.ts`](src/analysis/loadMeasures.ts) file is
the `loadMeasureBundle` function which performs the load and verification.

#### Aggregate measure requirements

Data requirements are extracted from the loaded measures and combined into a single
aggregated set of data requirements. To find the data requirements within a single
Measure bundle loaded in the previous step, MADFSH will

1. Find the unique `Measure` instance within the `Bundle`. If multiple are found,
   an error will be logged, but the last one found will be used.
2. Use the `id` element of the `Measure` instance to find a `Library` instance
   with the same `id` element value within the `Bundle`. If the `Measure` instance
   identified did not have an `id` element, then all `Library` instances in the
   `Bundle` will be loaded.
3. For each `Library` instance, each `dataRequirement` entry is processed. If the
   target profile is already included in the aggregated requirements, that entry is augmented with
   the additional elements and filters in this data requirement. Otherwise, a
   new entry for the profile is added to the aggregated requirements.

As a part of this processing,

- Each unique data requirement, as well as unique filters on a particular data element
  will be linked to the measures that use it so that this information can be used for
  content generation.
- Code and value set filters will be normalized and those
  that do not meet minimum requirements will be flagged in the console output and excluded.

The resulting set of aggregated data requirements are passed on for further analysis
and generation steps. If the **createDataReqJSON** configuration flag is set, then the
aggregated requirements are also exported to the `aggr-data-require.json` local file
for examination and debugging.

The key definitions in the [`aggregateRequirements.ts`](src/analysis/aggregateRequirements.ts) file
include:

- internal types for data requirements and filters
- the `reorgDataRequirementWithMeasure` function which performs the identification and aggregation
  of the data requirements.

#### Gather value set details

Some filters within the data requirements mandate certain codes or codes from identified
value sets. However, these specifications don't come with enough
details to generate a human-readable narrative, such as the value set or code name. In order
to obtain this information, MADFSH will request it from a relevant terminology server. MADFSH
supports gathering this information from the following sources:

- Codes
  - *The **codeDetails** configuration setting*: if code details will not be available
    from a supported external source, they can be provided within the configuration file.
  - *LOINC*: details for codes with the `http://loinc.org` system will be fetched from the
    LOINC terminology server. Use of this terminology server requires a LOINC
    [account](https://loinc.org/wp-login.php), which must be provided at MADFSH execution time
    (see the [Using external terminology services](#using-external-terminology-services) section).
  - *SNOMED*: details for codes with the `http://snomed.info/sct` system will be fetched from
    HL7's public terminology server `tx.fhir.org`.
- Value Sets
  - *The **valueSetDetails** configuration setting*: if value set details will not be available
    from a supported external source, they can be provided within the configuration file.
  - *VSAC*: The National Library of Medicine's Value Set Authority Center (VSAC) hosts the definitions
    for value sets used in the Centers for Medicare & Medicaid Services (CMS) electronic Clinical
    Quality Measures (eCQMs). Value sets containing `cts.nlm.nih.gov/fhir` in their url will be
    considered VSAC value sets. To gather value set details using the VSAC API, a
    [UMLS API Key](https://documentation.uts.nlm.nih.gov/rest/authentication.html) must be
    provided at MADFSH execution time (see the
    [Using external terminology services](#using-external-terminology-services) section).

If no code or value set details are found for a given entry, a default is used that contains
basic details, but won't be very human-readable. In this case, a warning is logged to the
output console so that issues causing the ommission can be resolved, e.g., by providing
the necessary credentials or adding details within the configuration.

The key definition in the [`terminologyDetails.ts`](src/analysis/terminologyDetails.ts) file
is the `fetchValueSetAndCodeDetails` function which is the primary entry point and which
delegates to helper functions.

#### Identify profile elements

This step contains the primary logic for determining what the generated profiles will look like.
Most decisions, such as about which profiles to generate and which elements go into a profile's
narrative element list, get made within this step. The following generation steps simply create
output based on those decisions.

Specifically, in this step MADFSH prepares to create a new profile of each parent profile
identified within the aggregated data requirements. It does so over three steps:

1. *Map the data requirements to their formal FHIR definitions*: IG generation will fail if
   sushi or the publisher cannot find the profile or element definitions referenced. Thus, MADFSH
   checks these details beforehand so that it is confident that the generated IG will be successfully
   generated by those tools. This involves
   - finding the profile referenced in the data requirements to extend within the list of
     [loaded fhir dependencies](#load-fhir-packages)
   - finding the definition of each referenced element within that profile's StructureDefinition
2. *Add inherited details*: Inherited must support elements typically get included in the list of
   narrative elements, so these are identified for later use.
3. *Identify narrative elements*: Elements used in measures and inherited must supports are
   included in a narrative list of key elements. This sub-step finds these elements and
   identifies the content to use for describing the element in the narrative. This includes
   looking for alternative descriptions to use instead of the default element short description.

The key definitions in the [`elementDetails.ts`](src/analysis/elementDetails.ts) file
include:

- function `prepareElementDetails` is the root entry point for this analysis step.
- function `dataReqsToProfileDetail` is responsible for mapping data requirement profile
  entries onto the FHIR StructureDefinition and checking that each required element
  exists within the profile.
- method `identifyElementsForNarrative` is responsible for identifying narrative elements
  and also for determining what the narrative description for the element will be.
- primary code filter details in constants `KeyFilterElementForResourceType` and
  `ResourceTypesWithoutKeyFilterElements`. See comment on those constants for more
  details.

#### Generate FSH content

The FSH generation step uses the decisions made in the [Identify profile elements](#identify-profile-elements)
step to create FHIR Shorthand representations of the profiles for the generated IG.
These each extend a profile referenced in the data requirements and contain
element declarations for each element associated with that profile. The code handles
adding all of the specific modifications to those elements including:

- a prefix on the short description
- a must support flag
- a suffix on the description with the list of measures that use the element
- extensions around
  - measures that use the element
  - associated value sets.

The key definition in the [`generateFSH.ts`](src/generation/generateFSH.ts) file
is the `generateFSH` function which is the primary entry point for FSH generation.

#### Generate narrative markdown content

The narrative generation step uses the decisions made in the [Identify profile elements](#identify-profile-elements)
step to create narrative content for each profile in markdown format. Specifically, it
creates two markdown files for the profile:

- a intro file (StructureDefinition-[profile id]-intro.md) that includes the list of measures that use
  the profile and the key elements, broken out into elements used by measures and additional interop
  requirements inherited from the parent profile. This gets put at the top of the profile page.
- a notes file (StructureDefinition-[profile id]-notes.md) that includes value set and code details
  as well as a summary table of relevant element details. This gets put at the end of the profile page.

The key definition in the [`generateNarrative.ts`](src/generation/generateNarrative.ts) file
is the `generateMarkdown` function which is the primary entry point for narrative generation.

#### Generate example content

MADFSH contains some basic example association capabilities. If an example directory is provided,
then MADFSH will look for FHIR Bundle files in that directory and include both the Bundles and
the individual resources as examples within the generated IG. It will attempt to associate the
instances with specific measures based on a MeasureReport instance within the Bundle. At this time
the logic for associating and sorting examples is not very sophisticated.

The key definition in the [`generateExamples.ts`](src/generation/generateExamples.ts) file
is the `generateExample` function which is the primary entry point for example generation.

## GitHub Actions Workflows

This repository includes GitHub Actions workflows that replicate the functionality of the GitLab CI/CD pipelines. These workflows are located in the `.github/workflows` directory and are not triggered automatically. To manually run these workflows, use the "workflow_dispatch" trigger in the GitHub Actions interface.

## License

Copyright 2025 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

<http://www.apache.org/licenses/LICENSE-2.0>

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

---

FHIR® is the registered trademark of Health Level Seven International (HL7). Use of the FHIR trademark does not constitute an HL7 endorsement of this software.

## Notice

This (software/technical data) was produced for the U. S. Government under Contract Number 75FCMC18D0047/75FCMC23D0004, and is subject to Federal Acquisition Regulation Clause 52.227-14, Rights in Data-General.

No other use other than that granted to the U. S. Government, or to those acting on behalf of the U. S. Government under that Clause is authorized without the express written permission of The MITRE Corporation.

For further information, please contact The MITRE Corporation, Contracts Management Office, 7515 Colshire Drive, McLean, VA  22102-7539, (703) 983-6000.

(c) 2025 The MITRE Corporation.

---

MITRE: Approved for Public Release; Distribution Unlimited. Public Release Case Number 24-3846
