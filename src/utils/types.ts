// ============================================================================
// Shared TypeScript Interfaces for ChoreBot Cards
// ============================================================================

export interface HomeAssistant {
  states: { [entity_id: string]: HassEntity };
  callService: (domain: string, service: string, data: any) => Promise<void>;
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: {
    friendly_name?: string;
    chorebot_tasks?: Task[];
    chorebot_templates?: RecurringTemplate[];
    chorebot_sections?: Section[];
    chorebot_tags?: string[];
    chorebot_metadata?: {
      person_id?: string;
      [key: string]: any;
    };
    [key: string]: any;
  };
}

export interface Section {
  id: string;
  name: string;
  sort_order: number;
  person_id?: string; // Optional person assignment (overrides list person_id)
}

export interface ChoreBotBaseConfig {
  entity: string;
  title?: string;
  show_title?: boolean;
  show_progress?: boolean;
  hide_card_background?: boolean;
  show_dateless_tasks?: boolean;
  filter_section_id?: string;
  accent_color?: string;
  task_text_color?: string;
  show_points?: boolean; // Default: true
}

export interface Task {
  uid: string;
  summary: string;
  status: "needs_action" | "completed";
  due?: string;
  description?: string;
  last_completed?: string;
  parent_uid?: string;
  tags?: string[];
  is_all_day?: boolean;
  section_id?: string;
  points_value?: number;
  streak_bonus_points?: number;
  streak_bonus_interval?: number;
  occurrence_index?: number;
  rrule?: string;
  sync?: { [backend: string]: any };
  /**
   * Pre-computed person assignment from backend
   * Resolved via: task.section_id → section.person_id → list.person_id → null
   * Read-only field computed in extra_state_attributes
   */
  computed_person_id?: string;
}

export interface RecurringTemplate {
  uid: string;
  summary: string;
  status: string;
  created: string;
  modified: string;
  description?: string;
  tags?: string[];
  rrule: string;
  streak_current: number;
  streak_longest: number;
  is_template: boolean;
  points_value?: number;
  streak_bonus_points?: number;
  streak_bonus_interval?: number;
  is_all_day?: boolean;
  section_id?: string;
}

export interface EditingTask extends Task {
  has_due_date?: boolean;
  due_date?: string | null;
  due_time?: string;
  has_recurrence?: boolean;
  recurrence_frequency?: "DAILY" | "WEEKLY" | "MONTHLY";
  recurrence_interval?: number;
  recurrence_byweekday?: string[];
  recurrence_bymonthday?: number;
  points_value?: number;
  streak_bonus_points?: number;
  streak_bonus_interval?: number;
}

export interface Progress {
  completed: number;
  total: number;
}

export interface GroupState {
  name: string;
  tasks: Task[];
  isCollapsed: boolean;
}

// ============================================================================
// Points & Rewards Interfaces
// ============================================================================

export interface ChoreBotRewardsConfig {
  type: "custom:chorebot-rewards-card";
  title?: string;
  show_title?: boolean;
  hide_card_background?: boolean;
  show_people_section?: boolean; // Default: true
  show_disabled_rewards?: boolean; // Default: false
  sort_by?: "cost" | "name" | "created"; // Default: "cost"
}

export interface ChoreBotPersonPointsConfig {
  type: "custom:chorebot-person-points-card";
  person_entity: string; // Required - e.g., "person.kyle"
  title?: string;
  show_title?: boolean;
  hide_card_background?: boolean;
  show_progress?: boolean; // Default: true
  accent_color?: string; // Default: var(--primary-color) - used for progress bar and points text
  progress_text_color?: string; // Default: var(--text-primary-color)
}

export interface ChoreBotPersonRewardsConfig {
  type: "custom:chorebot-person-rewards-card";
  person_entity: string; // Required - e.g., "person.kyle"
  title?: string;
  show_title?: boolean;
  hide_card_background?: boolean;
  show_disabled_rewards?: boolean; // Default: false
  sort_by?: "cost" | "name" | "created"; // Default: "cost"
  show_add_reward_button?: boolean; // Default: true
  accent_color?: string; // Default: var(--primary-color) - used for icons, costs, and buttons
}

export interface PersonPoints {
  entity_id: string;
  points_balance: number;
  lifetime_points: number;
  last_updated: string;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
  icon: string;
  enabled: boolean;
  description: string;
  created?: string;
  modified?: string;
  person_id: string; // Required: Person this reward belongs to
}

export interface Transaction {
  id: string;
  timestamp: string;
  person_id: string;
  amount: number;
  balance_after: number;
  type: string;
  metadata: { [key: string]: any };
}
