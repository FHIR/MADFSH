import { logger } from '../../src/common/logger';
import { RuntimeSettings } from '../../src/config/settings';
import { ElementDetail, ProfileDetail, getRemoteProfile, updateParentProfileUrl, getElementPathWithoutResouceTypePrefix } from '../../src/analysis/elementDetails';
import request from 'sync-request';

// Mock the logger to avoid actual logging during tests
jest.mock('../../src/common/logger');

// Mock the request module to avoid actual HTTP requests
jest.mock('sync-request');

describe('Tests for the ElementDetail class.', () => {
	const mockElementDefinition: Partial<fhir4.ElementDefinition> = {
		id: 'Observation.code',
		path: 'Observation.code',
		mustSupport: true,
		short: 'Code of the observation'
	};
	
	const mockSettings: Partial<RuntimeSettings> = {
		measureExtensionURL: 'http://example.com/measureExtension',
		elementDetailOverrides: new Map(),
	};
	
	beforeEach(() => {
		jest.clearAllMocks();
	});
	
	test('Test isMeasureRequirement method.', () => {
		const elementDetail = new ElementDetail('Observation.code', ['measure1'], mockElementDefinition as fhir4.ElementDefinition, []);
		expect(elementDetail.isMeasureRequirement()).toBe(true);
	});
	
	test('Test isInheritedRequirement method.', () => {
		const elementDetail = new ElementDetail('Observation.code', [], mockElementDefinition as fhir4.ElementDefinition, []);
		expect(elementDetail.isInheritedRequirement()).toBe(true);
	});
	
	test('Test includeInNarrative method.', () => {
		const elementDetail = new ElementDetail('Observation.code', [], mockElementDefinition as fhir4.ElementDefinition, []);
		expect(elementDetail.includeInNarrative()).toBe(false);
	});
	
	test('Test determineDisplayDetails method with unsupported element.', () => {
		const elementDetail = new ElementDetail('Observation.code', [], mockElementDefinition as fhir4.ElementDefinition, []);
		const unsupportedElemDescriptions: string[] = [];
		elementDetail.determineDisplayDetails([], { url: 'http://example.com' } as fhir4.StructureDefinition, mockSettings as RuntimeSettings, {}, unsupportedElemDescriptions);
		expect(unsupportedElemDescriptions).toContain('Observation.code');
	});
	
	test('Test getElementId method.', () => {
		const elementDetail = new ElementDetail('Observation.code', [], mockElementDefinition as fhir4.ElementDefinition, []);
		expect(elementDetail.getElementId()).toBe('Observation.code');
	});
	
	test('Test getNarrativeDetails method.', () => {
		const elementDetail = new ElementDetail('Observation.code', [], mockElementDefinition as fhir4.ElementDefinition, []);
		expect(elementDetail.getNarrativeDetails()).toBeUndefined();
	});
	
	test('Test getMeasureList method.', () => {
		const elementDetail = new ElementDetail('Observation.code', ['measure1'], mockElementDefinition as fhir4.ElementDefinition, []);
		expect(elementDetail.getMeasureList()).toEqual(['measure1']);
	});
	
	test('Test getElementDefinition method.', () => {
		const elementDetail = new ElementDetail('Observation.code', [], mockElementDefinition as fhir4.ElementDefinition, []);
		expect(elementDetail.getElementDefinition()).toEqual(mockElementDefinition);
	});
	
	test('Test getFilters method.', () => {
		const elementDetail = new ElementDetail('Observation.code', [], mockElementDefinition as fhir4.ElementDefinition, []);
		expect(elementDetail.getFilters()).toEqual([]);
	});
});

describe('Tests for the ProfileDetail class.', () => {
	const mockProfileDefinition: Partial<fhir4.StructureDefinition> = {
		url: 'http://example.com/profile',
		name: 'MockProfile',
		snapshot: {
			element: [
				{
					id: 'Observation.code',
					path: 'Observation.code',
					mustSupport: true,
				},
				{
					id: 'Observation.extension',
					path: 'Observation.extension',
					mustSupport: true,
					type: [{ code: 'Extension', profile: ['http://example.com/extension'] }]
				},
			],
		},
	};
	
	const mockSettings: Partial<RuntimeSettings> = {
		measureExtensionURL: 'http://example.com/measureExtension',
		profileURLReplace: new Map(),
		projectName: 'TestProject',
	};
	
	beforeEach(() => {
		jest.clearAllMocks();
	});
	
	test('Test addMustSupportElementsFromParentProfile method.', () => {
		const profileDetail = new ProfileDetail('Observation', 'http://example.com/profile', 'http://example.com/profile', [], mockProfileDefinition as fhir4.StructureDefinition, [], 'TestProject');
		profileDetail.addMustSupportElementsFromParentProfile();
		expect(profileDetail.getElements().size).toBe(2);
	});
	
	test('Test findElementDefinition method with extension.', () => {
		const profileDetail = new ProfileDetail('Observation', 'http://example.com/profile', 'http://example.com/profile', [], mockProfileDefinition as fhir4.StructureDefinition, [], 'TestProject');
		const elementDef = profileDetail.findElementDefinition('Observation.extension(\'http://example.com/extension\')');
		expect(elementDef).toBeDefined();
		expect(elementDef?.id).toBe('Observation.extension');
	});
	
	test('Test elementDetailsDefined method.', () => {
		const profileDetail = new ProfileDetail('Observation', 'http://example.com/profile', 'http://example.com/profile', [], mockProfileDefinition as fhir4.StructureDefinition, [], 'TestProject');
		profileDetail.addMustSupportElementsFromParentProfile(); // Ensure elements are added
		expect(profileDetail.elementDetailsDefined?.('Observation.code')).toBe(true);
		expect(profileDetail.elementDetailsDefined?.('NonExistentElement')).toBe(false);
	});
	
	test('Test getElement method.', () => {
		const profileDetail = new ProfileDetail('Observation', 'http://example.com/profile', 'http://example.com/profile', [], mockProfileDefinition as fhir4.StructureDefinition, [], 'TestProject');
		profileDetail.addMustSupportElementsFromParentProfile(); // Ensure elements are added
		const element = profileDetail.getElement('Observation.code');
		expect(element).toBeDefined();
		expect(element?.getElementId()).toBe('Observation.code');
	});
	
	test('Test addElement method.', () => {
		const profileDetail = new ProfileDetail('Observation', 'http://example.com/profile', 'http://example.com/profile', [], mockProfileDefinition as fhir4.StructureDefinition, [], 'TestProject');
		const newElementDefinition: Partial<fhir4.ElementDefinition> = {
			id: 'Observation.value',
			path: 'Observation.value',
		};
		const newElement = new ElementDetail('Observation.value', [], newElementDefinition as fhir4.ElementDefinition, []);
		profileDetail.addElement('Observation.value', newElement);
		expect(profileDetail.getElement('Observation.value')).toBe(newElement);
	});
	
	test('Test getResourceType method.', () => {
		const profileDetail = new ProfileDetail('Observation', 'http://example.com/profile', 'http://example.com/profile', [], mockProfileDefinition as fhir4.StructureDefinition, [], 'TestProject');
		expect(profileDetail.getResourceType()).toBe('Observation');
	});
	
	test('Test getMeasureList method.', () => {
		const profileDetail = new ProfileDetail('Observation', 'http://example.com/profile', 'http://example.com/profile', [], mockProfileDefinition as fhir4.StructureDefinition, ['measure1'], 'TestProject');
		expect(profileDetail.getMeasureList()).toEqual(['measure1']);
	});
	
	test('Test getPrimaryCodeFiltersElement method.', () => {
		const profileDetail = new ProfileDetail('Observation', 'http://example.com/profile', 'http://example.com/profile', [], mockProfileDefinition as fhir4.StructureDefinition, [], 'TestProject');
		expect(profileDetail.getPrimaryCodeFiltersElement()).toBe('Observation.code');
	});
	
	test('Test getPrimaryCodeFilters and setPrimaryCodeFilters methods.', () => {
		const profileDetail = new ProfileDetail('Observation', 'http://example.com/profile', 'http://example.com/profile', [], mockProfileDefinition as fhir4.StructureDefinition, [], 'TestProject');
		const filters = [{ code: { system: 'http://loinc.org', code: '1234-5' }, measureList: ['measure1'] }];
		profileDetail.setPrimaryCodeFilters(filters);
		expect(profileDetail.getPrimaryCodeFilters()).toEqual(filters);
	});
	
	test('Test getElements method.', () => {
		const profileDetail = new ProfileDetail('Observation', 'http://example.com/profile', 'http://example.com/profile', [], mockProfileDefinition as fhir4.StructureDefinition, [], 'TestProject');
		profileDetail.addMustSupportElementsFromParentProfile(); // Ensure elements are added
		expect(profileDetail.getElements().size).toBe(2);
	});
	
	test('Test getStructureDefId method.', () => {
		const profileDetail = new ProfileDetail('Observation', 'http://example.com/profile', 'http://example.com/profile', [], mockProfileDefinition as fhir4.StructureDefinition, [], 'TestProject');
		expect(profileDetail.getStructureDefId()).toBe('testproject-mockprofile');
	});
	
	test('Test getParentProfileDefinition method.', () => {
		const profileDetail = new ProfileDetail('Observation', 'http://example.com/profile', 'http://example.com/profile', [], mockProfileDefinition as fhir4.StructureDefinition, [], 'TestProject');
		expect(profileDetail.getParentProfileDefinition()).toEqual(mockProfileDefinition);
	});
	
	test('Test identifyElementsForNarrative method.', () => {
		const profileDetail = new ProfileDetail('Observation', 'http://example.com/profile', 'http://example.com/profile', [], mockProfileDefinition as fhir4.StructureDefinition, [], 'TestProject');
		profileDetail.identifyElementsForNarrative(mockSettings as RuntimeSettings, {});
		// No specific assertions, just ensure no errors occur
	});
	
	test('Test identifyElementsForNarrative with unsupported elements.', () => {
		const profileDetail = new ProfileDetail('Observation', 'http://example.com/profile', 'http://example.com/profile', [], mockProfileDefinition as fhir4.StructureDefinition, [], 'TestProject');
		profileDetail.identifyElementsForNarrative(mockSettings as RuntimeSettings, { 'MockProfile': { 'Observation.code': 'Description' } });
		// No specific assertions, just ensure no errors occur
	});
});

describe('Additional tests with alternate ProfileDefinition.', () => {
	const mockProfileDefinition: Partial<fhir4.StructureDefinition> = {
		url: 'http://example.com/profile',
		name: 'MockProfile',
		snapshot: {
			element: [
				{
					id: 'Observation.code',
					path: 'Observation.code',
					mustSupport: true,
				},
			],
		},
	};
	
	const mockSettings: Partial<RuntimeSettings> = {
		measureExtensionURL: 'http://example.com/measureExtension',
		profileURLReplace: new Map(),
		projectName: 'TestProject',
		elementDetailOverrides: new Map(),
	};
	
	test('Test ProfileDetail constructor with ancestorCanonicalUrlList.', () => {
		const ancestorList = ['http://example.com/ancestor1', 'http://example.com/ancestor2'];
		const profileDetail = new ProfileDetail(
			'Observation',
			'http://example.com/profile',
			'http://example.com/profile',
			ancestorList,
			mockProfileDefinition as fhir4.StructureDefinition,
			['measure1'],
			'TestProject'
		);
		expect(profileDetail.getParentProfileUrl()).toBe('http://example.com/profile');
	});
});

describe('Tests for utility functions.', () => {
	const mockSettings: Partial<RuntimeSettings> = {
		profileURLReplace: new Map([['http://example.com/old', 'http://example.com/new']]),
	};
	
	test('Test updateParentProfileUrl function.', () => {
		const updatedUrl = updateParentProfileUrl('http://example.com/old', mockSettings as RuntimeSettings);
		expect(updatedUrl).toBe('http://example.com/new');
	});
	
	test('Test getElementPathWithoutResouceTypePrefix function.', () => {
		const path = getElementPathWithoutResouceTypePrefix('Observation.code', 'Observation');
		expect(path).toBe('code');
	});
	
	test('Test getElementPathWithoutResouceTypePrefix function with no resourceType.', () => {
		const path = getElementPathWithoutResouceTypePrefix('Observation.code');
		expect(path).toBe('code');
	});
	
	test('Test getElementPathWithoutResouceTypePrefix function with mismatched resourceType.', () => {
		const path = getElementPathWithoutResouceTypePrefix('Observation.code', 'Patient');
		expect(path).toBe('Observation.code');
	});
	
	// New test to cover additional scenarios
	test('Test getElementPathWithoutResouceTypePrefix with empty elementPath.', () => {
		const path = getElementPathWithoutResouceTypePrefix('', 'Observation');
		expect(path).toBe('');
	});
	
	test('Test getElementPathWithoutResouceTypePrefix with elementPath not containing a dot.', () => {
		const path = getElementPathWithoutResouceTypePrefix('code', 'Observation');
		expect(path).toBe('code');
	});
});  

describe('Tests for getRemoteProfile function.', () => {
	const mockFHIRDefinitions = {
		fishForFHIR: jest.fn().mockReturnValue(undefined), // Simulate that the profile is not found locally
		resources: {},
		logicals: {},
		profiles: {},
		extensions: {},
	};
	
	const mockSettings: Partial<RuntimeSettings> = {
		fhirDefinitions: mockFHIRDefinitions as any,
		remoteProfile: true,
	};
	
	test('Test getRemoteProfile with remote fetch.', () => {
		(request as jest.Mock).mockReturnValue({
			statusCode: 200,
			getBody: jest.fn().mockReturnValue(JSON.stringify({ url: 'http://example.com/profile' })),
		});
		
		const profile = getRemoteProfile('http://example.com/profile', mockSettings as RuntimeSettings);
		expect(profile.url).toBe('http://example.com/profile');
	});
});
