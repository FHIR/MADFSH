### Package File

The following package file includes an NPM package file used by many of the FHIR tools. It contains all the value sets, profiles, extensions, list of pages and URLs in the IG, etc., defined as part of this version of the Implementation Guides. This file should be the first choice whenever generating any implementation artifacts since it contains all the rules about what makes the profiles valid. Implementers will still need to be familiar with the specification content and profiles that apply to make a conformant implementation. For more information, see the validating profiles and resources documentation in FHIR.

* [Package (compressed folder)](package.tgz)
* [JSON Definitions (compressed folder)](definitions.json.zip)
* [XML Definitions (compressed folder)](definitions.xml.zip)

A downloadable version of this IG is available so it can be hosted locally:

* [Downloadable Copy(compressed folder)](full-ig.zip)

### Data Dictionary

Non-technical users of this IG interested in a spreadsheet view of the
ata structures and terminologies defined in this IG can use this [data dictionary](data-dictionary-empty.xlsx) view.

Created using an extension of the open-source 
[IG Summary](https://github.com/mitre/ig-summary) tool, 
the data dictionary contains an additional "Used By Measure"
column on the *Data elements* tab that indicates which elements are used
in measure calculation. 

To provide a simpler non-technical view, some details present in the formal
FHIR definitions are not present in the data dictionary. Thus, the FHIR
definitions SHALL be treated as the source of truth when discrepancies are
identified and the following caveats should be kept in mind when using the
data dictionary view:
- Only must-support (MS) data elements are included. Since all elements
  used by measures are flagged as MS, they all qualify 
- Sub-elements of complex types are not explicitly included. If these
  elements are explicitly flagged as used by a measures, they will not appear in the data dictionary. However, they are generally a lower level
  of detail than appears in the list of elements used by a measure.