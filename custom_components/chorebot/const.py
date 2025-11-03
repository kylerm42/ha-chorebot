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

# Configuration keys
CONF_TICKTICK_ENABLED = "ticktick_enabled"
CONF_TICKTICK_CLIENT_ID = "ticktick_client_id"
CONF_TICKTICK_CLIENT_SECRET = "ticktick_client_secret"

# Services
SERVICE_ADD_TASK = "add_task"
SERVICE_CREATE_LIST = "create_list"
SERVICE_REDEEM_ITEM = "redeem_item"
