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
FIELD_DELETED_AT = "deleted_at"
FIELD_PARENT_UID = "parent_uid"
FIELD_IS_TEMPLATE = "is_template"
FIELD_OCCURRENCE_INDEX = "occurrence_index"
FIELD_TICKTICK_ID = "ticktick_id"

# Configuration keys
CONF_SYNC_ENABLED = "sync_enabled"
CONF_SYNC_BACKEND = "sync_backend"  # "ticktick", "todoist", etc.
CONF_LIST_MAPPINGS = "list_mappings"
CONF_SYNC_INTERVAL_MINUTES = "sync_interval_minutes"

# Default values
DEFAULT_SYNC_INTERVAL_MINUTES = 15
DEFAULT_SYNC_BACKEND = "ticktick"

# Sync backends
BACKEND_TICKTICK = "ticktick"
# Future: BACKEND_TODOIST = "todoist", etc.

# Services
SERVICE_ADD_TASK = "add_task"
SERVICE_CREATE_LIST = "create_list"
SERVICE_REDEEM_ITEM = "redeem_item"
SERVICE_SYNC = "sync"  # Generic sync service (was sync_ticktick)
