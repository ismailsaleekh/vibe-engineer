declare const input: string;
const payload = input as unknown;
validateOtherThing("not the payload");
function validateOtherThing(value: string): string { return value; }
