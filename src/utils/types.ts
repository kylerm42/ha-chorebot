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
    [key: string]: any;
  };
}

export interface Section {
  id: string;
  name: string;
  sort_order: number;
}

export interface ChoreBotBaseConfig {
  entity: string;
  title?: string;
  show_title?: boolean;
  show_progress?: boolean;
  hide_card_background?: boolean;
  show_dateless_tasks?: boolean;
  filter_section_id?: string;
  task_background_color?: string;
  task_text_color?: string;
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
  custom_fields?: {
    tags?: string[];
    is_all_day?: boolean;
    parent_uid?: string;
    occurrence_index?: number;
    rrule?: string;
    section_id?: string;
    last_completed?: string;
  };
}

export interface RecurringTemplate {
  uid: string;
  streak_current: number;
  streak_longest: number;
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
