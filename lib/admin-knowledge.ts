import { apiRequest } from "./api-client";
import { isUuid } from "./admin-content";
export type GoalStatus = "DRAFT"|"ACTIVE"|"PAUSED"|"ARCHIVED";
export type KnowledgeGoal = { id:string; name:string; topic:string; objective:string; status:GoalStatus; autoPublish:boolean; dailyItemLimit:number; dailyCostLimitUsd:number; scheduleCron:string|null; allowedDomains:string[]; updatedAt:string };
export type IntakeRun = { id:string; goalId:string; status:string; discoveredCount:number; acceptedCount:number; rejectedCount:number; costUsd:number; errorMessage:string|null; createdAt:string; startedAt:string|null; finishedAt:string|null };
const reason=(id:string,value:string)=>{if(!isUuid(id)||!value.trim()||value.length>500)throw new Error("Invalid id or reason");return value.trim();};
export function createKnowledgeGoal(body: Omit<KnowledgeGoal,"id"|"status"|"updatedAt">){return apiRequest<KnowledgeGoal>("/admin/knowledge/goals",{method:"POST",body});}
export function changeKnowledgeGoalStatus(id:string,status:GoalStatus,why:string){return apiRequest<KnowledgeGoal>(`/admin/knowledge/goals/${id}/status`,{method:"PATCH",body:{status,reason:reason(id,why)}});}
export function queueKnowledgeRun(id:string,why:string){return apiRequest<IntakeRun>(`/admin/knowledge/goals/${id}/runs`,{method:"POST",body:{reason:reason(id,why)}});}
export type DraftKind = "QUESTION"|"FLASHCARD"|"INTERVIEW";
export type LearningDraft = {id:string;goalId:string|null;kind:DraftKind;title:string;payloadJson:string;sourceIds:string[];status:"REVIEW"|"APPROVED"|"REJECTED";model:string|null;tokensUsed:number;costUsd:number;createdAt:string;reviewedAt:string|null;reviewReason:string|null};
export type DraftPage = {items:LearningDraft[];page:number;size:number;totalElements:number;totalPages:number};
export function listLearningDrafts(status:LearningDraft["status"]="REVIEW",page=1,signal?:AbortSignal){return apiRequest<DraftPage>(`/admin/knowledge/drafts?status=${status}&page=${page}&size=20`,{signal});}
export function reviewLearningDraft(id:string,status:"APPROVED"|"REJECTED",why:string){return apiRequest<LearningDraft>(`/admin/knowledge/drafts/${id}/review`,{method:"PATCH",body:{status,reason:reason(id,why)}});}
export function materializeLearningDraft(id:string,moduleId:string,why:string){if(!isUuid(moduleId))throw new Error("Invalid module id");return apiRequest<{questionId:string}>(`/admin/knowledge/drafts/${id}/materialize`,{method:"POST",body:{moduleId,reason:reason(id,why)}});}
export function rollbackLearningDraft(id:string,why:string){return apiRequest<{questionId:string}>(`/admin/knowledge/drafts/${id}/rollback`,{method:"POST",body:{reason:reason(id,why)}});}
