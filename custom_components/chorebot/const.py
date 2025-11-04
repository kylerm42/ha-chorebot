"""Constants for the ChoreBot integration."""

DOMAIN = "chorebot"

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
CONF_TICKTICK_ENABLED = "ticktick_enabled"
CONF_TICKTICK_CLIENT_ID = "ticktick_client_id"
CONF_TICKTICK_CLIENT_SECRET = "ticktick_client_secret"
CONF_TICKTICK_USERNAME = "ticktick_username"
CONF_TICKTICK_OAUTH_TOKEN = "ticktick_oauth_token"
CONF_LIST_MAPPINGS = "list_mappings"
CONF_SYNC_INTERVAL_MINUTES = "sync_interval_minutes"

# Default values
DEFAULT_SYNC_INTERVAL_MINUTES = 15

# Services
SERVICE_ADD_TASK = "add_task"
SERVICE_CREATE_LIST = "create_list"
SERVICE_REDEEM_ITEM = "redeem_item"
SERVICE_SYNC_TICKTICK = "sync_ticktick"
