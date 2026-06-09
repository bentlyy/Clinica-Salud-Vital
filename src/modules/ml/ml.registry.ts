import { logger } from '../../utils/logger.js';
import { mlCache } from './ml.cache.js';
import { noShowModel, diagnosisModel, demandModel, vitalAnomalyModel, setNoShowModel, setDiagnosisModel, setDemandModel, setVitalAnomalyModel } from './ml.shared.js';
import type { ModelStatus } from './ml.types.js';

export const getModelStatus = async (tenantId?: string): Promise<ModelStatus> => {
  return {
    noShowModel: noShowModel?.trained ? 'trained' : 'not_trained',
    diagnosisModel: diagnosisModel?.trained ? 'trained' : 'not_trained',
    demandModel: demandModel?.trained ? 'trained' : 'not_trained',
    vitalAnomalyModel: vitalAnomalyModel?.trained ? 'trained' : 'not_trained',
    cacheStats: mlCache.getStats()
  };
};

export const disposeAllModels = (tenantId?: string): void => {
  if (noShowModel && typeof noShowModel.dispose === 'function') { noShowModel.dispose(); setNoShowModel(null); }
  if (diagnosisModel && typeof diagnosisModel.dispose === 'function') { diagnosisModel.dispose(); setDiagnosisModel(null); }
  if (demandModel && typeof demandModel.dispose === 'function') { demandModel.dispose(); setDemandModel(null); }
  logger.info('[ML] All models disposed');
};
