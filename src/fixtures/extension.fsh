Extension: UsedByMeasure
Id:        used-by-measure
Title:     "Used by quality measure" 
Description: "Information about how an element used by quality measure. This extension can be used by any FHIR resources and elements" 
* value[x] only string

Extension: AssociatedWithValueSet 
Id:        associated-with-valueset 
Title:     "Associated With Value Set" 
Description: "Information about how an element associated with value sets. This extension can be used by any FHIR resources and elements" 
* extension contains 
    valueSetTarget 0..* MS and
    UsedByMeasure 0..* MS and
    codeTarget 0..* MS
* extension[valueSetTarget].value[x] only string
* extension[codeTarget].value[x] only Coding

Extension: ProgramName
Id:        program-name
Title:     "Program Name" 
Description: "Name of the quality measurement program that the IG relates to. This extension is intended to be used on ImplementationGuide instances." 
* value[x] only string

