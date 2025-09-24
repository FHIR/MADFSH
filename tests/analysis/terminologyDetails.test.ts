import { fetchValueSetAndCodeDetails } from '../../src/analysis/terminologyDetails';
import { RuntimeSettings, ValueSetDetails, CodeDetails } from '../../src/config/settings';
import { DataReqOutputs } from '../../src/analysis/aggregateRequirements';
import axios from 'axios';
import { logger } from '../../src/common/logger';

// Mock axios to avoid actual HTTP requests during tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock the logger to avoid actual logging during tests
jest.mock('../../src/common/logger');

describe('Tests for the fetchValueSetAndCodeDetails function.', () => {
  let mockSettings: RuntimeSettings;

  beforeEach(() => {
    mockSettings = {
      measureExtensionURL: 'http://example.com/measureExtension',
      measureLink: new Map(),
      valueSetDetails: new Map(),
      codeDetails: new Map(),
      nlmApiKey: 'vsac-key',
      loincCredentials: {
        username: 'loinc-username',
        password: 'loinc-password'
      },
      inputRoot: '',
      outputRoot: '',
      inputFileList: [],
      projectName: '',
      projectMarkdownNameAndLink: '',
      remoteProfile: false,
      profileURLReplace: new Map(),
      elementDetailOverrides: new Map(),
      createDataReqJSON: false,
      fhirDefinitions: undefined,
      exampleInputFolder: '',
      exampleOutputFolder: '',
      exampleMarkdownFile: '',
    };
    jest.resetAllMocks(); // clearAllMocks + need to reset mockedAxios
  });

  test('Fetch value set and code details with valid data requirements.', async () => {
    const dataReqs: DataReqOutputs[] = [
      {
        type: 'Observation',
        profile: 'http://example.com/profile1',
        extension: [],
        mustSupport: ['value'],
        _mustSupport: [],
        codeFilter: [
          {
            path: 'code',
            code: [{ system: 'http://loinc.org', code: '1234-5' }],
            extension: []
          },
          {
            path: 'valueSet',
            valueSet: 'http://example.com/valueset1',
            extension: []
          }
        ]
      }
    ];

    mockedAxios.get.mockResolvedValueOnce({
      data: {
        title: 'Example ValueSet',
        identifier: [{ value: 'urn:oid:1.2.3.4.5' }]
      }
    });

    mockedAxios.get.mockResolvedValueOnce({
      data: {
        parameter: [{ name: 'display', valueString: 'Example LOINC Code' }]
      }
    });

    await fetchValueSetAndCodeDetails(dataReqs, mockSettings);

    expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('fetched loinc code 1234-5'));
  });

  test('Handle fetching value set details without NLM API key.', async () => {
    mockSettings.nlmApiKey = undefined;

    const dataReqs: DataReqOutputs[] = [
      {
        type: 'Observation',
        profile: 'http://example.com/profile1',
        extension: [],
        mustSupport: ['value'],
        _mustSupport: [],
        codeFilter: [
          {
            path: 'valueSet',
            valueSet: 'http://cts.nlm.nih.gov/fhir/ValueSet/1.2.3.4.5',
            extension: []
          }
        ]
      }
    ];

    await fetchValueSetAndCodeDetails(dataReqs, mockSettings);

    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no vsac credentials'));
  });

  test('Handle fetching code details without LOINC credentials.', async () => {
    mockSettings.loincCredentials = undefined;

    const dataReqs: DataReqOutputs[] = [
      {
        type: 'Observation',
        profile: 'http://example.com/profile1',
        extension: [],
        mustSupport: ['value'],
        _mustSupport: [],
        codeFilter: [
          {
            path: 'code',
            code: [{ system: 'http://loinc.org', code: '1234-5' }],
            extension: []
          }
        ]
      }
    ];

    await fetchValueSetAndCodeDetails(dataReqs, mockSettings);

    expect(mockedAxios.get).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('no LOINC credentials'));
  });

  test('Handle errors during fetching value set details.', async () => {
    const dataReqs: DataReqOutputs[] = [
      {
        type: 'Observation',
        profile: 'http://example.com/profile1',
        extension: [],
        mustSupport: ['value'],
        _mustSupport: [],
        codeFilter: [
          {
            path: 'valueSet',
            valueSet: 'http://cts.nlm.nih.gov/fhir/valueset1',
            extension: []
          }
        ]
      }
    ];

    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

    await fetchValueSetAndCodeDetails(dataReqs, mockSettings);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('failed to fetch value set details'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Error: Network Error'));
  });

  test('Handle errors during fetching code details.', async () => {
    const dataReqs: DataReqOutputs[] = [
      {
        type: 'Observation',
        profile: 'http://example.com/profile1',
        extension: [],
        mustSupport: ['value'],
        _mustSupport: [],
        codeFilter: [
          {
            path: 'code',
            code: [{ system: 'http://loinc.org', code: '1234-5' }],
            extension: []
          }
        ]
      }
    ];

    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'));

    await fetchValueSetAndCodeDetails(dataReqs, mockSettings);

    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('failed to fetch code details'));
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Error: Network Error'));
  });
});
