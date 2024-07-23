import fhir4 from 'fhir/r4';
import { logger } from './logger';
import { RuntimeSettings } from './settings';
import * as fs from 'fs';
import { ElementDetail, ProfileDetail } from './elementDetails';
import { getMeasureListString } from './util';

export function generateFSH(profileDetails: ProfileDetail[], settings: RuntimeSettings): string {
    let fsh: string = fs.readFileSync('src/extension.fsh', { encoding: 'utf8', flag: 'r' });

    const stats: { nProfiles: number } = {
        nProfiles: 0
    };

    profileDetails.forEach(oneProfile => {
        stats.nProfiles++;
        fsh += generateFSHProfile(oneProfile, settings);
    });

    return fsh;
}

function generateFSHProfile(oneProfile: ProfileDetail, settings: RuntimeSettings): string {
    let fsh = '';

    logger.info('');
    logger.info('** Extending profile ' + oneProfile.getParentProfileDefinition().name);

    // header
    fsh += generateFSHProfileHeader(oneProfile, settings);

    // items
    oneProfile.getElements().forEach(oneElement => {
        if (oneElement.isMeasureRequirement()) {
            fsh += generateFSHProfileElement(oneProfile, oneElement, settings);
        }
    });

    fsh += '\n';

    return fsh;
}

function generateFSHProfileHeader(oneProfile: ProfileDetail, settings: RuntimeSettings): string {
    let fsh = '';
    const sd: fhir4.StructureDefinition = oneProfile.getParentProfileDefinition();
    fsh += 'Profile: ' + settings.projectName + sd.name + '\n';
    fsh += 'Parent: ' + sd.name + '\n';
    fsh += 'Id: ' + oneProfile.getStructureDefId() + '\n';
    fsh += 'Title: "' + settings.projectName + ' ' + sd.name + '"\n';
    fsh += `Description: "This profile defines implementation-time requirements for data used in the calculation of ${
        settings.projectMarkdownNameAndLink
            ? settings.projectMarkdownNameAndLink
            : settings.projectName
    } quality measures."\n`;

    // measures using this profile
    oneProfile.getMeasureList().forEach(measure => {
        fsh += fshUsedByMeasureExtension(measure);
    });
    return fsh;
}

function generateFSHProfileElement(
    oneProfile: ProfileDetail,
    oneElement: ElementDetail,
    settings: RuntimeSettings
): string {
    let fsh = '';

    // take off the <ResouceType>. prefix for use in FSH
    let elementPath = oneElement.getElementId().split(`${oneProfile.getResourceType()}.`)[1];
    if (elementPath.includes('extension:')) {
        const elementDef = oneElement.getElementDefinition();
        const basePath = elementDef.path.split(`${oneProfile.getResourceType()}.`)[1];
        if (basePath.includes('.')) {
            logger.error('sub elements of extension not implemented yet!');
            // can't determine the element path, so return nothing for this element
            return '';
        }
        const extensionUrl = elementDef.type!.at(0)!.profile!.at(0)!;
        elementPath = `${basePath}[${extensionUrl}]`;
    }

    // add must support
    fsh += fshMustSupportElement(elementPath);

    // prefix short with measure indicator
    fsh += fshPrefixedShort(
        elementPath,
        '(Measure)',
        oneElement.getElementDefinition().short ?? ''
    );

    // add measure list to end of comment
    const additionalComment =
        'The following measures refrence this element in their calculation logic: ' +
        getMeasureListString(oneElement.getMeasureList(), settings, ', ', '', true) +
        '.';
    fsh += fshSuffixedComment(
        elementPath,
        additionalComment,
        oneElement.getElementDefinition().comment ?? ''
    );

    // add measure extensions
    oneElement.getMeasureList().forEach(measure => {
        fsh += fshUsedByMeasureExtension(measure, elementPath);
    });

    // add filter details only if this is a primary filter element
    if (oneProfile.getPrimaryCodeFiltersElement() === oneElement.getElementId()) {
        oneElement.getFilters().forEach(oneCodeOrValueSetFilter => {
            if (oneCodeOrValueSetFilter.code) {
                let codeString = '';
                if (oneCodeOrValueSetFilter.code.system != undefined) {
                    codeString = `${oneCodeOrValueSetFilter.code.system}#${oneCodeOrValueSetFilter.code.code} "${oneCodeOrValueSetFilter.code.display}"`;
                } else {
                    codeString = `#${oneCodeOrValueSetFilter.code.code ?? ''}`;
                }
                fsh += fshAssociatedWithValueSetComplexExtension(
                    elementPath,
                    oneCodeOrValueSetFilter.measureList,
                    codeString
                );
            } else if (oneCodeOrValueSetFilter.valueSet) {
                fsh += fshAssociatedWithValueSetComplexExtension(
                    elementPath,
                    oneCodeOrValueSetFilter.measureList,
                    undefined,
                    oneCodeOrValueSetFilter.valueSet
                );
            } else {
                logger.warn(`Missing code filter detail for element ${oneElement.getElementId()}`);
            }
        });
    }

    return fsh;
}

function fshMustSupportElement(elementPath: string): string {
    return `* ${elementPath} MS\n`;
}

function fshPrefixedShort(elementPath: string, shortPrefix: string, originalShort: string): string {
    const shortString = `${shortPrefix}${originalShort.length > 0 ? ` ${originalShort}` : ''}`;
    return `* ${elementPath} ^short = "${fshifyString(shortString)}"\n`;
}

function fshSuffixedComment(
    elementPath: string,
    commentSuffix: string,
    originalComment: string
): string {
    const commentString = `${
        originalComment.length > 0 ? `${originalComment}\r\r` : ''
    }${commentSuffix}`;
    return `* ${elementPath} ^comment = "${fshifyString(commentString)}"\n`;
}

function fshUsedByMeasureExtension(measure: string, elementPath?: string): string {
    // allow for 3 cases:
    // 1. profile level: no element path
    // 2. element level: element path
    // 3. within an element-level extension: element path with the start of a ^ rule

    let pathAndPrefix = '^'; // profile-level default
    if (elementPath) {
        if (elementPath.includes(' ')) {
            // 3. inside an element-level extension
            pathAndPrefix = elementPath;
        } else {
            //2. element level
            pathAndPrefix = `${elementPath} ^`;
        }
    }

    return `* ${pathAndPrefix}extension[UsedByMeasure][+].valueString = "${measure}" \n`;
}

function fshAssociatedWithValueSetComplexExtension(
    elementPath: string,
    measureList: string[],
    codeString?: string,
    valueSetString?: string
): string {
    if (!codeString && !valueSetString) {
        logger.error(
            `value set association extension generation failed for element ${elementPath}: no code or value set`
        );
        return '';
    }
    if (codeString && valueSetString) {
        logger.error(
            `value set association extension generation failed for element ${elementPath}: both code and value set`
        );
        return '';
    }

    let fsh = '';
    if (codeString) {
        fsh += `* ${elementPath} ^extension[AssociatedWithValueSet][+].extension[codeTarget][+].valueCoding = ${codeString}\n`;
    }
    if (valueSetString) {
        fsh += `* ${elementPath} ^extension[AssociatedWithValueSet][+].extension[valueSetTarget][+].valueString = "${valueSetString}"\n`;
    }
    measureList.forEach(measure => {
        fsh += fshUsedByMeasureExtension(
            measure,
            `${elementPath} ^extension[AssociatedWithValueSet][=].`
        );
    });

    return fsh;
}

// from GoFSH - the order seems to matter!
function fshifyString(theString: string): string {
    return theString
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}
