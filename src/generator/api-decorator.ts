import { ParsedField } from './types';

interface IProperty {
  name: string;
  value: string;
}

const ApiProps = [
  'description',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'minLength',
  'maxLength',
  'minItems',
  'maxItems',
];

export const PrismaScalarToFormat: Record<
  string,
  { type: string; format: string }
> = {
  Int: { type: 'integer', format: 'int32' },
  BigInt: { type: 'integer', format: 'int64' },
  Float: { type: 'number', format: 'float' },
  Decimal: { type: 'number', format: 'double' },
  DateTime: { type: 'string', format: 'date-time' },
};

export function isAnnotatedWithDoc(field: ParsedField): boolean {
  return ApiProps.some((prop) =>
    new RegExp(`@${prop}\\s+(.+)\\s*$`, 'm').test(field.documentation || ''),
  );
}

export function getDefaultValue(field: ParsedField): any {
  if (!field.hasDefaultValue) return undefined;

  switch (typeof field.default) {
    case 'string':
    case 'number':
    case 'boolean':
      return field.default;
    case 'object':
      if (field.default.name) {
        return field.default.name;
      }
    // fall-through
    default:
      return undefined;
  }
}

function extractAnnotation(field: ParsedField, prop: string): IProperty | null {
  const regexp = new RegExp(`@${prop}\\s+(.+)\\s*$`, 'm');
  const matches = regexp.exec(field.documentation || '');

  if (matches && matches[1]) {
    return {
      name: prop,
      value: matches[1],
    };
  }

  return null;
}

/**
 * Wrap string with single-quotes unless it's a (stringified) number, boolean, or array.
 */
function encapsulateString(value: string): string {
  return /^(?!true$|false$)[^0-9\[]/.test(value) ? `'${value}'` : value;
}

export function decorateApiProperty(
  field: ParsedField,
  includeDefault = true,
): string {
  const properties: IProperty[] = [];

  for (const prop of ApiProps) {
    const property = extractAnnotation(field, prop);
    if (property) {
      properties.push(property);
    }
  }

  const scalarFormat = PrismaScalarToFormat[field.type];
  if (scalarFormat) {
    properties.push(
      { name: 'type', value: scalarFormat.type },
      { name: 'format', value: scalarFormat.format },
    );
  }

  if (field.kind === 'enum') {
    properties.push({ name: 'enum', value: field.type });
  }

  const defaultValue = getDefaultValue(field);
  if (includeDefault && defaultValue !== undefined) {
    properties.push({ name: 'default', value: `${defaultValue}` });
  }

  let decorator = '';

  if (properties.length) {
    decorator += '@ApiProperty({\n';
    properties.forEach((prop) => {
      decorator += `  ${prop.name}: ${
        prop.name === 'enum' ? prop.value : encapsulateString(prop.value)
      },\n`;
    });
    decorator += '})\n';
  }

  return decorator;
}
