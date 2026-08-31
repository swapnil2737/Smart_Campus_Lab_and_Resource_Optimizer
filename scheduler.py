from __future__ import annotations

from collections import deque
from enum import Enum
from typing import Iterable

from process import BookingProcess, ProcessState


class SchedulingAlgorithm(Enum):
    FCFS = "FCFS"
    SJF = "SJF"
    PRIORITY = "PRIORITY"
    ROUND_ROBIN = "ROUND_ROBIN"


def _validate_processes(processes: Iterable[BookingProcess]) -> list[BookingProcess]:
    result = list(processes)

    if not result:
        return []

    if len({p.request_id for p in result}) != len(result):
        raise ValueError("request_id values must be unique.")

    for p in result:
        if p.state != ProcessState.READY:
            raise ValueError(
                f"{p.request_id} must be READY before scheduling; "
                f"current state is {p.state.value}."
            )

    return result


def fcfs(processes: Iterable[BookingProcess]) -> list[BookingProcess]:
    """First-Come, First-Served: earliest arrival first."""
    items = _validate_processes(processes)

    return sorted(
        items,
        key=lambda p: (p.arrival_time, p.request_id),
    )


def sjf(processes: Iterable[BookingProcess]) -> list[BookingProcess]:
    """
    Non-preemptive Shortest Job First.

    At each scheduling decision, select the shortest burst among processes
    that have already arrived.
    """
    items = _validate_processes(processes)

    if not items:
        return []

    pending = sorted(items, key=lambda p: (p.arrival_time, p.request_id))
    ready: list[BookingProcess] = []
    result: list[BookingProcess] = []

    time = 0.0
    index = 0

    while index < len(pending) or ready:
        while index < len(pending) and pending[index].arrival_time <= time:
            ready.append(pending[index])
            index += 1

        if not ready:
            time = pending[index].arrival_time
            continue

        ready.sort(
            key=lambda p: (
                p.burst_time,
                p.arrival_time,
                p.request_id,
            )
        )

        process = ready.pop(0)
        result.append(process)
        time += process.burst_time

    return result


def priority_scheduling(
    processes: Iterable[BookingProcess],
) -> list[BookingProcess]:
    """
    Non-preemptive priority scheduling.

    Lower numeric priority value means higher priority, matching the
    existing Team A implementation.
    """
    items = _validate_processes(processes)

    if not items:
        return []

    pending = sorted(items, key=lambda p: (p.arrival_time, p.request_id))
    ready: list[BookingProcess] = []
    result: list[BookingProcess] = []

    time = 0.0
    index = 0

    while index < len(pending) or ready:
        while index < len(pending) and pending[index].arrival_time <= time:
            ready.append(pending[index])
            index += 1

        if not ready:
            time = pending[index].arrival_time
            continue

        ready.sort(
            key=lambda p: (
                p.priority,
                p.arrival_time,
                p.request_id,
            )
        )

        process = ready.pop(0)
        result.append(process)
        time += process.burst_time

    return result


def round_robin(
    processes: Iterable[BookingProcess],
    quantum: float,
) -> list[tuple[str, float]]:
    """
    Round Robin simulation.

    Returns a Gantt-style execution sequence:
        [(request_id, execution_duration), ...]

    The process objects remain READY; the Team A engine applies lifecycle
    transitions during actual resource execution.
    """
    items = _validate_processes(processes)

    if quantum <= 0:
        raise ValueError("quantum must be greater than 0.")

    if not items:
        return []

    pending = sorted(items, key=lambda p: (p.arrival_time, p.request_id))
    remaining = {p.request_id: float(p.burst_time) for p in pending}

    queue: deque[BookingProcess] = deque()
    result: list[tuple[str, float]] = []

    time = 0.0
    index = 0

    while index < len(pending) or queue:
        while index < len(pending) and pending[index].arrival_time <= time:
            queue.append(pending[index])
            index += 1

        if not queue:
            time = pending[index].arrival_time
            continue

        process = queue.popleft()

        execute = min(quantum, remaining[process.request_id])
        result.append((process.request_id, execute))

        time += execute
        remaining[process.request_id] -= execute

        while index < len(pending) and pending[index].arrival_time <= time:
            queue.append(pending[index])
            index += 1

        if remaining[process.request_id] > 0:
            queue.append(process)

    return result


def schedule(
    processes: Iterable[BookingProcess],
    algorithm: SchedulingAlgorithm | str,
    quantum: float | None = None,
):
    """
    Common Team A scheduler interface.

    FCFS/SJF/PRIORITY -> ordered list of processes
    ROUND_ROBIN -> execution slices
    """
    if isinstance(algorithm, str):
        try:
            algorithm = SchedulingAlgorithm(algorithm.upper())
        except ValueError as exc:
            raise ValueError(
                f"Unknown scheduling algorithm: {algorithm}"
            ) from exc

    if algorithm == SchedulingAlgorithm.FCFS:
        return fcfs(processes)

    if algorithm == SchedulingAlgorithm.SJF:
        return sjf(processes)

    if algorithm == SchedulingAlgorithm.PRIORITY:
        return priority_scheduling(processes)

    if algorithm == SchedulingAlgorithm.ROUND_ROBIN:
        if quantum is None:
            raise ValueError("Round Robin requires a time quantum.")
        return round_robin(processes, quantum)

    raise ValueError(f"Unsupported algorithm: {algorithm}")
