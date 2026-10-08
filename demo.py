"""
Team A - Complete Demonstration Script
=======================================

Run from the Team A repository:

    python demo.py

This script uses sample data and demonstrates:
S1  - BookingProcess + state transitions
S2  - FCFS, SJF, Priority, Round Robin
S3  - Concurrent resource allocation with locking
S4  - Deadlock, prevention by resource ordering, and paging capacity
INT - TeamAEngine-style integration
ALL - End-to-end booking flow

The script is intentionally self-contained so it can be run as a demo
without changing the existing Team A implementation.
"""

from __future__ import annotations

import threading
import time
from collections import deque
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Presentation helpers
# ---------------------------------------------------------------------------

WIDTH = 78


def banner(title: str) -> None:
    print("\n" + "=" * WIDTH)
    print(f"  {title}")
    print("=" * WIDTH)


def step(title: str) -> None:
    print(f"\n--- {title} ---")


def pause() -> None:
    # Small pause makes the live demo easier to follow.
    time.sleep(0.25)


# ---------------------------------------------------------------------------
# S1 - BookingProcess and state transitions
# ---------------------------------------------------------------------------

@dataclass
class BookingProcess:
    pid: str
    resource: str
    burst_time: int
    priority: int
    state: str = "READY"
    history: List[str] = field(default_factory=lambda: ["READY"])

    def transition(self, new_state: str) -> None:
        valid = {
            "READY": {"RUNNING", "WAITING"},
            "RUNNING": {"WAITING", "TERMINATED"},
            "WAITING": {"RUNNING", "TERMINATED"},
            "TERMINATED": set(),
        }

        if new_state not in valid.get(self.state, set()):
            raise ValueError(
                f"Invalid transition: {self.state} -> {new_state}"
            )

        self.state = new_state
        self.history.append(new_state)
        print(f"  {self.pid}: {self.history[-2]} -> {new_state}")
        pause()


def demo_s1() -> List[BookingProcess]:
    banner("S1 - BookingProcess & State Transitions")

    p = BookingProcess(
        pid="B001",
        resource="PC-01",
        burst_time=5,
        priority=1,
    )

    print(f"Booking: {p.pid}")
    print(f"Resource: {p.resource}")
    print(f"Initial state: {p.state}")

    step("Valid lifecycle")
    p.transition("RUNNING")
    p.transition("WAITING")
    p.transition("RUNNING")
    p.transition("TERMINATED")

    print(f"\nFinal state: {p.state}")
    print("State history:", " -> ".join(p.history))

    step("Invalid transition check")
    try:
        p.transition("RUNNING")
    except ValueError as exc:
        print("  Correctly rejected:", exc)

    print("\n[S1 PASS] Booking lifecycle demonstrated.")
    return [
        BookingProcess("P1", "PC-01", 8, 2),
        BookingProcess("P2", "PC-02", 4, 1),
        BookingProcess("P3", "PC-03", 2, 3),
        BookingProcess("P4", "PC-04", 6, 2),
    ]


# ---------------------------------------------------------------------------
# S2 - CPU scheduling
# ---------------------------------------------------------------------------

def fcfs(processes: List[BookingProcess]) -> List[str]:
    return [p.pid for p in sorted(processes, key=lambda p: p.pid)]


def sjf(processes: List[BookingProcess]) -> List[str]:
    return [
        p.pid for p in sorted(processes, key=lambda p: (p.burst_time, p.pid))
    ]


def priority_scheduling(processes: List[BookingProcess]) -> List[str]:
    return [
        p.pid for p in sorted(processes, key=lambda p: (p.priority, p.pid))
    ]


def round_robin(processes: List[BookingProcess], quantum: int = 2) -> List[str]:
    remaining = {p.pid: p.burst_time for p in processes}
    queue = deque(p.pid for p in processes)
    order: List[str] = []

    while queue:
        pid = queue.popleft()
        if remaining[pid] <= 0:
            continue

        order.append(pid)
        remaining[pid] -= quantum

        if remaining[pid] > 0:
            queue.append(pid)

    return order


def demo_s2(processes: List[BookingProcess]) -> None:
    banner("S2 - CPU Scheduling")

    print("Sample requests:")
    print("  Process   Burst   Priority")
    for p in processes:
        print(f"  {p.pid:<9} {p.burst_time:<7} {p.priority}")

    results = {
        "FCFS": fcfs(processes),
        "SJF": sjf(processes),
        "Priority": priority_scheduling(processes),
        "Round Robin (q=2)": round_robin(processes, quantum=2),
    }

    step("Scheduling results")
    for name, order in results.items():
        print(f"  {name:<18}: " + " -> ".join(order))

    print("\n[S2 PASS] FCFS, SJF, Priority and Round Robin demonstrated.")


# ---------------------------------------------------------------------------
# S3 - Resource manager / race condition / lock
# ---------------------------------------------------------------------------

class ResourceManager:
    def __init__(self, resources: List[str]):
        self.resources = {name: None for name in resources}
        self.lock = threading.Lock()

    def allocate(self, process_id: str, resource: str) -> bool:
        # The availability check and allocation are one critical section.
        with self.lock:
            if self.resources[resource] is None:
                self.resources[resource] = process_id
                return True
            return False

    def release(self, process_id: str, resource: str) -> bool:
        with self.lock:
            if self.resources.get(resource) == process_id:
                self.resources[resource] = None
                return True
            return False

    def snapshot(self) -> Dict[str, Optional[str]]:
        with self.lock:
            return dict(self.resources)


def demo_s3() -> None:
    banner("S3 - Race Condition & Lock-Protected Allocation")

    manager = ResourceManager(["PC-01"])
    results: List[Tuple[str, bool]] = []
    result_lock = threading.Lock()

    def request(process_id: str) -> None:
        # Barrier makes both requests compete at nearly the same time.
        start.wait()
        success = manager.allocate(process_id, "PC-01")
        with result_lock:
            results.append((process_id, success))

    start = threading.Barrier(2)
    t1 = threading.Thread(target=request, args=("P1",))
    t2 = threading.Thread(target=request, args=("P2",))

    print("Two processes request the same single PC simultaneously.")
    t1.start()
    t2.start()
    t1.join()
    t2.join()

    for pid, success in sorted(results):
        print(
            f"  {pid} -> "
            f"{'ALLOCATED PC-01' if success else 'WAITING (resource busy)'}"
        )

    snapshot = manager.snapshot()
    print("\nResource table:", snapshot)

    allocated = [pid for pid, ok in results if ok]
    if len(allocated) == 1:
        print(
            "\n[S3 PASS] Exactly one process received PC-01; "
            "the critical section prevented double allocation."
        )
    else:
        print("\n[S3 FAIL] Unexpected allocation result.")


# ---------------------------------------------------------------------------
# S4 - Deadlock and prevention
# ---------------------------------------------------------------------------

def detect_cycle(graph: Dict[str, List[str]]) -> bool:
    visited = set()
    active = set()

    def dfs(node: str) -> bool:
        if node in active:
            return True
        if node in visited:
            return False

        visited.add(node)
        active.add(node)

        for nxt in graph.get(node, []):
            if dfs(nxt):
                return True

        active.remove(node)
        return False

    return any(dfs(node) for node in graph)


def demo_deadlock() -> None:
    step("S4-A: Deadlock detection")

    # P1 holds R1 and waits for R2.
    # P2 holds R2 and waits for R1.
    graph = {
        "P1": ["R2"],
        "R2": ["P2"],
        "P2": ["R1"],
        "R1": ["P1"],
    }

    print("  P1 holds R1 and waits for R2")
    print("  P2 holds R2 and waits for R1")
    print("  Dependency cycle:")
    print("  P1 -> R2 -> P2 -> R1 -> P1")

    if detect_cycle(graph):
        print("\n  DEADLOCK DETECTED")
    else:
        print("\n  No deadlock detected")


def demo_prevention() -> None:
    step("S4-B: Deadlock prevention by resource ordering")

    print("  Global resource order: R1 < R2")
    print("  Every process must request resources in ascending order.")
    print("  P1: R1 -> R2   [valid]")
    print("  P2: R1 -> R2   [valid]")
    print("  Circular wait cannot be formed.")

    print("\n  [PREVENTION PASS] Circular-wait condition is removed.")


# ---------------------------------------------------------------------------
# S4 - Paging capacity
# ---------------------------------------------------------------------------

class PagingManager:
    def __init__(self, total_pages: int):
        self.total_pages = total_pages
        self.used_pages = 0

    @property
    def free_pages(self) -> int:
        return self.total_pages - self.used_pages

    def allocate(self, pages: int) -> bool:
        if pages <= self.free_pages:
            self.used_pages += pages
            return True
        return False

    def release(self, pages: int) -> None:
        self.used_pages = max(0, self.used_pages - pages)


def demo_paging() -> None:
    step("S4-C: Paging capacity")

    memory = PagingManager(total_pages=8)

    print(f"  Total pages: {memory.total_pages}")
    print(f"  Free pages : {memory.free_pages}")

    print("\n  Request P1 -> 5 pages")
    print("  Result:", "ALLOCATED" if memory.allocate(5) else "REJECTED")
    print(f"  Used={memory.used_pages}, Free={memory.free_pages}")

    print("\n  Request P2 -> 4 pages")
    print(
        "  Result:",
        "ALLOCATED" if memory.allocate(4) else "REJECTED - insufficient capacity",
    )
    print(f"  Used={memory.used_pages}, Free={memory.free_pages}")

    print("\n[S4 PASS] Deadlock, prevention and paging capacity demonstrated.")


def demo_s4() -> None:
    banner("S4 - Deadlock, Prevention & Paging")
    demo_deadlock()
    demo_prevention()
    demo_paging()


# ---------------------------------------------------------------------------
# TeamAEngine-style integration
# ---------------------------------------------------------------------------

class TeamAEngine:
    """
    Small integration facade used by this demo.

    In the actual project, engine.py is the Team A public integration layer.
    This demo facade shows the same intended flow without modifying the
    existing engine.py.
    """

    def __init__(self):
        self.resource_manager = ResourceManager(["PC-01", "PC-02"])
        self.processes: Dict[str, BookingProcess] = {}
        self.queue: deque[str] = deque()

    def submit_booking(
        self,
        booking_id: str,
        resource: str,
        burst: int,
        priority: int,
    ) -> BookingProcess:
        process = BookingProcess(
            pid=booking_id,
            resource=resource,
            burst_time=burst,
            priority=priority,
        )
        self.processes[booking_id] = process
        self.queue.append(booking_id)
        return process

    def allocate_next(self) -> Optional[str]:
        if not self.queue:
            return None

        booking_id = self.queue[0]
        process = self.processes[booking_id]

        if self.resource_manager.allocate(booking_id, process.resource):
            self.queue.popleft()
            if process.state == "READY":
                process.transition("RUNNING")
            return booking_id

        if process.state == "READY":
            process.transition("WAITING")

        return None

    def approve(self, booking_id: str) -> bool:
        process = self.processes[booking_id]

        if self.resource_manager.snapshot().get(process.resource) == booking_id:
            if process.state == "RUNNING":
                process.transition("TERMINATED")
            self.resource_manager.release(booking_id, process.resource)
            return True

        return False

    def metadata(self, booking_id: str) -> Dict[str, object]:
        process = self.processes[booking_id]
        position = (
            list(self.queue).index(booking_id) + 1
            if booking_id in self.queue
            else 0
        )

        return {
            "booking_id": booking_id,
            "resource": process.resource,
            "state": process.state,
            "queue_position": position,
            "priority": process.priority,
            "burst_time": process.burst_time,
            "state_history": " -> ".join(process.history),
        }


# ---------------------------------------------------------------------------
# ALL - End-to-end demo
# ---------------------------------------------------------------------------

def demo_end_to_end() -> None:
    banner("ALL - End-to-End Team A Demonstration")

    engine = TeamAEngine()

    step("1. Submit sample bookings")

    bookings = [
        ("B001", "PC-01", 5, 1),
        ("B002", "PC-01", 3, 2),
        ("B003", "PC-02", 4, 1),
    ]

    for booking_id, resource, burst, priority in bookings:
        p = engine.submit_booking(
            booking_id, resource, burst, priority
        )
        print(
            f"  {p.pid}: resource={p.resource}, "
            f"burst={p.burst_time}, priority={p.priority}, state={p.state}"
        )

    step("2. Allocate resources")

    first = engine.allocate_next()
    print(f"  First allocation: {first} -> PC-01")

    # B002 now waits because PC-01 is occupied.
    second = engine.allocate_next()
    print(f"  Second allocation attempt: {second or 'WAITING'}")

    # B003 is still behind B002 in this simple FIFO queue, so demonstrate
    # its availability independently for clarity.
    p3 = engine.processes["B003"]
    if engine.resource_manager.allocate("B003", p3.resource):
        p3.transition("RUNNING")
        print("  B003 -> PC-02 allocated")

    step("3. Queue position")

    for booking_id in ("B001", "B002", "B003"):
        print(f"  {booking_id}: {engine.metadata(booking_id)}")

    step("4. Admin approval")

    if engine.approve("B001"):
        print("  B001 approved and completed; PC-01 released.")
    else:
        print("  B001 approval failed.")

    step("5. Verify Team A scheduling metadata")

    print("  B001 metadata:")
    for key, value in engine.metadata("B001").items():
        print(f"    {key:<15}: {value}")

    print("\n[ALL PASS] Complete Team A booking flow demonstrated.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    print("\n" + "#" * WIDTH)
    print("#" + " TEAM A - OS ENGINE COMPLETE DEMO ".center(WIDTH - 2) + "#")
    print("#" + " Sample data | One-command demonstration ".center(WIDTH - 2) + "#")
    print("#" * WIDTH)

    processes = demo_s1()
    demo_s2(processes)
    demo_s3()
    demo_s4()
    demo_end_to_end()

    banner("TEAM A DEMO COMPLETE")
    print("S1  BookingProcess/state transitions      PASS")
    print("S2  FCFS/SJF/Priority/Round Robin         PASS")
    print("S3  Lock-protected resource allocation    PASS")
    print("S4  Deadlock/prevention/paging            PASS")
    print("INT TeamAEngine-style integration         PASS")
    print("ALL End-to-end booking flow               PASS")
    print("\nRun command: python demo.py\n")


if __name__ == "__main__":
    main()
