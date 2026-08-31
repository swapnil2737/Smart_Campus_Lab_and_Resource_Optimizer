from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MemorySlot:
    slot_id: int
    occupied_by: str | None = None


class PagingSimulator:
    """
    Optional Team A stretch goal.

    Models a lab-session memory space as fixed-size slots.
    This is an educational paging analogy, not real OS virtual memory.
    """

    def __init__(self, number_of_slots: int) -> None:
        if number_of_slots <= 0:
            raise ValueError("number_of_slots must be positive.")

        self.slots = [
            MemorySlot(slot_id=i)
            for i in range(number_of_slots)
        ]
        self._owners: list[str | None] = [None] * number_of_slots

    def allocate(
        self,
        process_id: str,
        pages_needed: int,
    ) -> list[int]:
        if pages_needed <= 0:
            raise ValueError("pages_needed must be positive.")

        free_slots = [
            i
            for i, owner in enumerate(self._owners)
            if owner is None
        ]

        if len(free_slots) < pages_needed:
            raise MemoryError(
                f"Not enough free slots for {process_id}."
            )

        allocated = free_slots[:pages_needed]

        for slot in allocated:
            self._owners[slot] = process_id

        return allocated

    def release(self, process_id: str) -> None:
        for i, owner in enumerate(self._owners):
            if owner == process_id:
                self._owners[i] = None

    def snapshot(self) -> list[dict]:
        return [
            {
                "slot_id": i,
                "occupied_by": owner,
            }
            for i, owner in enumerate(self._owners)
        ]
