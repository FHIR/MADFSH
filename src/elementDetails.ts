import { logger } from './logger';
import { DataReqOutputs } from './aggregate';
import { RuntimeSettings, ValueSetDetails, CodeDetails } from './settings';
import axios from 'axios';
import request from 'sync-request';
import { StructureDefinition } from 'fhir/r4';

// Map from FHIR ResourceTypes to the key filter element for each
// The assumption is that when these ResourceTypes are used
// in measures, they ALWAYS appear with a value set that filters
// considered instances down to those with a code from the target
// value set in the key filter element
// This map is used in several places
// 1. During aggregation to check that each use of these resource types
//    comes with a filter on the mapped element. If not, that breaks an
//    assumption of the IG generation and needs to be checked (override
//    handling may need to be added)
// 2. During markdown generation, the value set section will only contain
//    filter information from the corresponding element for the resource type
// 3. During FSH generation, associatedWithValueSet extensions will only be
//    added to the corresponding element for the resource type
export const KeyFilterElementForResourceType: Map<string, string> = new Map([
    ['Condition', 'Condition.code'],
    ['Encounter', 'Encounter.type'],
    ['Observation', 'Observation.code'],
    ['Procedure', 'Procedure.code'],
    ['MedicationRequest', 'MedicationRequest.medication[x]'],
    ['MedicationAdministration', 'MedicationAdministration.medication[x]'],
    ['ServiceRequest', 'ServiceRequest.code'],
    ['Coverage', 'Coverage.type'],
    ['AllergyIntolerance', 'AllergyIntolerance.code'],
    ['DeviceRequest', 'DeviceRequest.code'],
    ['Task', 'Task.code'],
    ['AdverseEvent', 'AdverseEvent.event'],
    ['Communication', 'Communication.reasonCode'], // this may not be right, but it fits the example of CMS142
    ['Immunization', 'Immunization.vaccineCode'],
    ['MedicationDispense', 'MedicationDispense.medication[x]']
]);

// List of FHIR ResourceTypes that don't have coded elements that define
// their identity and so shouldn't be expected to be associated with a filter
// when they are used in a measure. If a ResourceType is not in this map or
// in the KeyFilterElementForResourceType map, then an error is logged so that
// a determination can be made so that the tool knows what to do (Eventually all
// ResourceTypes will appear in one map or the other).
export const ResourceTypesWithoutKeyFilterElements: Map<string, boolean> = new Map([
    ['Patient', true], // not identified by codes
    ['Medication', true], // never referenced directly by measure with filters, only via MedicationRequest or similar
    ['Location', true] // type not relevant for quality measures
]);

export type NarrativeDisplay = {
    displayString: string;
    narrativeDescription: string;
};

export type CodeOrValueSetFilter = {
    code?: fhir4.Coding;
    valueSet?: string;
    measureList: string[];
};

export class ElementDetail {
    private elementDefinition: fhir4.ElementDefinition;
    private narrativeDisplay?: NarrativeDisplay;
    private measureList: string[];
    private filters: CodeOrValueSetFilter[];
    private readonly elementId: string;

    public isMeasureRequirement() {
        return this.measureList && this.measureList.length > 0;
    }

    public isInheritedRequirement() {
        return !this.isMeasureRequirement() && this.elementDefinition.mustSupport;
    }

    public includeInNarrative() {
        return this.narrativeDisplay != undefined;
    }

    public getElementId() {
        return this.elementId;
    }

    public getNarrativeDetails() {
        return this.narrativeDisplay;
    }

    public getMeasureList() {
        return this.measureList;
    }

    public getElementDefinition(): fhir4.ElementDefinition {
        return this.elementDefinition;
    }

    public getFilters() {
        return this.filters;
    }

    public constructor(
        elementId: string,
        measureList: string[],
        elementDefinition: fhir4.ElementDefinition,
        filters: CodeOrValueSetFilter[]
    ) {
        this.elementId = elementId;
        this.measureList = measureList;
        this.elementDefinition = elementDefinition;
        this.filters = filters;
    }

    public determineDisplayDetails(
        ancestorCanonicalUrlList: string[],
        parentProfileDefinition: fhir4.StructureDefinition,
        settings: RuntimeSettings,
        narrativeDescriptions: Record<string, Record<string, string>>,
        unsupportedElemDescriptions: string[]
    ) {
        /// only consider elements that are must support due to inheritance or use in the measure
        if (!this.isMeasureRequirement() && !this.elementDefinition.mustSupport) {
            return;
        }

        const parentProfileCanonicalUrl = parentProfileDefinition.url;
        const parentProfileKey = parentProfileCanonicalUrl.split('/').pop() ?? '';

        // decide if this element will be included in narrative displays like
        // the elements section or the summary table (does not impact whether
        // the must support flag is indicated on the element)
        // Current default logic: only elements at the base level (not nested)
        // Override: Settings configuration - TODO
        const overrideKey = `${parentProfileKey}|${this.elementId}`;
        const tokenizedId = this.elementId.split('.');
        if (settings.elementDetailOverrides.has(overrideKey)) {
            if (!settings.elementDetailOverrides.get(overrideKey)!.includeInNarrative) {
                // configured to not appear
                return;
            }
            // else configured to appear
        } else if (tokenizedId.length > 2) {
            logger.warn(
                `Nested ${
                    this.isMeasureRequirement() ? 'measure' : 'inherited'
                } must support element ${
                    this.elementId
                } from parent ${parentProfileKey} not included in narrative list`
            );
            return;
        }

        let elementKey = this.elementId;
        if (elementKey.endsWith('[x]')) {
            elementKey = elementKey.substring(0, elementKey.length - 3);
        }
        let description = findConfiguredNarrativeDescription(
            narrativeDescriptions,
            ancestorCanonicalUrlList,
            elementKey
        );

        if (!description) {
            unsupportedElemDescriptions.push(elementKey);
            // determine default short display
            let short = this.elementDefinition.short || '';
            if (short === 'Extension') {
                // attempt to find url associated with extension
                const extensionField = parentProfileDefinition.snapshot?.element.find(
                    r => r.id?.includes(`${this.elementId}:`) && r.mustSupport
                );
                if (extensionField) {
                    const url = extensionField.type?.[0].profile?.[0];
                    if (url) {
                        short += ` (Extension url: ${url})`;
                    }
                }
            }
            if (short == '') short = '(short not found)';
            description = short;
        }
        this.narrativeDisplay = {
            displayString: getElementPathWithoutResouceTypePrefix(this.elementId),
            narrativeDescription: description
        };
    }
}

function findConfiguredNarrativeDescription(
    narrativeDescriptions: Record<string, Record<string, string>>,
    ancestorProfileList: string[],
    elementKey: string
): string | undefined {
    return ancestorProfileList.reduce((foundDescription: string | undefined, nextAncestor) => {
        if (foundDescription) {
            return foundDescription;
        } else {
            const nextAncestorKey = nextAncestor.split('/').pop() ?? '';
            return narrativeDescriptions[nextAncestorKey]?.[elementKey];
        }
    }, undefined);
}

export class ProfileDetail {
    private readonly parentProfileUrl: string;
    private readonly fetchedProfileUrl: string;
    private readonly ancestorCanonicalUrlList: string[];
    private readonly resourceType: string;
    private readonly parentProfileDefinition: fhir4.StructureDefinition;
    private readonly parentProfileElementMap: Map<string, fhir4.ElementDefinition>;
    private primaryCodeFilters: CodeOrValueSetFilter[];
    private readonly measureList: string[];
    private readonly structureDefId: string;
    private elements: Map<string, ElementDetail>;

    public getParentProfileUrl() {
        return this.parentProfileUrl;
    }

    public elementDetailsDefined?(elementId: string): boolean {
        return this.elements.has(elementId);
    }

    public getElement(elementId: string): ElementDetail | undefined {
        return this.elements.get(elementId);
    }

    public addElement(elementId: string, elementDetail: ElementDetail) {
        this.elements.set(elementId, elementDetail);
    }

    public getResourceType(): string {
        return this.resourceType;
    }

    public getMeasureList(): string[] {
        return this.measureList;
    }

    public getPrimaryCodeFiltersElement(): string | undefined {
        return KeyFilterElementForResourceType.get(this.resourceType);
    }

    public getPrimaryCodeFilters(): CodeOrValueSetFilter[] {
        return this.primaryCodeFilters;
    }

    public setPrimaryCodeFilters(primaryCodeFilters: CodeOrValueSetFilter[]): void {
        this.primaryCodeFilters = primaryCodeFilters;
    }

    public getElements(): Map<string, ElementDetail> {
        return this.elements;
    }

    public getStructureDefId(): string {
        return this.structureDefId;
    }

    public getParentProfileDefinition(): fhir4.StructureDefinition {
        return this.parentProfileDefinition;
    }

    public constructor(
        resourceType: string,
        originalParentProfileUrl: string,
        fetchedProfileUrl: string,
        ancestorCanonicalUrlList: string[],
        parentProfileDefinition: fhir4.StructureDefinition,
        measureList: string[],
        projectName: string
    ) {
        this.elements = new Map<string, ElementDetail>();
        this.resourceType = resourceType;
        this.parentProfileUrl = originalParentProfileUrl;
        this.fetchedProfileUrl = fetchedProfileUrl;
        this.ancestorCanonicalUrlList = ancestorCanonicalUrlList;
        this.parentProfileDefinition = parentProfileDefinition;
        this.parentProfileElementMap = getProfileElementMap(parentProfileDefinition);
        this.primaryCodeFilters = [];
        this.measureList = measureList;
        this.structureDefId =
            projectName.toLowerCase() + '-' + parentProfileDefinition.name.toLowerCase();
    }

    public addMustSupportElementsFromParentProfile() {
        this.parentProfileDefinition?.snapshot?.element.forEach(elem => {
            if (elem.mustSupport && elem.id && !this.elements.has(elem.id)) {
                this.elements.set(elem.id, new ElementDetail(elem.id, [], elem, []));
            }
        });
    }

    public findElementDefinition(elementPath: string): fhir4.ElementDefinition | undefined {
        let elementId = elementPath;
        if (!elementPath.startsWith(`${this.resourceType}.`)) {
            elementId = `${this.resourceType}.${elementPath}`;
        }

        if (elementId.includes('.extension(')) {
            return this.resolveExtensionDefinition(elementId);
        }

        if (this.parentProfileElementMap.has(elementId)) {
            return this.parentProfileElementMap.get(elementId);
        } else if (this.parentProfileElementMap.has(`${elementId}[x]`)) {
            return this.parentProfileElementMap.get(`${elementId}[x]`);
        } else {
            return undefined;
        }
    }

    private resolveExtensionDefinition(elementId: string): fhir4.ElementDefinition | undefined {
        const extensionSplit = elementId.split('.extension(');
        if (extensionSplit.length > 2) {
            logger.error(`nested extension definition - add support!: ${elementId}`);
            return undefined;
        }
        const base = extensionSplit.at(0);
        const startsWithExtUrl = extensionSplit.at(1)!; //precondition: elementId.includes(".extension(")
        const firstChar = startsWithExtUrl.charAt(0);
        if (firstChar != "'" && firstChar != '"') {
            logger.error(
                `bad extension expression in path - no quote containing the URL: ${elementId}`
            );
            return undefined;
        }
        const endQuotePosition = startsWithExtUrl.indexOf(firstChar, 1);
        const extensionUrl = startsWithExtUrl.substring(1, endQuotePosition);
        const rest = startsWithExtUrl.substring(endQuotePosition + 3); // remove ').
        const targetPath = `${base}.extension`;

        const extensionSliceDef = this.getElementDefForExtension(targetPath, extensionUrl);

        if (!extensionSliceDef) {
            return undefined;
        } else if (rest.length > 0) {
            logger.error(`sub elements of an extension - add support! ${elementId}`);
            /* need to handle FSH generation - how to get the extension url in that case - is it on the element def?
            const realTargetId = `${extensionSliceDef.id!}.${rest}`;
            return this.parentProfileElementMap.has(realTargetId)
                ? this.parentProfileElementMap.get(realTargetId)
                : undefined;*/
        } else {
            return extensionSliceDef;
        }
    }

    private getElementDefForExtension(
        targetPath: string,
        extensionUrl: string
    ): fhir4.ElementDefinition | undefined {
        let definitionToReturn = undefined;
        this.parentProfileElementMap.forEach(oneElement => {
            if (
                targetPath === oneElement.path &&
                oneElement.type?.some(
                    aType => aType.code === 'Extension' && aType.profile?.at(0) === extensionUrl
                )
            ) {
                definitionToReturn = oneElement;
            }
        });
        return definitionToReturn;
    }

    public identifyElementsForNarrative(
        settings: RuntimeSettings,
        narrativeDescriptions: Record<string, Record<string, string>>
    ) {
        const unsupportedElemDescriptions: string[] = [];
        const profileKey = this.ancestorCanonicalUrlList.at(0) ?? this.parentProfileDefinition.url;

        this.elements.forEach(element =>
            element.determineDisplayDetails(
                this.ancestorCanonicalUrlList,
                this.parentProfileDefinition,
                settings,
                narrativeDescriptions,
                unsupportedElemDescriptions
            )
        );

        if (unsupportedElemDescriptions.length > 0) {
            // remove duplicate elements and log all of them, separated by commas
            logger.warn(
                `The following elements for profile ${profileKey} are not supported in narrative description mapping: ${[
                    ...new Set(unsupportedElemDescriptions)
                ].join(', ')}. Will resort to short description for each element.`
            );
        }
    }

    public getMeasureElementsForNarrative(): NarrativeDisplay[] {
        const narrativeElementList: NarrativeDisplay[] = [];
        this.elements.forEach(elementDetail => {
            if (elementDetail.includeInNarrative() && elementDetail.isMeasureRequirement()) {
                narrativeElementList.push(elementDetail.getNarrativeDetails()!);
            }
        });
        return narrativeElementList;
    }

    public getInheritedElementsForNarrative(): NarrativeDisplay[] {
        const narrativeElementList: NarrativeDisplay[] = [];
        this.elements.forEach(elementDetail => {
            if (elementDetail.includeInNarrative() && elementDetail.isInheritedRequirement()) {
                narrativeElementList.push(elementDetail.getNarrativeDetails()!);
            }
        });
        return narrativeElementList;
    }

    public getAllElementsForNarrative(): NarrativeDisplay[] {
        const narrativeElementList: NarrativeDisplay[] = [];
        this.elements.forEach(elementDetail => {
            if (elementDetail.includeInNarrative()) {
                narrativeElementList.push(elementDetail.getNarrativeDetails()!);
            }
        });
        return narrativeElementList;
    }
}

export function updateParentProfileUrl(parentProfileUrl: string, settings: RuntimeSettings) {
    let urlToReturn = parentProfileUrl;

    // Handle unresolvable profile URLs, including
    // 1. some US Core observation profiles
    // 2. QI-Core 4 profiles that changed in QI-Core 6
    if (settings.profileURLReplace.has(urlToReturn)) {
        urlToReturn = settings.profileURLReplace.get(urlToReturn)!;
    }

    if (urlToReturn.includes('http://hl7.org/fhir/')) {
        if (urlToReturn.split('/').length == 5) urlToReturn += '.profile.json';
    }

    return urlToReturn;
}

export async function prepareElementDetails(
    dataReqs: DataReqOutputs[],
    settings: RuntimeSettings,
    narrativeDescriptionsPath: string
) {
    // this function will go through the profiles and elements in the data requirments
    // extracted from the in-scope measures and collect and determine relevant details
    // that will be added to each profile, both narrative and FSH

    // 1. convert measure data requirements
    const profileDetails = await dataReqsToProfileDetail(dataReqs, settings);

    // 2. add parent interop requirements
    profileDetails.forEach(profileDetail =>
        profileDetail.addMustSupportElementsFromParentProfile()
    );

    logger.info('');
    logger.info('*******************************************************');
    logger.info('Identifying Narrative Elements');
    logger.info('*******************************************************');
    logger.info('');

    // 3. determine if part of the narrtive list, and if so add narrative descriptions and display details
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const narrativeDescriptions = require(narrativeDescriptionsPath) as Record<
        string,
        Record<string, string>
    >;
    profileDetails.forEach(profileDetail => {
        logger.info('');
        logger.info(
            `** Identifying narrative elements for profile of ${profileDetail.getParentProfileUrl()}`
        );
        profileDetail.identifyElementsForNarrative(settings, narrativeDescriptions);
    });

    logger.info('profile count: ' + profileDetails.length);

    return profileDetails;
}

async function dataReqsToProfileDetail(dataReqs: DataReqOutputs[], settings: RuntimeSettings) {
    const profileList: ProfileDetail[] = [];

    dataReqs.forEach(dataReq => {
        logger.info('');
        logger.info(`**** Profile of ${dataReq.type} extending ${dataReq.profile}`);

        if (dataReq.mustSupport && dataReq.mustSupport.length == 0) {
            logger.warn(
                'No MustSupport element found: Skipping creating profile for ' + dataReq.type
            );
        } else {
            try {
                const fetchedParentProfileUrl = updateParentProfileUrl(dataReq.profile, settings);
                const parentProfileDefinition = getRemoteProfile(fetchedParentProfileUrl, settings);
                const ancestorCanonicalUrlList = getAncestorList(parentProfileDefinition, settings);
                const profileDetails = new ProfileDetail(
                    dataReq.type,
                    dataReq.profile,
                    fetchedParentProfileUrl,
                    ancestorCanonicalUrlList,
                    parentProfileDefinition,
                    measureStringListFromExtensionList(dataReq.extension, settings),
                    settings.projectName
                );
                dataReq.mustSupport?.forEach((element, elementIndex) => {
                    const measureList: string[] = measureStringListFromExtensionList(
                        dataReq._mustSupport.at(elementIndex)?.extension,
                        settings
                    );
                    const elementDefinition = profileDetails.findElementDefinition(element);
                    if (elementDefinition) {
                        // find code filters that apply to this element
                        const filters: CodeOrValueSetFilter[] = [];
                        dataReq.codeFilter.forEach(oneCodeFilter => {
                            if (oneCodeFilter.path === element) {
                                if (oneCodeFilter.code || oneCodeFilter.valueSet) {
                                    if (oneCodeFilter.code && oneCodeFilter.code.length > 1) {
                                        logger.warn(
                                            `code filter on element ${element} has multiple codes, only the first one used`
                                        );
                                    }
                                    if (oneCodeFilter.code && oneCodeFilter.valueSet) {
                                        logger.warn(
                                            `filter on element ${element} has both codes and a value set, only the value set used`
                                        );
                                        oneCodeFilter.code = undefined;
                                    }

                                    filters.push({
                                        code: oneCodeFilter.code?.at(0),
                                        valueSet: oneCodeFilter.valueSet,
                                        measureList: measureStringListFromExtensionList(
                                            oneCodeFilter.extension,
                                            settings
                                        )
                                    });
                                } else {
                                    logger.warn(
                                        `filter on element ${element} has no code or value set, skipping`
                                    );
                                }
                            }
                        });

                        profileDetails.addElement(
                            elementDefinition.id!,
                            new ElementDetail(
                                elementDefinition.id!,
                                measureList,
                                elementDefinition,
                                filters
                            )
                        );

                        /// primary code filters for this resource type
                        if (
                            KeyFilterElementForResourceType.get(
                                profileDetails.getResourceType()
                            ) === elementDefinition.id!
                        ) {
                            profileDetails.setPrimaryCodeFilters(filters);
                        }
                    } else {
                        logger.error(
                            `measure-used element ${element} not found in parent profile ${dataReq.profile} (fetched from ${fetchedParentProfileUrl})`
                        );
                    }
                });
                profileList.push(profileDetails);
                logger.info('successfully converted ' + dataReq.profile + ' to internal structure');
            } catch (e) {
                logger.error(
                    'failed to convert parent profile ' +
                        dataReq.profile +
                        ' to internal structure: ' +
                        (e as Error).message
                );
            }
        }
    });

    return profileList;
}

function getProfileElementMap(profile: fhir4.StructureDefinition) {
    const elementMap: Map<string, fhir4.ElementDefinition> = new Map();
    profile.snapshot?.element.forEach(element => elementMap.set(element.id!, element));
    return elementMap;
}

function measureStringListFromExtensionList(
    extensions: fhir4.Extension[] | undefined,
    settings: RuntimeSettings
) {
    return (
        extensions
            ?.filter(ext => ext.url === settings.measureExtensionURL)
            .map(ext => ext.valueString ?? '') ?? []
    ).filter(measureString => measureString.length > 0);
}

export function getElementPathWithoutResouceTypePrefix(
    elementPath: string,
    resourceType?: string
): string {
    if (resourceType) {
        if (elementPath.startsWith(`${resourceType}.`)) {
            // string off <resourceType>.
            return elementPath.substring(resourceType.length + 1);
        } else {
            // prefix not there, return the original
            return elementPath;
        }
    } else {
        // string off the first . and everything before it
        return elementPath.substring(elementPath.indexOf('.') + 1);
    }
}

export async function fetchValueSetAndCodeDetails(
    dataReqs: DataReqOutputs[],
    settings: RuntimeSettings
) {
    const [valueSets, codes] = getValueSetsAndCodesToFetch(dataReqs);

    await fetchValueSetDetails(valueSets, settings);
    await fetchCodeDetails(codes, settings);
}

async function fetchValueSetDetails(valueSets: string[], settings: RuntimeSettings) {
    logger.info('fetching value set details');
    const valueSetDetails = new Map<string, ValueSetDetails>();

    await Promise.all(
        valueSets.map(
            async (valueSet: string) =>
                await fetchOneValueSetDetail(valueSet, valueSetDetails, settings)
        )
    );

    // Now includes fetched value sets, configured ones, and anything else in there
    settings.valueSetDetails = valueSetDetails;
}

async function fetchOneValueSetDetail(
    valueSet: string,
    valueSetDetails: Map<string, ValueSetDetails>,
    settings: RuntimeSettings,
    retryList?: string[]
) {
    if (valueSetDetails.has(valueSet)) {
        logger.warn('duplicate details for value set ' + valueSet);
    } else {
        let details: ValueSetDetails | undefined;
        try {
            if (settings.valueSetDetails.has(valueSet)) {
                details = settings.valueSetDetails.get(valueSet);
            } else if (valueSet.includes('cts.nlm.nih.gov/fhir')) {
                if (settings.nlmApiKey) {
                    const authHeader = `Basic ${Buffer.from(
                        `apikey:${settings.nlmApiKey}`
                    ).toString('base64')}`;
                    const fetchedDetails = await axios.get<fhir4.ValueSet>(valueSet, {
                        headers: {
                            Accept: 'application/fhir+json',
                            Authorization: authHeader
                        },
                        // Timeout is in ms, not seconds
                        timeout: 60_000,
                        withCredentials: true
                    });
                    const valueSetDef = fetchedDetails.data;
                    const oid = valueSetDef.identifier?.at(0)?.value;
                    const webLinkUrl = oid
                        ? `https://vsac.nlm.nih.gov/valueset/${oid.replace(
                              'urn:oid:',
                              ''
                          )}/expansion`
                        : undefined;
                    details = {
                        url: valueSet,
                        name: valueSetDef.title ?? valueSetDef.name ?? valueSet,
                        id: oid,
                        webLinkUrl: webLinkUrl
                    };
                    logger.info(
                        'fetched ' + valueSet + ': name= ' + details.name ??
                            '' + ', id= ' + details.id ??
                            ''
                    );
                } else {
                    logger.warn(
                        'failed to fetch value set details: ' + valueSet + ' - no vsac credentials'
                    );
                    details = { url: valueSet };
                }
            }
        } catch (error) {
            const warnText = 'failed to fetch value set details: ' + valueSet + ' - ' + error;
            logger.warn(warnText);
            if (warnText.includes('timeout') && retryList) {
                retryList.push(valueSet);
            }
        }

        if (!details && !retryList) {
            logger.warn('no details available for value set: ' + valueSet);
            details = { url: valueSet };
        }

        if (details) {
            valueSetDetails.set(valueSet, details);
        }
    }
}

async function fetchCodeDetails(codes: string[], settings: RuntimeSettings) {
    logger.info('fetching code details');
    const codeDetails = new Map<string, CodeDetails>();
    await Promise.all(
        codes.map(
            async (oneCode: string) => await fetchOneCodeDetail(oneCode, codeDetails, settings)
        )
    );

    settings.codeDetails = codeDetails;
}

async function fetchOneCodeDetail(
    oneCode: string,
    codeDetails: Map<string, CodeDetails>,
    settings: RuntimeSettings
) {
    if (codeDetails.has(oneCode)) {
        logger.warn('duplicate details for code ' + oneCode);
    } else {
        let details: CodeDetails | undefined;
        const [system, code] = oneCode.split('|');
        if (settings.codeDetails.has(oneCode)) {
            details = settings.codeDetails.get(oneCode);
        } else if (system === 'http://loinc.org') {
            details = await fetchLoincCodeDetail(code, settings);
        } else if (system === 'http://snomed.info/sct') {
            details = await fetchSnomedCodeDetail(code);
        }

        if (!details) {
            logger.warn('no details available for code: ' + oneCode);
            details = { code: code, system: system };
        }

        codeDetails.set(oneCode, details);
    }
}

async function fetchSnomedCodeDetail(code: string) {
    //const fetchUrl = `https://snomednz.digital.health.nz/fhir/CodeSystem/$lookup?system=http://snomed.info/sct&code=${code}`;
    const fetchUrl = `https://tx.fhir.org/r4/CodeSystem/$lookup?system=http://snomed.info/sct&code=${code}`;
    try {
        const fetchedDetails = await axios.get<fhir4.Parameters>(fetchUrl, {
            headers: {
                Accept: 'application/fhir+json'
            },
            // Timeout is in ms, not seconds
            timeout: 60_000,
            withCredentials: true
        });
        const codeDefinitionParameters = fetchedDetails.data;
        const displayParameter = codeDefinitionParameters.parameter?.find(
            aParameter => aParameter.name === 'display'
        );
        logger.info(
            'fetched snomed code ' + code + ': display= ' + displayParameter?.valueString ?? ''
        );
        return {
            code: code,
            system: 'http://snomed.info/sct',
            display: displayParameter?.valueString,
            webLinkUrl: `http://snomed.info/sct/${code}`
        };
    } catch (error) {
        logger.warn(
            `failed to fetch code details: http://snomed.info/sct|${code} from ${fetchUrl} - ${error}`
        );
        return {
            code: code,
            system: 'http://snomed.info/sct',
            webLinkUrl: `http://snomed.info/sct/${code}`
        };
    }
}

async function fetchLoincCodeDetail(code: string, settings: RuntimeSettings) {
    if (settings.loincCredentials) {
        const fetchUrl = `https://fhir.loinc.org/CodeSystem/$lookup?system=http://loinc.org&code=${code}`;
        try {
            const authHeader = `Basic ${Buffer.from(
                `${settings.loincCredentials.username}:${settings.loincCredentials.password}`
            ).toString('base64')}`;
            const fetchedDetails = await axios.get<fhir4.Parameters>(fetchUrl, {
                headers: {
                    Accept: 'application/fhir+json',
                    Authorization: authHeader
                },
                // Timeout is in ms, not seconds
                timeout: 60_000,
                withCredentials: true
            });
            const codeDefinitionParameters = fetchedDetails.data;
            const displayParameter = codeDefinitionParameters.parameter?.find(
                aParameter => aParameter.name === 'display'
            );
            logger.info(
                'fetched loinc code ' + code + ': display= ' + displayParameter?.valueString ?? ''
            );
            return {
                code: code,
                system: 'http://loinc.org',
                display: displayParameter?.valueString,
                webLinkUrl: `http://loinc.org/${code}`
            };
        } catch (error) {
            logger.warn(
                `failed to fetch code details: http://loinc.org|${code} from ${fetchUrl} - ${error}`
            );
            return {
                code: code,
                system: 'http://loinc.org',
                webLinkUrl: `http://loinc.org/${code}`
            };
        }
    } else {
        // can't get description, but can provide a link
        logger.warn('no LOINC credentials for fetching code details: http://loinc.org|' + code);
        return {
            code: code,
            system: 'http://loinc.org',
            webLinkUrl: `http://loinc.org/${code}`
        };
    }
}

function getValueSetsAndCodesToFetch(dataReqs: DataReqOutputs[]): [string[], string[]] {
    const valueSets: string[] = [];
    const codes: string[] = [];

    dataReqs.forEach(dataReq => {
        dataReq.codeFilter.forEach(codeFilter => {
            if (codeFilter.valueSet && !valueSets.includes(codeFilter.valueSet)) {
                valueSets.push(codeFilter.valueSet);
            }
            codeFilter.code?.forEach(oneCoding => {
                if (
                    oneCoding.code &&
                    oneCoding.system &&
                    !codes.includes(`${oneCoding.system}|${oneCoding.code}`)
                ) {
                    codes.push(`${oneCoding.system}|${oneCoding.code}`);
                }
            });
        });
    });

    return [valueSets, codes];
}

function getAncestorList(
    ancestorProfileDefinition: StructureDefinition,
    settings: RuntimeSettings,
    currentList?: string[]
): string[] {
    // establish current list
    let ancestorList: string[] = [];
    if (currentList) {
        ancestorList = currentList;
    }

    // add this one
    ancestorList.push(ancestorProfileDefinition.url);

    if (ancestorProfileDefinition.baseDefinition) {
        // recurse
        let nextAncestor: StructureDefinition | undefined = undefined;
        try {
            nextAncestor = getRemoteProfile(ancestorProfileDefinition.baseDefinition, settings);
        } catch {
            logger.warn(
                `ancestor profile fetch failed for ${ancestorProfileDefinition.baseDefinition} - narrative descriptions may be impacted`
            );
        }

        if (nextAncestor) {
            return getAncestorList(nextAncestor, settings, ancestorList);
        } else {
            return ancestorList;
        }
    } else {
        // base case
        return ancestorList;
    }
}

export function getRemoteProfile(
    profileUrl: string,
    settings: RuntimeSettings
): fhir4.StructureDefinition {
    const fetchUrl = profileUrl;
    let profileDef = undefined;

    // try the loaded dependencies
    if (settings.fhirDefinitions) {
        profileDef = settings.fhirDefinitions.fishForFHIR(profileUrl);
    }

    if (profileDef) {
        logger.info('Successfully extracted profile ' + profileUrl + ' from dependecies');
        return profileDef as fhir4.StructureDefinition;
    } else if (settings.remoteProfile) {
        logger.warn(
            'Profile not found using package loader - check dependencies. Using direct fetch.'
        );
        try {
            const res = request('GET', fetchUrl, {
                headers: {
                    'user-agent': 'example-user-agent',
                    'Content-type': 'application/json',
                    Accept: 'application/json'
                }
            });

            if (res.statusCode === 200) {
                logger.info('Successfully extracted profile ' + profileUrl + ' from ' + fetchUrl);
                return JSON.parse(res.getBody('utf8'));
            } else {
                logger.warn('Failed to extract profile: ' + profileUrl);
            }
        } catch (e) {
            logger.warn((e as Error).message);
        }
    } else {
        // todo - implement me
        logger.warn('local profiles not implemented: ' + profileUrl);
    }
    throw new Error('Failed to get parent profile');
}
