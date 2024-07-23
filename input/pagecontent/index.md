### Introduction 

#### Purpose

This Measure Set-Based IG is intended to convey the data content and representation requirements for a specific set of quality measures. This IG was created using the MADFSH tool to take as inputs measure bundle files from select FHIR-based electronic clinical quality measures and produce implementation guidance based on measure requirements. 

#### Related FHIR IGs

##### USCDI and US Core 

The [United States Core Data for Interoperability (USCDI)](https://www.healthit.gov/isa/united-states-core-data-interoperability-uscdi) is a standardized set of health data classes and constituent data elements for nationwide, interoperable health information exchange. The current minimum version requirements placed on EHR vendors use [USCDI v1](https://www.healthit.gov/isa/sites/isa/files/2020-10/USCDI-Version-1-July-2020-Errata-Final_0.pdf) and the corresponding [US Core v3.1.1 FHIR Implementation Guide](https://www.hl7.org/fhir/us/core/stu3.1.1/), which includes requirements from USCDI. 

ONC has established the voluntary [Standards Version Advancement Process (SVAP)](https://www.healthit.gov/isa/standards-version-advancement-process) to enable health IT developers’ ability to incorporate newer versions of standards and implementation specifications. USCDI v3 and the corresponding [US Core v6.1.0](https://hl7.org/fhir/us/core/STU6.1/index.html) are approved standards for 2023 under SVAP.  

##### QI-Core 

QI-Core is a HL7 FHIR IG managed by the [Clinical Quality Improvement (CQI) HL7 workgroup](https://www.hl7.org/Special/committees/cqi/index.cfm). Profiles in QI-Core are derived from those in US Core, as QI-Core is intended to be an extension of US Core profiles needed to create a common foundation for quality improvement knowledge artifacts within the US. QI-Core should always inherit new or current data elements that align with US Core to pull needed profiles directly into QI-Core.

The sample measures (CMS2 and CMS69) in this repository utilize QI-Core as the basis for data elements. Current CMS FHIR-based eCQMs are based off [QI-Core v4.1.1](https://hl7.org/fhir/us/qicore/STU4.1.1/), but it is expected that future eCQMs will be based off the most current version of QI-Core. The data requirements utilize QI-Core as the base of the elements needed. 
