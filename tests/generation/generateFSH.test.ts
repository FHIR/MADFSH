import mockFs from 'mock-fs';
import { generateFSH } from '../../src/generation/generateFSH';
import { logger } from '../../src/common/logger';
import { ElementDetail, ProfileDetail } from '../../src/analysis/elementDetails';
import { RuntimeSettings } from '../../src/config/settings';

// Mock the logger to avoid actual logging during tests
jest.mock('../../src/common/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('generateFSH', () => {
  let mockProfileDetail: ProfileDetail;
  let mockElementDetail: ElementDetail;
  let mockSettings: RuntimeSettings;

  beforeEach(() => {
    // Set up the mock file system
    mockFs({
      'src/fixtures/extension.fsh': 'Initial FSH content\n',
    });

    // Mock ProfileDetail and ElementDetail
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
      getParentProfileDefinition: jest.fn().mockReturnValue({ name: 'ParentProfile' }),
      getElements: jest.fn().mockReturnValue([mockElementDetail]),
      getStructureDefId: jest.fn().mockReturnValue('structureDefId'),
      getMeasureList: jest.fn().mockReturnValue(['Measure1']),
      getPrimaryCodeFiltersElement: jest.fn().mockReturnValue('ResourceType.elementId'),
      getResourceType: jest.fn().mockReturnValue('ResourceType'),
    } as unknown as ProfileDetail;

    // Mock measureLink as a Map with fewer elements
    const mockMeasureLink = new Map();
    mockMeasureLink.set('Measure1', { name: 'Measure 1', identifier: [] });

    mockSettings = {
      projectName: 'TestProject',
      projectMarkdownNameAndLink: 'TestProjectLink',
      measureLink: mockMeasureLink,
    } as RuntimeSettings;
  });

  afterEach(() => {
    // Restore the real file system
    mockFs.restore();
  });

  test('Test primary functionality - generation of FSH content for given profiles.', () => {
    const result = generateFSH([mockProfileDetail], mockSettings);
    expect(result).toContain('Initial FSH content');
    expect(result).toContain('Profile: TestProjectParentProfile');
    expect(result).toContain('Parent: ParentProfile');
    expect(result).toContain('* elementId MS');
    expect(result).toContain('^short = "(Measure) short description"');
  });

  test('Test handling empty profile list.', () => {
    const result = generateFSH([], mockSettings);
    expect(result).toBe('Initial FSH content\n');
  });

  test('Test error handling for when sub-elements of extension are not implemented.', () => {
    (mockElementDetail.getElementDefinition as jest.Mock).mockReturnValueOnce({
      path: 'ResourceType.elementId.extension:subElement',
      type: [{ profile: ['http://example.com'] }]
    });

    (mockElementDetail.getElementId as jest.Mock).mockReturnValueOnce(
      "ResourceType.elementId.extension:"
    );

    generateFSH([mockProfileDetail], mockSettings);
    expect(logger.error).toHaveBeenCalledWith('sub elements of extension not implemented yet!');
  });

  test('Test warning if code filter detail is missing.', () => {
    (mockElementDetail.getFilters as jest.Mock).mockReturnValueOnce([{ code: null, valueSet: null }]);

    generateFSH([mockProfileDetail], mockSettings);
    expect(logger.warn).toHaveBeenCalledWith('Missing code filter detail for element ResourceType.elementId');
  });
});
