import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SuggestTechnologyPayload, SuggestRelationshipPayload, AgentProposal } from "./types";

export async function submitTechnologyProposal(
  payload: SuggestTechnologyPayload,
  sourceUrl: string,
  confidence: number
): Promise<{ id?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_agent_proposal", {
    p_type: "suggest_technology",
    p_payload: payload,
    p_source: sourceUrl,
    p_confidence: confidence,
  });

  if (error) {
    return { error: error.message };
  }
  return { id: data as string };
}

export async function submitRelationshipProposal(
  payload: SuggestRelationshipPayload,
  sourceUrl: string,
  confidence: number
): Promise<{ id?: string; error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_agent_proposal", {
    p_type: "suggest_relationship",
    p_payload: payload,
    p_source: sourceUrl,
    p_confidence: confidence,
  });

  if (error) {
    return { error: error.message };
  }
  return { id: data as string };
}

export async function approveProposal(proposalId: string, status: "approved" | "rejected"): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("approve_agent_proposal", {
    p_proposal_id: proposalId,
    p_target_status: status,
  });

  if (error) {
    return { error: error.message };
  }
  return {};
}

export async function promoteTechnologyProposal(proposalId: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("promote_technology_proposal", {
    p_proposal_id: proposalId,
  });

  if (error) {
    return { error: error.message };
  }
  return {};
}

export async function promoteRelationshipProposal(proposalId: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("promote_relationship_proposal", {
    p_proposal_id: proposalId,
  });

  if (error) {
    return { error: error.message };
  }
  return {};
}
