import { DTO_ENTITY_HIDDEN } from '../annotations';
import { isAnnotatedWith, isRelation } from '../field-classifiers';
import {
  getRelationScalars,
  makeImportsFromPrismaClient,
  mapDMMFToParsedField,
  zipImportStatementParams,
} from '../helpers';

import type { DMMF } from '@prisma/generator-helper';
import type { TemplateHelpers } from '../template-helpers';
import type {
  Model,
  ImportStatementParams,
  ParsedField,
  PlainDtoParams,
} from '../types';
import { isAnnotatedWithDoc, PrismaScalarToFormat } from '../api-decorator';

interface ComputePlainDtoParamsParam {
  model: Model;
  allModels: Model[];
  templateHelpers: TemplateHelpers;
}
export const computePlainDtoParams = ({
  model,
  allModels,
  templateHelpers,
}: ComputePlainDtoParamsParam): PlainDtoParams => {
  let hasEnum = false;
  let hasDoc = false;
  let hasSpecialType = false;
  const imports: ImportStatementParams[] = [];
  const apiExtraModels: string[] = [];

  const relationScalarFields = getRelationScalars(model.fields);
  const relationScalarFieldNames = Object.keys(relationScalarFields);

  const fields = model.fields.reduce((result, field) => {
    const { name } = field;
    const overrides: Partial<DMMF.Field> = {
      isRequired: true,
      isNullable: !field.isRequired,
    };

    if (isAnnotatedWith(field, DTO_ENTITY_HIDDEN)) return result;

    if (isRelation(field)) return result;
    if (relationScalarFieldNames.includes(name)) return result;

    if (PrismaScalarToFormat[field.type]) hasSpecialType = true;

    if (field.kind === 'enum') hasEnum = true;

    if (isAnnotatedWithDoc(field)) hasDoc = true;

    return [...result, mapDMMFToParsedField(field, overrides)];
  }, [] as ParsedField[]);

  if (apiExtraModels.length || hasEnum || hasDoc || hasSpecialType) {
    const destruct = [];
    if (apiExtraModels.length) destruct.push('ApiExtraModels');
    if (hasEnum || hasDoc || hasSpecialType) destruct.push('ApiProperty');
    imports.unshift({ from: '@nestjs/swagger', destruct });
  }

  const importPrismaClient = makeImportsFromPrismaClient(fields);
  if (importPrismaClient) imports.unshift(importPrismaClient);

  return {
    model,
    fields,
    imports: zipImportStatementParams(imports),
    apiExtraModels,
  };
};
