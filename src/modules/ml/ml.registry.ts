import { logger } from '../../utils/logger.js';
import { mlCache } from './ml.cache.js';
import { noShowModel, demandModel, vitalAnomalyModel, setNoShowModel, setDemandModel, setVitalAnomalyModel } from './ml.shared.js';
import type { ModelStatus } from './ml.types.js';

export const getModelStatus = async (tenantId?: string): Promise<ModelStatus> => {
  return {
    noShowModel: noShowModel?.trained ? 'trained' : 'not_trained',
    demandModel: demandModel?.trained ? 'trained' : 'not_trained',
    vitalAnomalyModel: vitalAnomalyModel?.trained ? 'trained' : 'not_trained',
    cacheStats: mlCache.getStats()
  };
};

export const disposeAllModels = (tenantId?: string): void => {
  setNoShowModel(null);
  setDemandModel(null);
  setVitalAnomalyModel(null);
  mlCache.clear();
  logger.info('[ML] All models disposed');
};
