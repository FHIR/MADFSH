import { logger } from './logger';
import { RuntimeSettings } from './settings';
import * as util from './util';
import {
    CodeOrValueSetFilter,
    ProfileDetail,
    getElementPathWithoutResouceTypePrefix
} from './elementDetails';

export function generateMarkdown(
    profileDetails: ProfileDetail[],
    settings: RuntimeSettings
): { name: string; markdownContents: string }[] {
    const markdowns: { name: string; markdownContents: string }[] = [];

    profileDetails.forEach(profileDetail => {
        try {
            logger.info('');
            logger.info(
                `** generating markdown for profile of ${profileDetail.getParentProfileUrl()}`
            );
            generateProfileMarkdowns(profileDetail, settings, markdowns);
        } catch (e) {
            console.warn(
                'failed to generate markdown for ' +
                    profileDetail.getParentProfileUrl() +
                    ': ' +
                    (e as Error).message
            );
        }
    });

    return markdowns;
}

function generateProfileMarkdowns(
    profileDetail: ProfileDetail,
    settings: RuntimeSettings,
    markdownList: { name: string; markdownContents: string }[]
): void {
    // generate intro (before the standard elements table)
    logger.info(`**** generating intro`);
    generateProfileIntro(profileDetail, settings, markdownList);

    // generate notes (after the standard elements table)
    logger.info(`**** generating notes`);
    generateProfileNotes(profileDetail, settings, markdownList);
}

function generateProfileIntro(
    profileDetail: ProfileDetail,
    settings: RuntimeSettings,
    markdownList: { name: string; markdownContents: string }[]
): void {
    // Structure
    // ## Associated Meaures
    // ## Data Elements

    let markdown = '{% include disclaimer.md %}\n\n';
    markdown += generateProfileMeasuresSection(profileDetail, settings) + '\n';
    markdown += generateProfileDataElementsSection(profileDetail) + '\n';

    markdownList.push({
        name: `${profileDetail.getStructureDefId()}-intro`,
        markdownContents: markdown
    });
}

function generateProfileMeasuresSection(
    profileDetail: ProfileDetail,
    settings: RuntimeSettings
): string {
    logger.info(`****** measure list section`);
    const markdownContent =
        '### Measures Using this Profile\n\n' +
        'This profile provides requirements for data needed to calculate the following measures:' +
        '\n' +
        util.getMeasureListString(profileDetail.getMeasureList(), settings, '\n- ', '- ') +
        '\n';

    return markdownContent;
}

function generateProfileDataElementsSection(profileDetail: ProfileDetail): string {
    logger.info(`****** data elements section`);
    let markdown =
        '### Data Elements\n\n' +
        'This profile represents the implementation-time data element support requirements for all ' +
        'included quality measures. These elements, along with related ' +
        'parent- and sub-elements that provide additional representation requirements, ' +
        'are marked with the must support flag in the [table below](#profile).\n\n';

    markdown += generateProfileMeasureElementsSection(profileDetail);
    markdown += generateProfileInheritedElementsSection(profileDetail);

    return markdown;
}

function generateProfileMeasureElementsSection(profileDetail: ProfileDetail): string {
    const measureElementList = profileDetail.getMeasureElementsForNarrative();
    if (measureElementList.length === 0) {
        return '';
    }

    let markdown =
        '#### Data Elements Required for Measure Calculation\n\n' +
        'The following elements are referenced by the calculation logic for measures ' +
        'Some elements may not be needed for all measures ' +
        '(see full [requirements matrix below](#requirement-summary-table)).\n\n';

    let elementIndex: number = 0;
    measureElementList.forEach(narrativeDetail => {
        markdown +=
            ++elementIndex +
            '. ' +
            narrativeDetail.narrativeDescription +
            ' (`' +
            narrativeDetail.displayString +
            '`)\n';
    });

    return markdown + '\n';
}

function generateProfileInheritedElementsSection(profileDetail: ProfileDetail): string {
    const inheritedElementList = profileDetail.getInheritedElementsForNarrative();
    if (inheritedElementList.length === 0) {
        return '';
    }

    let markdown =
        '#### Additional Data Elements Required for Interoperability\n\n' +
        'Support for the following additional elements is required for ' +
        'interoperability by the parent profile and its ancestors, including US Core ' +
        'which establishes the baseline for interoperability within the US Realm.\n\n';

    let elementIndex = 0;
    profileDetail.getInheritedElementsForNarrative().forEach(narrativeDetail => {
        markdown +=
            ++elementIndex +
            '. ' +
            narrativeDetail.narrativeDescription +
            ' (`' +
            narrativeDetail.displayString +
            '`)\n';
    });

    return markdown + '\n';
}

function generateProfileNotes(
    profileDetail: ProfileDetail,
    settings: RuntimeSettings,
    markdownList: { name: string; markdownContents: string }[]
): void {
    // Structure
    // ## Value Sets
    // ## Summary Table

    let markdown = '';
    markdown += generateProfileValueSetsSection(profileDetail, settings) + '\n';
    markdown += generateSummaryTableSection(profileDetail, settings) + '\n';

    markdownList.push({
        name: `${profileDetail.getStructureDefId()}-notes`,
        markdownContents: markdown
    });
}

function generateProfileValueSetsSection(
    profileDetail: ProfileDetail,
    settings: RuntimeSettings
): string {
    logger.info(`****** value set section`);

    const codeFilters: CodeOrValueSetFilter[] = profileDetail.getPrimaryCodeFilters();
    const targetElement = getElementPathWithoutResouceTypePrefix(
        profileDetail.getPrimaryCodeFiltersElement() ?? ''
    );

    if (targetElement.length === 0 || codeFilters.length === 0) {
        // no value set filters
        return '';
    }

    return (
        `#### In-scope \`${targetElement}\` Codes\n\n` +
        'The following codes and value sets define the scope of instances covered by this profile. ' +
        generateElementValueSetsDetails(profileDetail, targetElement, codeFilters, settings)
    );
}

function generateElementValueSetsDetails(
    profileDetail: ProfileDetail,
    targetElement: string,
    codeFilters: CodeOrValueSetFilter[],
    settings: RuntimeSettings
): string {
    if (codeFilters.length === 0) {
        logger.error(`no code filters for path ${targetElement}`);
        return '';
    }

    let polymorphicDetails = '';
    if (targetElement.endsWith('[x]')) {
        polymorphicDetails =
            ` The form depends on the type used for the polymorphic element \`${targetElement}\`:\n` +
            `- \`${targetElement.replace(
                '[x]',
                'CodeableConcept'
            )}\`: a coding entry representing one of these codes must be present\n` +
            `- \`${targetElement.replace(
                '[x]',
                'Reference'
            )}\`: the referenced instance must have one of these codes`;
    }

    let markdownContent =
        'To be included in measure calculation, ' +
        'instances of this profile **SHALL** have at least one code taken ' +
        `from a value set or code in this list present in the \`${targetElement}\` ` +
        'element.' +
        polymorphicDetails +
        '\n\n' +
        '<table class="grid">\n' +
        '  <thead>\n' +
        '    <tr>\n' +
        '      <th><strong>Type</strong></th>\n' +
        '      <th><strong>Name</strong></th>\n' +
        '      <th><strong>Identifier and Link</strong></th>\n' +
        '      <th><strong>Measures Used By</strong></th>\n' +
        '    </tr>\n' +
        '  </thead>\n' +
        '  <tbody>\n';

    codeFilters.forEach(codeFilter => {
        if (!codeFilter.code && !codeFilter.valueSet) {
            logger.error(
                `bad codeFilter entry for profile ${profileDetail.getParentProfileUrl} at path ${targetElement} - no code or value set`
            );
        } else if (codeFilter.code && codeFilter.valueSet) {
            logger.error(
                `bad codeFilter entry for profile ${profileDetail.getParentProfileUrl} at path ${targetElement} - both code and value set`
            );
        } else {
            // two cases to handle for name and link
            // - value set:
            //   - name = mapped name
            //   - identifier / link = mapped identifier hyperlinked to the valueSet value
            // - single code
            //   - name = display value / description of the code
            //   - identifier / link = code from code system (hyperlinked)
            if (codeFilter.valueSet) {
                const valueSetDetails = settings.valueSetDetails.get(codeFilter.valueSet);

                if (valueSetDetails) {
                    markdownContent +=
                        '    <tr>\n' +
                        '      <td>Value Set</td>\n' +
                        `      <td>${valueSetDetails.name ?? codeFilter.valueSet}</td>\n` +
                        `      <td><a href='${
                            valueSetDetails.webLinkUrl ?? codeFilter.valueSet
                        }' target='_blank'>${
                            valueSetDetails.id ?? codeFilter.valueSet
                        }</a></td>\n` +
                        `      <td>${util.getMeasureListString(
                            codeFilter.measureList,
                            settings,
                            ', ',
                            '',
                            false,
                            'identifierOnly'
                        )}</td>\n` +
                        '    </tr>\n';
                } else {
                    markdownContent +=
                        '    <tr>\n' +
                        '      <td>Value Set</td>\n' +
                        `      <td></td>\n` +
                        `      <td><a href='${codeFilter.valueSet}' target='_blank'/></td>\n` +
                        `      <td>${util.getMeasureListString(
                            codeFilter.measureList,
                            settings,
                            ', ',
                            '',
                            false,
                            'identifierOnly'
                        )}</td>\n` +
                        '    </tr>\n';
                }
            } else {
                // todo - need to handle correctly
                const coding = codeFilter.code;
                if (!coding) {
                    logger.error(
                        `bad codeFilter entry for profile ${profileDetail.getParentProfileUrl()} at path ${targetElement} - no codes`
                    );
                } else {
                    const code = coding.code;
                    const system = coding.system;

                    if (code) {
                        const key = `${system}|${code}`;
                        const codeDetails = settings.codeDetails.get(key);

                        if (codeDetails) {
                            const name = codeDetails.display ?? '';
                            let id = `${code}${system ? ` (${system})` : ''}`;
                            if (codeDetails.webLinkUrl) {
                                id = `<a href='${codeDetails.webLinkUrl}' target='_blank'>${id}</a>`;
                            }
                            markdownContent +=
                                '    <tr>\n' +
                                '      <td>Code</td>\n' +
                                `      <td>${name}</td>\n` +
                                `      <td>${id}</td>\n` +
                                `      <td>${util.getMeasureListString(
                                    codeFilter.measureList,
                                    settings,
                                    ', ',
                                    '',
                                    false,
                                    'identifierOnly'
                                )}</td>\n` +
                                '    </tr>\n';
                        } else {
                            // no display or link available
                            logger.warn(`no details available for code ${[system, code]}`);
                            markdownContent +=
                                '    <tr>\n' +
                                '      <td>Code</td>\n' +
                                `      <td></td>\n` +
                                `      <td>${code}${system ? ` (${system})` : ''}</td>\n` +
                                `      <td>${util.getMeasureListString(
                                    codeFilter.measureList,
                                    settings,
                                    ', ',
                                    '',
                                    false,
                                    'identifierOnly'
                                )}</td>\n` +
                                '    </tr>\n';
                        }
                    } else {
                        // not enough detail
                        logger.error(
                            `bad codeFilter entry for profile ${profileDetail.getParentProfileUrl()} at path ${targetElement} - code or system missing`
                        );
                    }
                }
            }
        }
    });

    markdownContent += '  </tbody>\n' + '</table>\n';

    return markdownContent;
}

function generateSummaryTableSection(
    profileDetail: ProfileDetail,
    settings: RuntimeSettings
): string {
    logger.info(`****** requirements summary section`);
    let markdownContent =
        '#### Requirement Summary Table\n\n' +
        '<table class="grid">\n' +
        '  <thead>\n' +
        '    <tr>\n' +
        '      <th><strong>Narrative Description</strong></th>\n' +
        '      <th><strong>Path</strong></th>\n' +
        '      <th><strong>Requirement Source</strong></th>\n' +
        '      <th><strong>Measures Used By</strong></th>\n' +
        '    </tr>\n' +
        '  </thead>\n' +
        '  <tbody>\n';

    profileDetail.getElements().forEach(elementDetail => {
        if (elementDetail.includeInNarrative()) {
            const narrativeDetails = elementDetail.getNarrativeDetails()!;
            let source = '';
            if (elementDetail.isMeasureRequirement()) {
                source = 'Measure';
            }
            if (elementDetail.isInheritedRequirement()) {
                if (source.length > 0) {
                    source += ', Inherited';
                } else {
                    source = 'Inherited';
                }
            }

            markdownContent +=
                '    <tr>\n' +
                `      <td>${narrativeDetails!.narrativeDescription}</td>\n` +
                `      <td><code class="language-plaintext highlighter-rouge">${
                    narrativeDetails!.displayString
                }</code></td>\n` +
                `      <td>${source}</td>\n` +
                `      <td>${util.getMeasureListString(
                    elementDetail.getMeasureList(),
                    settings,
                    ', ',
                    '',
                    false,
                    'identifierOnly'
                )}</td>\n` +
                '    </tr>\n';
        }
    });

    markdownContent += '  </tbody>\n' + '</table>\n';

    return markdownContent;
}
