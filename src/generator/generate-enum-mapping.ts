import { DMMF } from '@prisma/generator-helper';
import path from 'path';
import { WriteableFileSpecs } from './types';

const regexp = new RegExp(`@DtoGenMapping\\s+\\((.+)\\)\\s*$`, 'm');
export function genEnumMapping(
  enums: DMMF.DatamodelEnum[],
  base: string,
): WriteableFileSpecs[] {
  const rtv: WriteableFileSpecs[] = [];
  enums.forEach((enum_) => {
    const rstr = (enum_.documentation || '').replace(/[\n\r]/g, ' ') + '\n';
    const matches = regexp.exec(rstr);
    if (matches && matches[1]) {
      rtv.push({
        fileName: path.join(base, `${enum_.name}.ts`),
        content: `export function map${enum_.name}(key: string): string {
  const obj = ${matches[1]};
  return obj[key];
}`,
      });
    }
  });
  return rtv;
}
