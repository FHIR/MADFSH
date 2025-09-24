import { generateMarkdown } from '../../src/generation/generateNarrative';
import { logger } from '../../src/common/logger';
import { RuntimeSettings } from '../../src/config/settings';
import { ProfileDetail, ElementDetail } from '../../src/analysis/elementDetails';

// Mock the logger to avoid actual logging during tests
jest.mock('../../src/common/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the util module
jest.mock('../../src/common/util', () => ({
  getMeasureListString: jest.fn().mockReturnValue('Measure1'),
}));

describe('generateNarrative', () => {
  let mockElementDetail: ElementDetail;
  let mockProfileDetail: ProfileDetail;
  let mockSettings: RuntimeSettings;

  beforeEach(() => {
    mockElementDetail = {
      isMeasureRequirement: jest.fn().mockReturnValue(true),
      getElementId: jest.fn().mockReturnValue('ResourceType.elementId'),
      getElementDefinition: jest.fn().mockReturnValue({
        path: 'ResourceType.elementId',
        short: 'short description',
        comment: 'element comment',
        type: [{ profile: ['http://example.com'] }]
      }) as jest.Mock,
      getMeasureList: jest.fn().mockReturnValue(['Measure1']),
      getFilters: jest.fn().mockReturnValue([]) as jest.Mock,
    } as unknown as ElementDetail;

    mockProfileDetail = {
      getParentProfileUrl: jest.fn().mockReturnValue('http://example.com/Profile'),
      getMeasureList: jest.fn().mockReturnValue(['Measure1']),
      getMeasureElementsForNarrative: jest.fn().mockReturnValue([]),
      getInheritedElementsForNarrative: jest.fn().mockReturnValue([]),
      getStructureDefId: jest.fn().mockReturnValue('structureDefId'),
      getPrimaryCodeFilters: jest.fn().mockReturnValue([{ code: null, valueSet: 'http://example.com/ValueSet' }]),
      getPrimaryCodeFiltersElement: jest.fn().mockReturnValue('ResourceType.elementId'),
      getElements: jest.fn().mockReturnValue([]),
    } as unknown as ProfileDetail;

    // Mock measureLink as a Map with fewer elements
    const mockMeasureLink = new Map();
    mockMeasureLink.set('Measure1', { name: 'Measure 1', identifier: [] });

    mockSettings = {
      projectName: 'TestProject',
      projectMarkdownNameAndLink: 'TestProjectLink',
      measureLink: mockMeasureLink,
      valueSetDetails: new Map([
        ['http://example.com/ValueSet', { name: 'Example ValueSet', id: 'ValueSetId', webLinkUrl: 'http://example.com/ValueSet' }]
      ]),
      codeDetails: new Map(),
    } as RuntimeSettings;
  });

  test('Test primary functionality - generation of narrative for given profiles.', () => {
    const result = generateMarkdown([mockProfileDetail], mockSettings);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('structureDefId-intro');
    expect(result[0].markdownContents).toContain('### Measures Using this Profile');
    expect(result[0].markdownContents).toContain('Measure1');
    expect(result[1].name).toBe('structureDefId-notes');
    expect(result[1].markdownContents).toContain('Example ValueSet');
    expect(result[1].markdownContents).toContain('<a href=\'http://example.com/ValueSet\' target=\'_blank\'>ValueSetId</a>');
  });

  test('Test handling empty profile list.', () => {
    const result = generateMarkdown([], mockSettings);
    expect(result).toHaveLength(0);
  });

  test('Test handling of missing code and value set in code filters.', () => {
    (mockProfileDetail.getPrimaryCodeFilters as jest.Mock).mockReturnValueOnce([{ code: null, valueSet: null }]);

    generateMarkdown([mockProfileDetail], mockSettings);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('no code or value set'));
  });

  test('Test handling of missing code details.', () => {
    (mockProfileDetail.getPrimaryCodeFilters as jest.Mock).mockReturnValueOnce([{ code: { system: 'http://example.com', code: '123' }, valueSet: null }]);

    generateMarkdown([mockProfileDetail], mockSettings);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no details available for code'));
  });
});
