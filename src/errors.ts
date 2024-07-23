export function keyFilterElementNotKnownMsg(resourceType: string, profile: string): string {
    return (
        `Data Requirement on type ${resourceType} with profile ${profile} ` +
        'has no key filter element indicated in the KeyFilterElementForResourceType map ' +
        'and is not listed in the ResourceTypesWithoutKeyFilterElements map as not having one. ' +
        'Cannot determine if IG assumptions around all instances of this resource type needing ' +
        'a code from a set of value sets / codes are accurate. Update these maps to allow checking.'
    );
}

export function noFilterOnKeyElementMsg(
    resourceType: string,
    profile: string,
    filterElement: string
): string {
    return (
        `Data Requirement on type ${resourceType} with profile ${profile} has no key filter on ${filterElement}. ` +
        'This invalidates IG assumptions that all instances of this resource type need ' +
        'a code from a set of value sets / codes. Double check that the measure is accurate ' +
        'and that data requirements are being extracted correctly. If so, IG generation will need ' +
        'to be adjusted to account for this case.'
    );
}
