import { TemplateHelpers } from '../template-helpers';
import { computeConnectDtoParams } from './compute-connect-dto-params';
import { computeCreateDtoParams } from './compute-create-dto-params';
import { computeUpdateDtoParams } from './compute-update-dto-params';
import { computeEntityParams } from './compute-entity-params';
import { computePlainDtoParams } from './compute-plain-dto-params';

import type { Model, ModelParams } from '../types';

interface ComputeModelParamsParam {
  model: Model;
  allModels: Model[];
  templateHelpers: TemplateHelpers;
  noDependencies: boolean;
}
export const computeModelParams = ({
  model,
  allModels,
  templateHelpers,
  noDependencies,
}: ComputeModelParamsParam): ModelParams => ({
  // TODO find out if model needs `ConnectDTO`
  connect: computeConnectDtoParams({ model }),
  create: computeCreateDtoParams({
    model,
    allModels, // ? should this be `allModels: models` instead
    templateHelpers,
    noDependencies,
  }),
  update: computeUpdateDtoParams({
    model,
    allModels,
    templateHelpers,
    noDependencies,
  }),
  entity: computeEntityParams({
    model,
    allModels,
    templateHelpers,
    noDependencies,
  }),
  plain: computePlainDtoParams({
    model,
    allModels,
    templateHelpers,
    noDependencies,
  }),
});
