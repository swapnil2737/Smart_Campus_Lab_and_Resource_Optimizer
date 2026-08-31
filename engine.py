from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from process import BookingProcess, ProcessState
from resource_manager import Resource, ResourceManager
from scheduler import (
    SchedulingAlgorithm,
    fcfs,
    priority_scheduling,
    round_robin,
    schedule,
    sjf,
)


@dataclass
class ScheduleResult:
    algorithm: str
    ordered_request_ids: list[str]
    round_robin_slices: list[tuple[str, float]] | None = None


class TeamAEngine:
    """
    Public coordination interface for Team A.

    Other teams should interact with this class rather than depending on
    Team A's internal implementation details.
    """

    def __init__(self) -> None:
        self.processes: dict[str, BookingProcess] = {}
        self.resources = ResourceManager()

    # ---------- Process management ----------

    def submit_process(self, process: BookingProcess) -> BookingProcess:
        if process.request_id in self.processes:
            raise ValueError(
                f"Duplicate request_id: {process.request_id}"
            )

        self.processes[process.request_id] = process
        return process

    def get_process(self, request_id: str) -> BookingProcess:
        try:
            return self.processes[request_id]
        except KeyError as exc:
            raise KeyError(
                f"Unknown request_id: {request_id}"
            ) from exc

    def get_process_state(self, request_id: str) -> str:
        return self.get_process(request_id).state.value

    def all_processes(self) -> list[BookingProcess]:
        return list(self.processes.values())

    # ---------- Resource management ----------

    def add_resource(
        self,
        resource_id: str,
        resource_type: str,
    ) -> None:
        self.resources.add_resource(
            Resource(
                resource_id=resource_id,
                resource_type=resource_type,
            )
        )

    def start_process(
        self,
        request_id: str,
        resource_id: str | None = None,
    ) -> Resource | None:
        process = self.get_process(request_id)

        if process.state != ProcessState.READY:
            raise ValueError(
                f"{request_id} is not READY; "
                f"current state: {process.state.value}"
            )

        return self.resources.allocate(process, resource_id)

    def resume_process(
        self,
        request_id: str,
        resource_id: str | None = None,
    ) -> Resource | None:
        process = self.get_process(request_id)

        if process.state != ProcessState.WAITING:
            raise ValueError(
                f"{request_id} is not WAITING; "
                f"current state: {process.state.value}"
            )

        return self.resources.allocate(process, resource_id)

    def terminate_process(self, request_id: str) -> None:
        process = self.get_process(request_id)
        self.resources.terminate_process(process)

    # ---------- Scheduling ----------

    def schedule(
        self,
        algorithm: SchedulingAlgorithm | str,
        quantum: float | None = None,
    ) -> ScheduleResult:
        ready_processes = [
            p
            for p in self.processes.values()
            if p.state == ProcessState.READY
        ]

        result = schedule(
            ready_processes,
            algorithm,
            quantum=quantum,
        )

        if isinstance(algorithm, str):
            algorithm_name = algorithm.upper()
        else:
            algorithm_name = algorithm.value

        if algorithm_name == SchedulingAlgorithm.ROUND_ROBIN.value:
            slices = result
            return ScheduleResult(
                algorithm=algorithm_name,
                ordered_request_ids=[
                    request_id for request_id, _ in slices
                ],
                round_robin_slices=slices,
            )

        return ScheduleResult(
            algorithm=algorithm_name,
            ordered_request_ids=[
                process.request_id for process in result
            ],
        )

    # ---------- Status ----------

    def snapshot(self) -> list[dict]:
        return [
            {
                "request_id": p.request_id,
                "arrival_time": p.arrival_time,
                "burst_time": p.burst_time,
                "remaining_time": p.remaining_time,
                "priority": p.priority,
                "resource_type_needed": p.resource_type_needed,
                "state": p.state.value,
                "assigned_resources": sorted(
                    p.assigned_resources
                ),
            }
            for p in self.processes.values()
        ]
