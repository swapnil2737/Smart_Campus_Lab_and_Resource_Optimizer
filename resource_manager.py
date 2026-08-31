from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Optional

from process import BookingProcess, ProcessState


@dataclass
class Resource:
    resource_id: str
    resource_type: str
    available: bool = True
    assigned_to: Optional[str] = None


class ResourceManager:
    """
    Team A resource allocator.

    The lock protects the critical section:
        check availability -> assign resource

    This prevents two Python threads from allocating the same resource
    simultaneously.
    """

    def __init__(self) -> None:
        self._resources: dict[str, Resource] = {}
        self._lock = threading.Lock()

    def add_resource(self, resource: Resource) -> None:
        with self._lock:
            if resource.resource_id in self._resources:
                raise ValueError(
                    f"Resource already exists: {resource.resource_id}"
                )
            self._resources[resource.resource_id] = resource

    def get_resource(self, resource_id: str) -> Resource:
        with self._lock:
            if resource_id not in self._resources:
                raise KeyError(f"Unknown resource: {resource_id}")
            return self._resources[resource_id]

    def list_resources(self) -> list[Resource]:
        with self._lock:
            return list(self._resources.values())

    def find_available(
        self,
        resource_type: str,
    ) -> Optional[Resource]:
        with self._lock:
            for resource in self._resources.values():
                if (
                    resource.resource_type == resource_type
                    and resource.available
                ):
                    return resource
        return None

    def allocate(
        self,
        process: BookingProcess,
        resource_id: str | None = None,
    ) -> Optional[Resource]:
        """
        Atomically check and allocate a matching resource.

        If no matching resource is available, the process moves:
            RUNNING -> WAITING
        only when it is already RUNNING.

        If the process is READY, it remains READY because scheduling has
        not started it yet.
        """
        with self._lock:
            resource = None

            if resource_id is not None:
                resource = self._resources.get(resource_id)

                if resource is None:
                    raise KeyError(f"Unknown resource: {resource_id}")

                if resource.resource_type != process.resource_type_needed:
                    raise ValueError(
                        f"{resource_id} is type {resource.resource_type}, "
                        f"but process requires "
                        f"{process.resource_type_needed}."
                    )
            else:
                for candidate in self._resources.values():
                    if (
                        candidate.resource_type
                        == process.resource_type_needed
                        and candidate.available
                    ):
                        resource = candidate
                        break

            if resource is None or not resource.available:
                if process.state == ProcessState.RUNNING:
                    process.transition_to(ProcessState.WAITING)
                return None

            resource.available = False
            resource.assigned_to = process.request_id
            process.assigned_resources.add(resource.resource_id)

            if process.state == ProcessState.READY:
                process.transition_to(ProcessState.RUNNING)
            elif process.state == ProcessState.WAITING:
                process.transition_to(ProcessState.RUNNING)
            elif process.state != ProcessState.RUNNING:
                raise ValueError(
                    f"Cannot allocate resource to process in state "
                    f"{process.state.value}."
                )

            return resource

    def release(
        self,
        process: BookingProcess,
        resource_id: str,
    ) -> None:
        with self._lock:
            resource = self._resources.get(resource_id)

            if resource is None:
                raise KeyError(f"Unknown resource: {resource_id}")

            if resource.assigned_to != process.request_id:
                raise ValueError(
                    f"Resource {resource_id} is not assigned to "
                    f"{process.request_id}."
                )

            resource.available = True
            resource.assigned_to = None
            process.assigned_resources.discard(resource_id)

    def terminate_process(
        self,
        process: BookingProcess,
    ) -> None:
        """
        Release all resources held by a process and terminate it.
        """
        with self._lock:
            if process.state == ProcessState.WAITING:
                raise ValueError(
                    "A WAITING process cannot terminate directly."
                )

            if process.state != ProcessState.RUNNING:
                raise ValueError(
                    f"Only RUNNING processes can terminate; "
                    f"current state is {process.state.value}."
                )

            for resource_id in list(process.assigned_resources):
                resource = self._resources[resource_id]
                resource.available = True
                resource.assigned_to = None
                process.assigned_resources.discard(resource_id)

            process.transition_to(ProcessState.TERMINATED)

    def release_resource_and_resume(
        self,
        releasing_process: BookingProcess,
        resource_id: str,
        waiting_process: BookingProcess | None = None,
    ) -> Optional[Resource]:
        """
        Convenience operation for a demonstration:
        release one resource and optionally try to resume a waiting process.
        """
        with self._lock:
            resource = self._resources.get(resource_id)

            if resource is None:
                raise KeyError(f"Unknown resource: {resource_id}")

            if resource.assigned_to != releasing_process.request_id:
                raise ValueError(
                    f"Resource {resource_id} is not owned by "
                    f"{releasing_process.request_id}."
                )

            resource.available = True
            resource.assigned_to = None
            releasing_process.assigned_resources.discard(resource_id)

            if waiting_process is None:
                return None

            if waiting_process.state != ProcessState.WAITING:
                raise ValueError(
                    "waiting_process must be in WAITING state."
                )

            if (
                resource.resource_type
                != waiting_process.resource_type_needed
            ):
                return None

            resource.available = False
            resource.assigned_to = waiting_process.request_id
            waiting_process.assigned_resources.add(resource_id)
            waiting_process.transition_to(ProcessState.RUNNING)

            return resource
