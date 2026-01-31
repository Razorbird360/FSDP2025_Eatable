from prometheus_client import Counter, Gauge, Histogram

ws_active_connections = Gauge(
    "ai_ws_active_connections",
    "Active ID verification websocket connections",
)

ws_messages_total = Counter(
    "ai_ws_messages_total",
    "Websocket messages received",
    ["type"],
)

id_frames_total = Counter(
    "ai_id_frames_total",
    "ID verification frames processed",
)

id_valid_detections_total = Counter(
    "ai_id_valid_detections_total",
    "ID frames with valid detections",
)

id_lock_events_total = Counter(
    "ai_id_lock_events_total",
    "ID card lock events",
)

face_validation_total = Counter(
    "ai_face_validation_total",
    "Face validation outcomes",
    ["result"],
)

frame_processing_seconds = Histogram(
    "ai_frame_processing_seconds",
    "Frame processing duration",
    ["stage"],
)
