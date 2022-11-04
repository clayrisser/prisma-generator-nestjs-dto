import {
  DTO_RELATION_AS_PROPERTY_ON_CREATE,
  DTO_RELATION_CAN_CONNECT_ON_UPDATE,
  DTO_RELATION_CAN_CREATE_ON_UPDATE,
  DTO_RELATION_CAN_CONNECT_OR_CREATE_ON_UPDATE,
  DTO_RELATION_MODIFIERS_ON_UPDATE,
  DTO_UPDATE_OPTIONAL,
} from '../annotations';
import {
  isAnnotatedWith,
  isAnnotatedWithOneOf,
  isId,
  isReadOnly,
  isRelation,
  isRequiredWithDefaultValue,
  isUpdatedAt,
} from '../field-classifiers';
import {
  concatIntoArray,
  concatUniqueIntoArray,
  generateRelationInput,
  getRelationScalars,
  makeImportsFromPrismaClient,
  mapDMMFToParsedField,
  zipImportStatementParams,
} from '../helpers';

import type { DMMF } from '@prisma/generator-helper';
import type { TemplateHelpers } from '../template-helpers';
import type {
  Model,
  UpdateDtoParams,
  ImportStatementParams,
  ParsedField,
  IApiProperty,
} from '../types';
import { parseApiProperty } from '../api-decorator';
import { IClassValidator } from '../types';
import { parseClassValidators } from '../class-validator';

interface ComputeUpdateDtoParamsParam {
  model: Model;
  allModels: Model[];
  templateHelpers: TemplateHelpers;
  dmmf: DMMF.Document;
  annotateAllDtoProperties: boolean;
}

export const computeUpdateDtoParams = ({
  model,
  allModels,
  templateHelpers,
  dmmf,
  annotateAllDtoProperties,
}: ComputeUpdateDtoParamsParam): UpdateDtoParams => {
  let hasApiProperty = false;
  const imports: ImportStatementParams[] = [];
  const extraClasses: string[] = [];
  const apiExtraModels: string[] = [];
  const classValidators: IClassValidator[] = [];

  const relationScalarFields = getRelationScalars(model.fields);
  const relationScalarFieldNames = Object.keys(relationScalarFields);

  const fields = model.fields.reduce((result, field) => {
    const { name } = field;
    const overrides: Partial<DMMF.Field> = { isRequired: false };
    const decorators: {
      apiProperties?: IApiProperty[];
      classValidators?: IClassValidator[];
    } = {};

    if (isReadOnly(field)) return result;
    if (isRelation(field)) {
      if (!isAnnotatedWithOneOf(field, DTO_RELATION_MODIFIERS_ON_UPDATE)) {
        return result;
      }
      const relationInputType = generateRelationInput({
        field,
        model,
        allModels,
        templateHelpers,
        preAndSuffixClassName: templateHelpers.updateDtoName,
        canCreateAnnotation: DTO_RELATION_CAN_CREATE_ON_UPDATE,
        canCreateAsPropertyAnnotation: DTO_RELATION_AS_PROPERTY_ON_CREATE,
        canConnectAnnotation: DTO_RELATION_CAN_CONNECT_ON_UPDATE,
        canConnectOrCreateAnnotation:
          DTO_RELATION_CAN_CONNECT_OR_CREATE_ON_UPDATE,
      });

      overrides.type = relationInputType.type;
      overrides.isList = false;

      concatIntoArray(relationInputType.imports, imports);
      concatIntoArray(relationInputType.generatedClasses, extraClasses);
      if (!templateHelpers.config.noDependencies)
        concatIntoArray(relationInputType.apiExtraModels, apiExtraModels);
    }
    if (relationScalarFieldNames.includes(name)) return result;

    // fields annotated with @DtoReadOnly are filtered out before this
    // so this safely allows to mark fields that are required in Prisma Schema
    // as **not** required in UpdateDTO
    const isDtoOptional = isAnnotatedWith(field, DTO_UPDATE_OPTIONAL);

    if (!isDtoOptional) {
      if (isId(field)) return result;
      if (isUpdatedAt(field)) return result;
      if (isRequiredWithDefaultValue(field)) return result;
    }

    if (templateHelpers.config.classValidation) {
      decorators.classValidators = parseClassValidators(
        {
          ...field,
          ...overrides,
        },
        dmmf,
      );
      concatUniqueIntoArray(
        decorators.classValidators,
        classValidators,
        'name',
      );
    }

    if (!templateHelpers.config.noDependencies) {
      decorators.apiProperties = parseApiProperty(field);
      if (decorators.apiProperties.length) hasApiProperty = true;
    }

    if (templateHelpers.config.noDependencies) {
      if (field.type === 'Json') field.type = 'Object';
      else if (field.type === 'Decimal') field.type = 'Float';
    }

    return [...result, mapDMMFToParsedField(field, overrides, decorators)];
  }, [] as ParsedField[]);

  if (apiExtraModels.length || hasApiProperty || annotateAllDtoProperties) {
    const destruct = [];
    if (apiExtraModels.length) destruct.push('ApiExtraModels');
    if (hasApiProperty || annotateAllDtoProperties) {
      destruct.push('ApiProperty');
    }
    imports.unshift({ from: '@nestjs/swagger', destruct });
  }

  if (classValidators.length) {
    imports.unshift({
      from: 'class-validator',
      destruct: classValidators
        .map((v) => v.name)
        .filter((v) => v != 'Type')
        .sort(),
    });
    imports.unshift({
      from: 'class-transformer',
      destruct: ['Type'],
    });
  }

  const importPrismaClient = makeImportsFromPrismaClient(fields);
  if (importPrismaClient) imports.unshift(importPrismaClient);

  return {
    model,
    fields,
    imports: zipImportStatementParams(imports),
    extraClasses,
    apiExtraModels,
    annotateAllDtoProperties,
  };
};
