import { reorgDataRequirementWithMeasure, DataReqOutputs } from '../../src/analysis/aggregateRequirements';
import { RuntimeSettings } from '../../src/config/settings';
import { logger } from '../../src/common/logger';

// Mock the logger to avoid actual logging during tests
jest.mock('../../src/common/logger');

describe('Tests for the reorgDataRequirementWithMeasure function.', () => {
  // Mock only the relevant fields of RuntimeSettings
  const mockSettings: Partial<RuntimeSettings> = {
    measureExtensionURL: 'http://example.com/measureExtension',
    measureLink: new Map([
      ['http://example.com/measure1', {
        name: 'Measure1',
        identifier: 'measure1',
        keyURL: 'http://example.com/keyURL1',
        definitionURL: 'http://example.com/definitionURL1'
      }]
    ]),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Test processing a bundle with a single measure and library.', () => {
    const bundles = [
      {
        fileName: 'bundle1.json',
        json: JSON.stringify({
          resourceType: 'Bundle',
          entry: [
            {
              resource: {
                resourceType: 'Measure',
                id: 'measure1',
                url: 'http://example.com/measure1',
                name: 'Measure1',
              },
            },
            {
              resource: {
                resourceType: 'Library',
                id: 'measure1',
                dataRequirement: [
                  {
                    type: 'Observation',
                    profile: ['http://example.com/profile1'],
                    mustSupport: ['value'],
                    codeFilter: [
                      {
                        path: 'code',
                        code: [{ system: 'http://loinc.org', code: '1234-5' }],
                      },
                    ],
                  },
                ],
              },
            },
          ],
        }),
      },
    ];

    const result = reorgDataRequirementWithMeasure(bundles, mockSettings as RuntimeSettings);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('Observation');
    expect(result[0].profile).toBe('http://example.com/profile1');
    expect(result[0].mustSupport).toContain('value');
    expect(result[0].codeFilter).toHaveLength(1);
    expect(result[0].codeFilter[0].code).toEqual([{ system: 'http://loinc.org', code: '1234-5' }]);
    expect(logger.info).toHaveBeenCalledWith('** Processing measure Measure1 (http://example.com/measure1) in file bundle1.json');
  });

  test('Test processing a bundle with no measure.', () => {
    const bundles = [
      {
        fileName: 'bundle2.json',
        json: JSON.stringify({
          resourceType: 'Bundle',
          entry: [
            {
              resource: {
                resourceType: 'Library',
                id: 'library1',
              },
            },
          ],
        }),
      },
    ];

    const result = reorgDataRequirementWithMeasure(bundles, mockSettings as RuntimeSettings);

    expect(result).toHaveLength(0);
    expect(logger.error).toHaveBeenCalledWith('no measure found in file bundle2.json');
  });

  test('Test processing a bundle with multiple measures.', () => {
    const bundles = [
      {
        fileName: 'bundle3.json',
        json: JSON.stringify({
          resourceType: 'Bundle',
          entry: [
            {
              resource: {
                resourceType: 'Measure',
                id: 'measure1',
                url: 'http://example.com/measure1',
                name: 'Measure1',
              },
            },
            {
              resource: {
                resourceType: 'Measure',
                id: 'measure2',
                url: 'http://example.com/measure2',
                name: 'Measure2',
              },
            },
          ],
        }),
      },
    ];

    const result = reorgDataRequirementWithMeasure(bundles, mockSettings as RuntimeSettings);

    expect(result).toHaveLength(0);
    expect(logger.error).toHaveBeenCalledWith('Multiple measures in file bundle3.json');
  });

  test('Test processing a bundle with a measure without an ID.', () => {
    const bundles = [
      {
        fileName: 'bundle4.json',
        json: JSON.stringify({
          resourceType: 'Bundle',
          entry: [
            {
              resource: {
                resourceType: 'Measure',
                url: 'http://example.com/measure1',
                name: 'Measure1',
              },
            },
          ],
        }),
      },
    ];

    const result = reorgDataRequirementWithMeasure(bundles, mockSettings as RuntimeSettings);

    expect(result).toHaveLength(0);
    expect(logger.warn).toHaveBeenCalledWith('Measure with no id in bundle4.json, will process all libraries');
  });

  test('Test processing a bundle with a library having no data requirements.', () => {
    const bundles = [
      {
        fileName: 'bundle5.json',
        json: JSON.stringify({
          resourceType: 'Bundle',
          entry: [
            {
              resource: {
                resourceType: 'Measure',
                id: 'measure1',
                url: 'http://example.com/measure1',
                name: 'Measure1',
              },
            },
            {
              resource: {
                resourceType: 'Library',
                id: 'measure1',
              },
            },
          ],
        }),
      },
    ];

    const result = reorgDataRequirementWithMeasure(bundles, mockSettings as RuntimeSettings);

    expect(result).toHaveLength(0);
    expect(logger.info).toHaveBeenCalledWith('**** Processing data requirements in library with id measure1');
  });
});
