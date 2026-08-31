from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import FrozenSet


class ProcessState(Enum):
    READY = "READY"
    RUNNING = "RUNNING"
    WAITING = "WAITING"
    TERMINATED = "TERMINATED"


VALID_TRANSITIONS: dict[ProcessState, FrozenSet[ProcessState]] = {
    ProcessState.READY: frozenset({ProcessState.RUNNING}),
    ProcessState.RUNNING: frozenset(
        {ProcessState.WAITING, ProcessState.TERMINATED}
    ),
    ProcessState.WAITING: frozenset({ProcessState.RUNNING}),
    ProcessState.TERMINATED: frozenset(),
}


@dataclass
class BookingProcess:
    """
    OS-style process representation of one lab-booking request.

    Team A owns the lifecycle/state of this object.
    Other teams should provide the input fields and use transition_to()
    indirectly through the Team A engine/resource manager.
    """

    request_id: str
    arrival_time: float
    burst_time: float
    priority: int
    resource_type_needed: str
    _state: ProcessState = field(
        default=ProcessState.READY,
        init=False,
        repr=False,
    )
    remaining_time: float = field(init=False)
    assigned_resources: set[str] = field(default_factory=set, init=False)

    def __post_init__(self) -> None:
        if not self.request_id:
            raise ValueError("request_id cannot be empty.")
        if self.arrival_time < 0:
            raise ValueError("arrival_time cannot be negative.")
        if self.burst_time <= 0:
            raise ValueError("burst_time must be greater than 0.")
        if self.priority < 0:
            raise ValueError("priority cannot be negative.")
        if not self.resource_type_needed:
            raise ValueError("resource_type_needed cannot be empty.")

        self.remaining_time = float(self.burst_time)

    @property
    def state(self) -> ProcessState:
        return self._state

    def transition_to(self, new_state: ProcessState) -> None:
        if not isinstance(new_state, ProcessState):
            raise TypeError("new_state must be a ProcessState value.")

        allowed = VALID_TRANSITIONS[self._state]
        if new_state not in allowed:
            raise ValueError(
                f"Invalid state transition: "
                f"{self._state.value} -> {new_state.value}"
            )

        self._state = new_state

    def reset_for_scheduling(self) -> None:
        """
        Reset a process for a fresh scheduling simulation.

        A terminated process cannot normally be moved back through the
        state machine, so a new BookingProcess should be created for a
        completely new lifecycle.
        """
        if self.state != ProcessState.READY:
            raise ValueError(
                "Only a READY process can be reset for scheduling."
            )
        self.remaining_time = float(self.burst_time)

    def __str__(self) -> str:
        return (
            f"BookingProcess("
            f"id={self.request_id}, "
            f"arrival={self.arrival_time}, "
            f"burst={self.burst_time}, "
            f"remaining={self.remaining_time}, "
            f"priority={self.priority}, "
            f"resource={self.resource_type_needed}, "
            f"state={self.state.value}, "
            f"resources={sorted(self.assigned_resources)}"
            f")"
        )
