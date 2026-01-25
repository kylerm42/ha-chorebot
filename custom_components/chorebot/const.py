"""Constants for the ChoreBot integration."""

DOMAIN = "chorebot"

# OAuth2 endpoints for TickTick
OAUTH2_AUTHORIZE = "https://ticktick.com/oauth/authorize"
OAUTH2_TOKEN = "https://ticktick.com/oauth/token"
TICKTICK_API_BASE = "https://api.ticktick.com/open/v1"

# Storage keys
STORAGE_VERSION = 1
STORAGE_KEY_CONFIG = f"{DOMAIN}_config"

# Custom fields for tasks
FIELD_TAGS = "tags"
FIELD_RRULE = "rrule"
FIELD_STREAK_CURRENT = "streak_current"
FIELD_STREAK_LONGEST = "streak_longest"
FIELD_LAST_COMPLETED = "last_completed"
FIELD_POINTS_VALUE = "points_value"
FIELD_STREAK_BONUS_POINTS = "streak_bonus_points"
FIELD_STREAK_BONUS_INTERVAL = "streak_bonus_interval"
FIELD_DELETED_AT = "deleted_at"
FIELD_PARENT_UID = "parent_uid"
FIELD_IS_TEMPLATE = "is_template"
FIELD_OCCURRENCE_INDEX = "occurrence_index"
FIELD_IS_ALL_DAY = "is_all_day"
FIELD_SECTION_ID = "section_id"
FIELD_IS_DATELESS_RECURRING = "is_dateless_recurring"
# FIELD_TICKTICK_ID removed - now stored in sync.ticktick.id instead of custom_fields

# Configuration keys
CONF_SYNC_ENABLED = "sync_enabled"
CONF_SYNC_BACKEND = "sync_backend"  # "ticktick", "todoist", etc.
CONF_SYNC_INTERVAL_MINUTES = "sync_interval_minutes"
CONF_POINTS_DISPLAY = "points_display"
CONF_POINTS_TEXT = "text"
CONF_POINTS_ICON = "icon"

# Default values
DEFAULT_SYNC_INTERVAL_MINUTES = 15
DEFAULT_SYNC_BACKEND = "ticktick"
DEFAULT_POINTS_TEXT = "points"
DEFAULT_POINTS_ICON = ""

# Sync backends
BACKEND_TICKTICK = "ticktick"
# Future: BACKEND_TODOIST = "todoist", etc.

# Services
SERVICE_ADD_TASK = "add_task"
SERVICE_ADJUST_POINTS = "adjust_points"
SERVICE_CREATE_LIST = "create_list"
SERVICE_DELETE_REWARD = "delete_reward"
SERVICE_DELETE_TASK = "delete_task"
SERVICE_MANAGE_PERSON = "manage_person"
SERVICE_MANAGE_REWARD = "manage_reward"
SERVICE_MANAGE_SECTION = "manage_section"
SERVICE_REDEEM_REWARD = "redeem_reward"
SERVICE_SYNC = "sync"  # Generic sync service (was sync_ticktick)
SERVICE_SYNC_PEOPLE = "sync_people"
SERVICE_UPDATE_LIST = "update_list"
SERVICE_UPDATE_TASK = "update_task"
