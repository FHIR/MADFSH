import fhir4, { Extension, Coding } from 'fhir/r4';
import { RuntimeSettings } from './settings';
import {
  KeyFilterElementForResourceType,
  ResourceTypesWithoutKeyFilterElements,
  getElementPathWithoutResouceTypePrefix
} from './elementDetails';
import { logger } from './logger';
import * as errMsg from './errors';
import * as fs from 'fs';

export type CodeFilter = {
  path: string;
  code?: Coding[];
  valueSet?: string;
  extension: Extension[];
};
export type DataReqOutputs = {
  type: string;
  profile: string;
  extension: Extension[];
  mustSupport: string[] | undefined;
  _mustSupport: { extension: Extension[] }[];
  codeFilter: CodeFilter[];
};

export function loadMeasureBundle(
  directoryPath: string,
  filenames: string[]
): { fileName: string; json: string }[] {
  const jsons: { fileName: string; json: string }[] = [];

  logger.info('Loading input FHIR measure library from : ' + directoryPath);
  let fileCnt = 0;

  if (filenames.length > 0) {
    filenames.forEach(oneFile => {
      logger.info('Loading file: ' + oneFile);
      fileCnt++;
      const json = fs.readFileSync(directoryPath + oneFile, { encoding: 'utf8', flag: 'r' });
      if (JSON.parse(json).resourceType === 'Bundle') {
        jsons.push({ fileName: oneFile, json: json });
      }
    });
  } else {
    const files = fs.readdirSync(directoryPath);
    files.forEach(function (oneFile) {
      if (oneFile.includes('.json')) {
        if (filenames.includes(oneFile) || filenames.length == 0) {
          const json = fs.readFileSync(directoryPath + oneFile, {
            encoding: 'utf8',
            flag: 'r'
          });
          if (JSON.parse(json).resourceType === 'Bundle') {
            logger.info('Loading file: ' + oneFile);
            fileCnt++;
            jsons.push({ fileName: oneFile, json: json });
          }
        }
      }
    });
  }

  logger.info('Loaded ' + fileCnt + ' files');
  return jsons;
}

export function loadMeasureLibraryFromDir(
  directoryPath: string,
  filenames: string[]
): { fileName: string; json: string }[] {
  const jsons: { fileName: string; json: string }[] = [];
  const files = fs.readdirSync(directoryPath);

  let fileCnt = 0;
  files.forEach(function (f) {
    if (f.includes('.json')) {
      if (filenames.includes(f) || filenames.length == 0) {
        logger.info('Loading file: ' + f);
        fileCnt++;
        const json = fs.readFileSync(directoryPath + f, { encoding: 'utf8', flag: 'r' });
        if (JSON.parse(json).resourceType === 'Library') {
          jsons.push({ fileName: f, json: json });
        }
        if (JSON.parse(json).resourceType === 'Bundle') {
          const entry = JSON.parse(json).entry;
          entry.forEach((e: any) => {
            if (e.resource.resourceType === 'Library')
              jsons.push({ fileName: f, json: JSON.stringify(e.resource) });
          });
        }
      }
    }
  });

  logger.info('Loaded ' + fileCnt + ' files');
  return jsons;
}

export function reorgDataRequirementWithMeasure(
  bundles: {
    fileName: string;
    json: string;
  }[],
  settings: RuntimeSettings
): DataReqOutputs[] {
  const dataReqOutputs: DataReqOutputs[] = [];

  bundles.forEach((b: { fileName: string; json: string }) => {
    const bundle = JSON.parse(b.json) as fhir4.Bundle;
    let measureName: string = '';
    let measureUrl: string = '';
    let measureId: string = '';
    let measureFlg = false;
    let measureExt: Extension;

    bundle.entry?.forEach(entry => {
      if (entry.resource?.resourceType === 'Measure') {
        if (measureFlg) {
          logger.error(`Multiple measures in file ${b.fileName}`);
        }

        measureFlg = true;
        measureName = entry.resource.name ?? '';
        measureId = entry.resource.id ?? '';
        if (measureId.length === 0) {
          logger.warn(`Measure with no id in ${b.fileName}, will process all libraries`);
        }
        measureUrl = entry.resource.url ?? '';
        measureExt = {
          url: settings.measureExtensionURL,
          valueString: entry.resource.url
        };
      }
    });

    if (measureName === '') {
      logger.error(`no measure found in file ${b.fileName}`);
      return dataReqOutputs;
    }

    logger.info('');
    logger.info(`** Processing measure ${measureName} (${measureUrl}) in file ${b.fileName}`);
    if (!settings.measureLink.has(measureUrl)) {
      logger.warn(`Measure link details not present for measure ${measureName} (${measureUrl})`);
    }

    // Extract Libraries only if there's Measure in the bundle
    if (measureFlg) {
      bundle.entry?.forEach(entry => {
        // process data requirements on the library with the same id as the measure (or all libraries if no id on the measure)
        if (
          entry.resource?.resourceType === 'Library' &&
          (measureId.length === 0 || measureId === entry.resource?.id)
        ) {
          logger.info(`**** Processing data requirements in library with id ${entry.resource!.id}`);

          entry.resource.dataRequirement?.forEach(item => {
            if (item.profile) {
              const p: string = item.profile[0];

              // filter check
              if (!ResourceTypesWithoutKeyFilterElements.has(item.type)) {
                if (KeyFilterElementForResourceType.has(item.type)) {
                  const filterElement = getElementPathWithoutResouceTypePrefix(
                    KeyFilterElementForResourceType.get(item.type)!,
                    item.type
                  );
                  const hasFilterOnElement: boolean = (
                    item.codeFilter?.map(oneCodeFilter => {
                      if (
                        oneCodeFilter.path === filterElement ||
                        `${oneCodeFilter.path}[x]` === filterElement
                      ) {
                        return true;
                      } else {
                        return false;
                      }
                    }) ?? []
                  ).reduce(
                    (wasAlreadyFound: boolean, foundHere: boolean) => wasAlreadyFound || foundHere,
                    false
                  );

                  if (!hasFilterOnElement) {
                    logger.error(errMsg.noFilterOnKeyElementMsg(item.type, p, filterElement));
                  }
                } else {
                  logger.error(errMsg.keyFilterElementNotKnownMsg(item.type, p));
                }
              }

              if (!dataReqOutputs.some(out => out.profile.includes(p))) {
                // Add a new profile based Data requirement output
                const ms_ext: { extension: Extension[] }[] = [];
                item.mustSupport?.forEach(function () {
                  ms_ext.push({ extension: [measureExt] });
                });

                const new_cf: CodeFilter[] = getNormalizedCodeFilterList(
                  measureExt,
                  item.type,
                  item.codeFilter
                );

                let new_ms: string[] = [];
                if (item.mustSupport) new_ms = item.mustSupport;

                dataReqOutputs.push({
                  type: item.type ?? '',
                  profile: p,
                  extension: [measureExt],
                  mustSupport: new_ms,
                  _mustSupport: ms_ext,
                  codeFilter: new_cf
                });
              } else {
                dataReqOutputs.forEach(dro => {
                  if (dro.profile === p) {
                    if (
                      !dro.extension.some(
                        ext =>
                          ext.url === settings.measureExtensionURL &&
                          ext.valueString === measureExt.valueString
                      )
                    ) {
                      dro.extension.push(measureExt);
                    }
                    item.mustSupport?.forEach(ms => {
                      if (dro.mustSupport?.includes(ms)) {
                        if (
                          !dro._mustSupport[dro.mustSupport?.indexOf(ms)].extension.some(
                            ext =>
                              ext.url === settings.measureExtensionURL &&
                              ext.valueString === measureExt.valueString
                          )
                        ) {
                          dro._mustSupport[dro.mustSupport?.indexOf(ms)].extension.push(measureExt);
                        }
                      } else {
                        dro.mustSupport?.push(ms);
                        dro._mustSupport.push({
                          extension: [measureExt]
                        });
                      }
                    });

                    const new_cf: CodeFilter[] = getNormalizedCodeFilterList(
                      measureExt,
                      item.type,
                      item.codeFilter
                    );

                    new_cf.forEach(it_cf => {
                      if (it_cf.valueSet) {
                        const matchingFilters = dro.codeFilter.filter(
                          oneCodeFilter =>
                            oneCodeFilter.valueSet === it_cf.valueSet &&
                            oneCodeFilter.path === it_cf.path
                        );
                        if (matchingFilters.length === 0) {
                          // no filter entry for this value set yet, add
                          dro.codeFilter?.push(it_cf);
                        } else if (matchingFilters.length === 1) {
                          if (
                            !matchingFilters
                              .at(0)!
                              .extension.some(
                                ext =>
                                  ext.url === settings.measureExtensionURL &&
                                  ext.valueString === measureExt.valueString
                              )
                          ) {
                            // measure not present in the list of measure using this filter,  add
                            matchingFilters.at(0)!.extension.push(measureExt);
                          }
                        } else {
                          logger.error(`multiple matching filters for value set ${it_cf.valueSet}`);
                        }
                      }

                      if (it_cf.code) {
                        const matchingFilters = dro.codeFilter.filter(
                          oneCodeFilter =>
                            oneCodeFilter.code?.at(0)?.system === it_cf.code?.at(0)!.system &&
                            oneCodeFilter.code?.at(0)?.code === it_cf.code?.at(0)!.code &&
                            oneCodeFilter.path === it_cf.path
                        );
                        if (matchingFilters.length === 0) {
                          // no filter entry for this value set yet, add
                          dro.codeFilter?.push(it_cf);
                        } else if (matchingFilters.length === 1) {
                          if (
                            !matchingFilters
                              .at(0)!
                              .extension.some(
                                ext =>
                                  ext.url === settings.measureExtensionURL &&
                                  ext.valueString === measureExt.valueString
                              )
                          ) {
                            // measure not present in the list of measure using this filter,  add
                            matchingFilters.at(0)!.extension.push(measureExt);
                          }
                        } else {
                          logger.error(`multiple matching filters for code ${it_cf.code.at(0)}`);
                        }
                      }
                    });
                  }
                });
              }
            }
          });
        }
      });
    }
  });

  return dataReqOutputs;
}

// split out code filters so that each entry has exactly 1 code or a value set
// if any encountered that have extra codes or codes and value sets, then split into multiple entries with one each
// if any encountered with no code or value set, log an error and continue without using
function getNormalizedCodeFilterList(
  measureExt: fhir4.Extension,
  resourceType: string,
  codeFilters?: fhir4.DataRequirementCodeFilter[]
): CodeFilter[] {
  if (!codeFilters) {
    return [];
  }

  const new_cf: CodeFilter[] = [];
  codeFilters.forEach(cf => {
    if (cf.valueSet && cf.code) {
      logger.warn(
        `code filter entry with both code and value set found, created entries with each separately for path ${cf.path} on resource type ${resourceType}`
      );
      new_cf.push({
        path: cf.path ?? '',
        valueSet: cf.valueSet,
        extension: [measureExt]
      });
      if (cf.code.length > 1) {
        logger.warn(
          `code filter entry with multiple codes, created entries with each separately for path ${cf.path} on resource type ${resourceType}`
        );
        cf.code.forEach(oneCode => {
          new_cf.push({
            path: cf.path ?? '',
            code: [oneCode],
            extension: [measureExt]
          });
        });
      } else {
        new_cf.push({
          path: cf.path ?? '',
          code: cf.code,
          extension: [measureExt]
        });
      }
    } else if (cf.code) {
      if (cf.code.length > 1) {
        logger.warn(
          `code filter entry with multiple codes, created entries with each separately for path ${cf.path} on resource type ${resourceType}`
        );
        cf.code.forEach(oneCode => {
          new_cf.push({
            path: cf.path ?? '',
            code: [oneCode],
            extension: [measureExt]
          });
        });
      } else if (cf.code.length === 1) {
        new_cf.push({
          path: cf.path ?? '',
          code: cf.code,
          extension: [measureExt]
        });
      } else {
        logger.error(
          `Code filter found with no code or value set for path ${cf.path} on resource type ${resourceType}`
        );
      }
    } else if (cf.valueSet) {
      new_cf.push({
        path: cf.path ?? '',
        valueSet: cf.valueSet,
        extension: [measureExt]
      });
    } else {
      logger.error(
        `Code filter found with no code or value set for path ${cf.path} on resource type ${resourceType}`
      );
    }
  });

  return new_cf;
}
