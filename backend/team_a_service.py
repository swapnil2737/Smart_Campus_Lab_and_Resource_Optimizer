from datetime import datetime

try:
    from team_a.engine import TeamAEngine
    from team_a.process import BookingProcess
except ModuleNotFoundError as error:
    if error.name != "team_a":
        raise
    TeamAEngine = None
    BookingProcess = None


# One Team A engine for this backend process
team_a_engine = TeamAEngine() if TeamAEngine else None


def priority_for_role(role):
    """
    Team A uses LOWER number = HIGHER priority.

    Faculty = 1
    Student = 2
    Other = 3
    """

    role = (role or "").upper()

    if role == "FACULTY":
        return 1

    if role == "STUDENT":
        return 2

    return 3


def submit_to_team_a(
    request_id,
    role,
    start_time,
    end_time,
    resource_type="PC"
):
    start = datetime.fromisoformat(start_time)
    end = datetime.fromisoformat(end_time)

    duration_minutes = (end - start).total_seconds() / 60

    if duration_minutes <= 0:
        raise ValueError("End time must be after start time.")

    priority = priority_for_role(role)

    if team_a_engine is None:
        return {
            "requestId": request_id,
            "priority": priority,
            "queuePosition": None,
            "algorithm": None,
            "orderedRequestIds": [],
            "teamAStatus": "UNAVAILABLE"
        }

    process = BookingProcess(
        request_id=str(request_id),
        arrival_time=0,
        burst_time=duration_minutes,
        priority=priority,
        resource_type_needed=resource_type
    )

    team_a_engine.submit_process(process)

    result = team_a_engine.schedule("PRIORITY")

    ordered_ids = result.ordered_request_ids

    position = None

    if str(request_id) in ordered_ids:
        position = ordered_ids.index(str(request_id)) + 1

    return {
        "requestId": request_id,
        "priority": priority,
        "queuePosition": position,
        "algorithm": result.algorithm,
        "orderedRequestIds": ordered_ids,
        "teamAStatus": "SCHEDULED"
    }


def get_team_a_status(request_id):
    if team_a_engine is None:
        return {
            "found": False,
            "status": "UNAVAILABLE"
        }

    state = team_a_engine.get_process_state(str(request_id))

    if state is None:
        return {
            "found": False,
            "status": "NOT_FOUND"
        }

    return {
        "found": True,
        "status": state.value
    }