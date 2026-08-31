export type ProposalStatus =
  | "pending_review"
  | "approved"
  | "promoted"
  | "rejected"
  | "superseded"
  | "retracted";

export type ProposalType =
  | "suggest_technology"
  | "suggest_relationship"
  | "suggest_retail_observation";

export type IdentifierInput = {
  type: string;
  value: string;
};

export type SuggestTechnologyPayload = {
  name: string;
  slug: string;
  entity_type: "product" | "hardware" | "os" | "mobile" | "other";
  identifiers?: IdentifierInput[];
};

export type SuggestRelationshipPayload = {
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string;
};

export interface AgentProposal {
  id: string;
  agent_id: string;
  proposal_type: ProposalType;
  status: ProposalStatus;
  payload: Record<string, unknown>;
  source_url: string;
  confidence: number;
  created_at: string;
  updated_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}
