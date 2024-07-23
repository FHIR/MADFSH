import * as fs from 'fs';
import { logger } from './logger';
import { RuntimeSettings } from '../config/settings';

export function createFile(fileName: string, contents: string) {
  try {
    fs.writeFileSync(fileName, contents);
    logger.info('Exported output: ' + fileName);
  } catch (err) {
    console.error(err);
    return;
  }
}

export function createInstantiatedTemplateFile(
  fileName: string,
  contents: string,
  replaceMap: Map<string, string>
) {
  let instantiatedContents = contents;
  replaceMap.forEach((updateValue, replaceValue) => {
    instantiatedContents = instantiatedContents.replace(replaceValue, updateValue);
  });
  createFile(fileName, instantiatedContents);
}

export function getMeasureListStringFromExt(
  usedByMeasureExtensions: fhir4.Extension[],
  settings: RuntimeSettings,
  delimiter: string = ', ',
  prefix: string = '',
  markdownStyle: boolean = false,
  nameStyle: string = 'nameAndNumber'
) {
  return getMeasureListString(
    usedByMeasureExtensions.map(ext => {
      if (ext.url === settings.measureExtensionURL) {
        return ext.valueString ?? '';
      } else {
        return '';
      }
    }),
    settings,
    delimiter,
    prefix,
    markdownStyle,
    nameStyle
  );
}

export function getMeasureListString(
  usedByMeasureExtensions: string[],
  settings: RuntimeSettings,
  delimiter: string = ', ',
  prefix: string = '',
  markdownStyle: boolean = false,
  nameStyle: string = 'nameAndNumber'
) {
  return usedByMeasureExtensions.reduce((list, measure) => {
    if (measure.length > 0) {
      let separator = delimiter;
      if (list === prefix) {
        separator = '';
      }

      let measureDisplay;
      const measureDetails = settings.measureLink.get(measure);
      if (measureDetails) {
        let measureName = `${measureDetails.name}${
          measureDetails.identifier && measureDetails.identifier.length > 0
            ? ` (${measureDetails.identifier})`
            : ''
        }`;
        if (nameStyle === 'nameOnly') {
          measureName = measureDetails.name;
        } else if (nameStyle === 'identifierOnly') {
          measureName = measureDetails.identifier;
        }

        if (measureName && measureDetails.definitionURL) {
          if (markdownStyle) {
            measureDisplay = `[${measureName}](${measureDetails.definitionURL})`;
          } else {
            measureDisplay = `<a href='${measureDetails.definitionURL}' target='_blank'>${measureName}</a>`;
          }
        } else {
          measureDisplay = measureName;
        }
      }

      return list + separator + (measureDisplay ?? measure);
    } else {
      return list;
    }
  }, prefix);
}
