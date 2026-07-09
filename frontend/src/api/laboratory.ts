import api from './axios';
import {
  getLabTests as moduleGetLabTests,
  createLabTest as moduleCreateLabTest,
  updateLabTest as moduleUpdateLabTest,
  deleteLabTest as moduleDeleteLabTest,
  getLabRequests as moduleGetLabRequests,
  getLabRequestById as moduleGetLabRequestById,
  createLabRequest as moduleCreateLabRequest,
  updateLabRequestStatus as moduleUpdateLabRequestStatus,
  cancelLabRequest as moduleCancelLabRequest,
  downloadLabOrderPdf as moduleDownloadLabOrderPdf,
  updateLabRequestItemResult as moduleUpdateLabRequestItemResult,
  getAllRequestsForLab as moduleGetAllRequestsForLab,
  getDashboardMetrics as moduleGetDashboardMetrics,
  getAreaDashboard as moduleGetAreaDashboard,
  getAnalyticsData as moduleGetAnalyticsData,
  getSamples as moduleGetSamples,
  getSampleById as moduleGetSampleById,
  createSample as moduleCreateSample,
  receiveSample as moduleReceiveSample,
  verifySample as moduleVerifySample,
  assignSample as moduleAssignSample,
  recordSampleQC as moduleRecordSampleQC,
  rejectSample as moduleRejectSample,
  getLabAreas as moduleGetLabAreas,
  createLabArea as moduleCreateLabArea,
  getQCRecords as moduleGetQCRecords,
  createQCRecord as moduleCreateQCRecord,
  getQCStatistics as moduleGetQCStatistics,
  getEquipment as moduleGetEquipment,
  createEquipment as moduleCreateEquipment,
  updateEquipment as moduleUpdateEquipment,
  getReagents as moduleGetReagents,
  createReagent as moduleCreateReagent,
  updateReagentStock as moduleUpdateReagentStock,
  getNotifications as moduleGetNotifications,
  acknowledgeNotification as moduleAcknowledgeNotification,
} from '../modules/laboratory/api/laboratory.api';

export type { LabTest, LabRequest, LabRequestItem, DashboardMetrics } from '../modules/laboratory/types';

// === Test Catalog ===
export const getLabTests = (params?: Record<string, unknown>): ReturnType<typeof moduleGetLabTests> => moduleGetLabTests(params);
export const createLabTest = (data: Record<string, unknown>): ReturnType<typeof moduleCreateLabTest> => moduleCreateLabTest(data);
export const updateLabTest = (id: number, data: Record<string, unknown>): ReturnType<typeof moduleUpdateLabTest> => moduleUpdateLabTest(id, data);
export const deleteLabTest = (id: number): ReturnType<typeof moduleDeleteLabTest> => moduleDeleteLabTest(id);

// === Lab Requests ===
export const getLabRequests = (params?: Record<string, unknown>): ReturnType<typeof moduleGetLabRequests> => moduleGetLabRequests(params);
export const getLabRequestById = (id: number): ReturnType<typeof moduleGetLabRequestById> => moduleGetLabRequestById(id);
export const createLabRequest = (data: Record<string, unknown>): ReturnType<typeof moduleCreateLabRequest> => moduleCreateLabRequest(data as any);
export const updateLabRequestStatus = (id: number, status: string): ReturnType<typeof moduleUpdateLabRequestStatus> => moduleUpdateLabRequestStatus(id, status as any);
export const cancelLabRequest = (id: number): ReturnType<typeof moduleCancelLabRequest> => moduleCancelLabRequest(id);
export const downloadLabOrderPdf = (id: number): ReturnType<typeof moduleDownloadLabOrderPdf> => moduleDownloadLabOrderPdf(id);

// === Results (alias for DoctorLabResultsPage compat) ===
export const updateLabResultItem = (id: string, itemId: string, data: Record<string, unknown>): ReturnType<typeof moduleUpdateLabRequestItemResult> =>
  moduleUpdateLabRequestItemResult(Number(itemId), data as any);

// === Lab Technician ===
export const getAllLabRequestsForLab = (status?: string): ReturnType<typeof moduleGetAllRequestsForLab> => moduleGetAllRequestsForLab(status);

// === Dashboard ===
export const getLabDashboardMetrics = (): ReturnType<typeof moduleGetDashboardMetrics> => moduleGetDashboardMetrics();
export const getLabAreaDashboard = (areaId: number): ReturnType<typeof moduleGetAreaDashboard> => moduleGetAreaDashboard(areaId);
export const getLabAnalytics = (): ReturnType<typeof moduleGetAnalyticsData> => moduleGetAnalyticsData();

// === Samples ===
export const getLabSamples = (params?: Record<string, unknown>): ReturnType<typeof moduleGetSamples> => moduleGetSamples(params);
export const getLabSampleById = (id: string): ReturnType<typeof moduleGetSampleById> => moduleGetSampleById(Number(id));
export const createLabSample = (data: Record<string, unknown>): ReturnType<typeof moduleCreateSample> => moduleCreateSample(data);
export const receiveLabSample = (id: string, data: Record<string, unknown>): ReturnType<typeof moduleReceiveSample> => moduleReceiveSample(Number(id), data);
export const verifyLabSample = (id: string): ReturnType<typeof moduleVerifySample> => moduleVerifySample(Number(id));
export const assignLabSample = (id: string, data: Record<string, unknown>): ReturnType<typeof moduleAssignSample> => moduleAssignSample(Number(id), data as any);
export const recordSampleQC = (id: string, data: Record<string, unknown>): ReturnType<typeof moduleRecordSampleQC> => moduleRecordSampleQC(Number(id), data as any);
export const rejectLabSample = (id: string, data: Record<string, unknown>): ReturnType<typeof moduleRejectSample> => moduleRejectSample(Number(id), data.rejection_reason || '');

// === Areas ===
export const getLabAreas = (): ReturnType<typeof moduleGetLabAreas> => moduleGetLabAreas();
export const createLabArea = (data: Record<string, unknown>): ReturnType<typeof moduleCreateLabArea> => moduleCreateLabArea(data);

// === QC Records ===
export const getLabQCRecords = (): ReturnType<typeof moduleGetQCRecords> => moduleGetQCRecords();
export const createLabQCRecord = (data: Record<string, unknown>): ReturnType<typeof moduleCreateQCRecord> => moduleCreateQCRecord(data);
export const getLabQCStatistics = (): ReturnType<typeof moduleGetQCStatistics> => moduleGetQCStatistics();

// === Equipment ===
export const getLabEquipment = (): ReturnType<typeof moduleGetEquipment> => moduleGetEquipment();
export const createLabEquipment = (data: Record<string, unknown>): ReturnType<typeof moduleCreateEquipment> => moduleCreateEquipment(data);
export const updateLabEquipment = (id: string, data: Record<string, unknown>): ReturnType<typeof moduleUpdateEquipment> => moduleUpdateEquipment(Number(id), data);

// === Reagents ===
export const getLabReagents = (): ReturnType<typeof moduleGetReagents> => moduleGetReagents();
export const createLabReagent = (data: Record<string, unknown>): ReturnType<typeof moduleCreateReagent> => moduleCreateReagent(data);
export const updateLabReagentStock = (id: string, data: Record<string, unknown>): ReturnType<typeof moduleUpdateReagentStock> => moduleUpdateReagentStock(Number(id), data.quantity as number);

// === Notifications ===
export const getLabNotifications = (): ReturnType<typeof moduleGetNotifications> => moduleGetNotifications();
export const acknowledgeLabNotification = (id: string): ReturnType<typeof moduleAcknowledgeNotification> => moduleAcknowledgeNotification(Number(id));

// === Clinical Records (not in module API) ===
export const getLabResultsByClinicalRecord = async (clinicalRecordId: string): Promise<any[]> => {
  const res = await api.get(`/clinical-records/${clinicalRecordId}/lab-results`);
  return res.data;
};
