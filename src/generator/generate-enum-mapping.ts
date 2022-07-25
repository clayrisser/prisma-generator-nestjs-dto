import { DMMF } from '@prisma/generator-helper';
import path from 'path';
import { WriteableFileSpecs } from './types';

const regexp = new RegExp(`@DtoGenMapping\\s+(.+)\\s*$`, 'm');
export function genEnumMapping(
  enums: DMMF.DatamodelEnum[],
  base: string,
): WriteableFileSpecs[] {
  const rtv: WriteableFileSpecs[] = [];
  enums.forEach((enum_) => {
    const matches = regexp.exec(enum_.documentation || '');
    if (matches && matches[1]) {
      rtv.push({
        fileName: path.join(base, `${enum_.name}.ts`),
        content: `import { ${enum_.name} } from '@prisma/client';
export function map${enum_.name}(status: string): string {
  const obj = ${matches[1]};
  return obj[status];
}`,
      });
    }
  });
  return rtv;
}
