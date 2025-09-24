import * as fs from 'fs';
import mockFs from 'mock-fs';
import path from 'path';
import { generateExample } from '../../src/generation/generateExamples';
import { RuntimeSettings } from '../../src/config/settings';
import { ProfileDetail } from '../../src/analysis/elementDetails';
import * as util from '../../src/common/util';
import { logger } from '../../src/common/logger';

// Mock the logger to avoid actual logging during tests
jest.mock('../../src/common/logger', () => ({
    logger: {
      info: jest.fn(),
    },
}));
  
// Mock the util module
jest.mock('../../src/common/util', () => ({
  createFile: jest.fn(),
}));

describe('Tests for the generateExample function.', () => {
  // Mock only the relevant fields of RuntimeSettings
  const mockSettings: Partial<RuntimeSettings> = {
    inputRoot: '/input',
    outputRoot: '/output/', //Trailing slash currently required, may want to fix in source
    exampleInputFolder: 'examples',
    exampleOutputFolder: 'outputExamples/', //Trailing slash currently required, may want to fix in source
    projectName: 'TestProject',
  };

  // Mock only the relevant methods of ProfileDetail
  const mockProfileDetails: Partial<ProfileDetail>[] = [
    {
      getParentProfileUrl: jest.fn().mockReturnValue('http://example.com/profile'),
      getParentProfileDefinition: jest.fn().mockReturnValue({ name: 'ProfileName' }),
      getStructureDefId: jest.fn().mockReturnValue('ProfileId'),
    },
  ];

  beforeEach(() => {
    mockFs({
      '/input/examples': {
        'example1.json': JSON.stringify({
          resourceType: 'Bundle',
          id: 'bundle1',
          entry: [
            {
              resource: {
                resourceType: 'MeasureReport',
                measure: 'https://madie.cms.gov/Measure/Measure1',
              },
            },
            {
              resource: {
                resourceType: 'Patient',
                id: 'patient1',
                meta: {
                  profile: ['http://example.com/profile'],
                },
              },
            },
          ],
        }),
      },
      '/output/outputExamples': {},
    });
  });

  afterEach(() => {
    mockFs.restore();
    jest.clearAllMocks();
  });

  test('Test generating examples and returning markdown content.', () => {
    const result = generateExample(mockSettings as RuntimeSettings, mockProfileDetails as ProfileDetail[]);

    expect(result).toContain('### Measure: Measure1');
    expect(result).toContain('<a href="Bundle-bundle1.html">Example-Bundle-bundle1</a>');
    expect(result).toContain('<a href="Patient-patient1.html">Example-Patient-patient1</a>');
    expect(util.createFile).toHaveBeenCalledWith(
      '/output/outputExamples/Example-Patient-patient1.json',
      expect.any(String)
    );
    expect(util.createFile).toHaveBeenCalledWith(
      path.join('/output/outputExamples', 'Bundle-bundle1.json'),
      expect.any(String)
    );
  });

  test('Test creating output directory if it does not exist.', () => {
    mockFs({
      '/input/examples': {
        'example1.json': JSON.stringify({
          resourceType: 'Bundle',
          id: 'bundle1',
          entry: [],
        }),
      },
      '/output': {}, // No outputExamples directory
    });

    generateExample(mockSettings as RuntimeSettings, mockProfileDetails as ProfileDetail[]);

    expect(fs.existsSync('/output/outputExamples')).toBe(true);
  });

  test('Return "No examples available." if exampleInputFolder is not set.', () => {
    const modifiedSettings = { ...mockSettings, exampleInputFolder: '' };
    const result = generateExample(modifiedSettings as RuntimeSettings, mockProfileDetails as ProfileDetail[]);

    expect(result).toBe('No examples available.');
  });

  test('Clear existing files in the output directory.', () => {
    mockFs({
      '/input/examples': {
        'example1.json': JSON.stringify({
          resourceType: 'Bundle',
          id: 'bundle1',
          entry: [],
        }),
      },
      '/output/outputExamples': {
        'oldFile.json': 'old content',
      },
    });

    generateExample(mockSettings as RuntimeSettings, mockProfileDetails as ProfileDetail[]);

    expect(fs.readdirSync('/output/outputExamples')).not.toContain('oldFile.json');
  });
});