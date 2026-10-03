import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api-client";
import { changeKnowledgeGoalStatus, createKnowledgeGoal, queueKnowledgeRun, materializeLearningDraft, rollbackLearningDraft, listLearningDrafts } from "./admin-knowledge";
vi.mock("./api-client",()=>({apiRequest:vi.fn().mockResolvedValue({})}));
const request=vi.mocked(apiRequest); const id="11111111-1111-4111-8111-111111111111";
beforeEach(()=>request.mockClear());
describe("knowledge intake contracts",()=>{
 it("creates a bounded allowlisted goal",async()=>{await createKnowledgeGoal({name:"Java",topic:"Java",objective:"Collect official updates",autoPublish:false,dailyItemLimit:20,dailyCostLimitUsd:10,scheduleCron:null,allowedDomains:["docs.oracle.com"]});expect(request).toHaveBeenCalledWith("/admin/knowledge/goals",{method:"POST",body:expect.objectContaining({allowedDomains:["docs.oracle.com"]})});});
 it("queues runs and changes status with reason",async()=>{await changeKnowledgeGoalStatus(id,"ACTIVE","Enable research");expect(request).toHaveBeenCalledWith(`/admin/knowledge/goals/${id}/status`,{method:"PATCH",body:{status:"ACTIVE",reason:"Enable research"}});await queueKnowledgeRun(id,"Manual review");expect(request).toHaveBeenLastCalledWith(`/admin/knowledge/goals/${id}/runs`,{method:"POST",body:{reason:"Manual review"}});});
 it("materializes and withdraws using authenticated API routes and reasons",async()=>{await materializeLearningDraft(id,id," Checked ");expect(request).toHaveBeenLastCalledWith(`/admin/knowledge/drafts/${id}/materialize`,{method:"POST",body:{moduleId:id,reason:"Checked"}});await rollbackLearningDraft(id,"Incorrect answer");expect(request).toHaveBeenLastCalledWith(`/admin/knowledge/drafts/${id}/rollback`,{method:"POST",body:{reason:"Incorrect answer"}});});
 it("loads approved drafts with pagination",async()=>{await listLearningDrafts("APPROVED",2);expect(request).toHaveBeenCalledWith("/admin/knowledge/drafts?status=APPROVED&page=2&size=20",{signal:undefined});});
 it("rejects invalid materialization and withdrawal before network",()=>{expect(()=>materializeLearningDraft(id,"bad","Checked")).toThrow();expect(()=>rollbackLearningDraft(id," ")).toThrow();expect(request).not.toHaveBeenCalled();});
 it("rejects invalid identifiers/reasons before network",async()=>{expect(()=>changeKnowledgeGoalStatus("../x","ACTIVE","reason")).toThrow();expect(()=>queueKnowledgeRun(id," ")).toThrow();expect(request).not.toHaveBeenCalled();});
});
