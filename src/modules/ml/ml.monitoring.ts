import { pool } from '../../shared/db.js';
import { logger } from '../../utils/logger.js';
import type { ForecastResult, PredictionResult } from './ml.types.js';

export const savePrediction = async (
  modelType: string, inputData: Record<string, unknown>, result: Record<string, unknown>,
  options?: { doctorId?: number; userId?: number; bookingId?: number }, tenantId?: string
): Promise<void> => {
  try {
    const confidence = (result as unknown as PredictionResult).confidence || 'low';
    const columns = `model_type, input_data, prediction_result, confidence, doctor_id, user_id, booking_id${tenantId ? ', tenant_id' : ''}`;
    const values = `$1, $2, $3, $4, $5, $6, $7${tenantId ? ', $8' : ''}`;
    const params: (string | number | undefined)[] = [modelType, JSON.stringify(inputData), JSON.stringify(result), confidence, options?.doctorId, options?.userId, options?.bookingId];
    if (tenantId) params.push(tenantId);
    await pool.query(`INSERT INTO ml_prediction_history (${columns}) VALUES (${values})`, params);
  } catch (err) {
    logger.error('[ML] Error saving prediction:', (err as Error).message);
  }
};

export const saveModelMetrics = async (
  modelType: string, duration: number, samples: number, accuracy?: number,
  loss?: number, error?: string, tenantId?: string
): Promise<void> => {
  try {
    const status = error ? 'error' : 'success';
    const columns = `model_type, duration_ms, samples_used, accuracy, loss_value, status, error_message${tenantId ? ', tenant_id' : ''}`;
    const values = `$1, $2, $3, $4, $5, $6, $7${tenantId ? ', $8' : ''}`;
    const params: (string | number | undefined)[] = [modelType, duration, samples, accuracy, loss, status, error];
    if (tenantId) params.push(tenantId);
    await pool.query(`INSERT INTO ml_model_metrics (${columns}) VALUES (${values})`, params);
  } catch (err) {
    logger.error('[ML] Error saving metrics:', (err as Error).message);
  }
};

export const saveDemandForecast = async (forecasts: ForecastResult[], tenantId?: string): Promise<void> => {
  try {
    for (const f of forecasts) {
      const columns = `date, predicted_demand, confidence${tenantId ? ', tenant_id' : ''}`;
      const values = `$1, $2, $3${tenantId ? ', $4' : ''}`;
      const params: (string | number)[] = [f.date, f.predicted, f.confidence];
      if (tenantId) params.push(tenantId);
      await pool.query(`INSERT INTO ml_demand_forecast (${columns}) VALUES (${values})`, params);
    }
  } catch (err) {
    logger.error(`[ML] Error saving demand forecast: ${(err as Error).message}`, { error: (err as Error).stack });
  }
};

export const getPredictionHistory = async (modelType?: string, limit = 100, tenantId?: string): Promise<Record<string, unknown>[]> => {
  try {
    let query: string;
    const params: (string | number)[] = [];
    if (modelType && tenantId) { query = 'SELECT * FROM ml_prediction_history WHERE model_type = $1 AND tenant_id = $2 ORDER BY prediction_date DESC LIMIT $3'; params.push(modelType, tenantId, limit); }
    else if (modelType) { query = 'SELECT * FROM ml_prediction_history WHERE model_type = $1 ORDER BY prediction_date DESC LIMIT $2'; params.push(modelType, limit); }
    else if (tenantId) { query = 'SELECT * FROM ml_prediction_history WHERE tenant_id = $1 ORDER BY prediction_date DESC LIMIT $2'; params.push(tenantId, limit); }
    else { query = 'SELECT * FROM ml_prediction_history ORDER BY prediction_date DESC LIMIT $1'; params.push(limit); }
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    logger.error('[ML] Error getting prediction history:', (err as Error).message);
    return [];
  }
};

export const getModelMetricsHistory = async (modelType?: string, limit = 50, tenantId?: string): Promise<Record<string, unknown>[]> => {
  try {
    let query: string;
    const params: (string | number)[] = [];
    if (modelType && tenantId) { query = 'SELECT * FROM ml_model_metrics WHERE model_type = $1 AND tenant_id = $2 ORDER BY trained_at DESC LIMIT $3'; params.push(modelType, tenantId, limit); }
    else if (modelType) { query = 'SELECT * FROM ml_model_metrics WHERE model_type = $1 ORDER BY trained_at DESC LIMIT $2'; params.push(modelType, limit); }
    else if (tenantId) { query = 'SELECT * FROM ml_model_metrics WHERE tenant_id = $1 ORDER BY trained_at DESC LIMIT $2'; params.push(tenantId, limit); }
    else { query = 'SELECT * FROM ml_model_metrics ORDER BY trained_at DESC LIMIT $1'; params.push(limit); }
    const result = await pool.query(query, params);
    return result.rows;
  } catch (err) {
    logger.error('[ML] Error getting metrics history:', (err as Error).message);
    return [];
  }
};

export const getDemandForecastHistory = async (startDate?: string, endDate?: string, limit = 30, tenantId?: string): Promise<Record<string, unknown>[]> => {
  try {
    const params: (string | number)[] = [];
    if (startDate && endDate && tenantId) { params.push(startDate, endDate, tenantId, limit); const r = await pool.query('SELECT * FROM ml_demand_forecast WHERE date BETWEEN $1 AND $2 AND tenant_id = $3 ORDER BY date DESC LIMIT $4', params); return r.rows; }
    if (startDate && endDate) { params.push(startDate, endDate, limit); const r = await pool.query('SELECT * FROM ml_demand_forecast WHERE date BETWEEN $1 AND $2 ORDER BY date DESC LIMIT $3', params); return r.rows; }
    if (tenantId) { params.push(tenantId, limit); const r = await pool.query('SELECT * FROM ml_demand_forecast WHERE tenant_id = $1 ORDER BY date DESC LIMIT $2', params); return r.rows; }
    params.push(limit);
    const result = await pool.query('SELECT * FROM ml_demand_forecast ORDER BY date DESC LIMIT $1', params);
    return result.rows;
  } catch (err) {
    logger.error('[ML] Error getting demand forecast history:', (err as Error).message);
    return [];
  }
};
