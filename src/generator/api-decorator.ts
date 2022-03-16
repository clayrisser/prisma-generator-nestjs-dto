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

const PrismaScalarToFormat: Record<string, { type: string; format: string }> = {
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

function encapsulateString(value: string): string {
  return /^[^0-9\[]/.test(value) ? `'${value}'` : value;
}

export function decorateApiProperty(field: ParsedField): string {
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
    console.log(field);
    properties.push({ name: 'enum', value: field.type });
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
