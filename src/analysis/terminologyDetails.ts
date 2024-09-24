import { logger } from '../common/logger';
import { DataReqOutputs } from './aggregateRequirements';
import { RuntimeSettings, ValueSetDetails, CodeDetails } from '../config/settings';
import axios from 'axios';

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
      async (valueSet: string) => await fetchOneValueSetDetail(valueSet, valueSetDetails, settings)
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
          const authHeader = `Basic ${Buffer.from(`apikey:${settings.nlmApiKey}`).toString(
            'base64'
          )}`;
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
            ? `https://vsac.nlm.nih.gov/valueset/${oid.replace('urn:oid:', '')}/expansion`
            : undefined;
          details = {
            url: valueSet,
            name: valueSetDef.title ?? valueSetDef.name ?? valueSet,
            id: oid,
            webLinkUrl: webLinkUrl
          };
          logger.info(
            'fetched ' +
              valueSet +
              ': name= ' +
              (details.name ?? '') +
              ', id= ' +
              (details.id ?? '')
          );
        } else {
          logger.warn('failed to fetch value set details: ' + valueSet + ' - no vsac credentials');
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
    codes.map(async (oneCode: string) => await fetchOneCodeDetail(oneCode, codeDetails, settings))
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
      'fetched snomed code ' + code + ': display= ' + (displayParameter?.valueString ?? '')
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
        'fetched loinc code ' + code + ': display= ' + (displayParameter?.valueString ?? '')
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