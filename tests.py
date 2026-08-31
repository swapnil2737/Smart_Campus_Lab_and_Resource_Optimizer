from __future__ import annotations

import threading
import time

from deadlock import (
    demonstrate_deadlock,
    demonstrate_prevention_by_ordering,
)
from engine import TeamAEngine
from paging import PagingSimulator
from process import BookingProcess, ProcessState
from resource_manager import ResourceManager, Resource
from scheduler import (
    fcfs,
    priority_scheduling,
    round_robin,
    sjf,
)


def test_process_state_machine() -> None:
    process = BookingProcess(
        request_id="R001",
        arrival_time=0,
        burst_time=30,
        priority=2,
        resource_type_needed="PC",
    )

    assert process.state == ProcessState.READY

    process.transition_to(ProcessState.RUNNING)
    assert process.state == ProcessState.RUNNING

    process.transition_to(ProcessState.WAITING)
    assert process.state == ProcessState.WAITING

    process.transition_to(ProcessState.RUNNING)
    assert process.state == ProcessState.RUNNING

    process.transition_to(ProcessState.TERMINATED)
    assert process.state == ProcessState.TERMINATED

    try:
        process.transition_to(ProcessState.RUNNING)
    except ValueError:
        pass
    else:
        raise AssertionError("TERMINATED process changed state.")


def sample_processes() -> list[BookingProcess]:
    return [
        BookingProcess("R001", 0, 30, 2, "PC"),
        BookingProcess("R002", 1, 10, 1, "PC"),
        BookingProcess("R003", 2, 20, 3, "PC"),
    ]


def test_schedulers() -> None:
    processes = sample_processes()

    assert [p.request_id for p in fcfs(processes)] == [
        "R001",
        "R002",
        "R003",
    ]

    assert [p.request_id for p in sjf(processes)] == [
        "R001",
        "R002",
        "R003",
    ]

    assert [p.request_id for p in priority_scheduling(processes)] == [
        "R001",
        "R002",
        "R003",
    ]

    rr = round_robin(processes, quantum=10)

    assert rr[0] == ("R001", 10)
    assert sum(duration for _, duration in rr) == 60


def test_resource_concurrency() -> None:
    manager = ResourceManager()

    manager.add_resource(
        Resource("PC-01", "PC")
    )

    p1 = BookingProcess("R001", 0, 10, 1, "PC")
    p2 = BookingProcess("R002", 0, 10, 2, "PC")

    results: dict[str, bool] = {}

    def request_resource(process: BookingProcess) -> None:
        resource = manager.allocate(process)
        results[process.request_id] = resource is not None

    t1 = threading.Thread(
        target=request_resource,
        args=(p1,),
    )
    t2 = threading.Thread(
        target=request_resource,
        args=(p2,),
    )

    t1.start()
    t2.start()

    t1.join()
    t2.join()

    assert sum(results.values()) == 1

    winner = p1 if results["R001"] else p2
    loser = p2 if winner is p1 else p1

    assert winner.state == ProcessState.RUNNING
    assert loser.state == ProcessState.READY

    manager.terminate_process(winner)
    assert winner.state == ProcessState.TERMINATED


def test_waiting_and_resume() -> None:
    manager = ResourceManager()
    manager.add_resource(Resource("PC-01", "PC"))

    p1 = BookingProcess("R001", 0, 10, 1, "PC")
    p2 = BookingProcess("R002", 1, 10, 2, "PC")

    manager.allocate(p1)
    assert p1.state == ProcessState.RUNNING

    # p2 is explicitly made RUNNING to demonstrate RUNNING -> WAITING.
    p2.transition_to(ProcessState.RUNNING)

    resource = manager.allocate(p2)
    assert resource is None
    assert p2.state == ProcessState.WAITING

    resumed = manager.release_resource_and_resume(
        p1,
        "PC-01",
        p2,
    )

    assert resumed is not None
    assert p2.state == ProcessState.RUNNING
    assert p2.assigned_resources == {"PC-01"}

    manager.terminate_process(p2)


def test_deadlock_demo() -> None:
    result = demonstrate_deadlock()

    assert result["deadlocked"] is True
    assert result["cycle"] is not None


def test_deadlock_prevention() -> None:
    result = demonstrate_prevention_by_ordering()

    assert result["deadlock_prevented"] is True
    assert result["ordering_violations"] == ["P2"]


def test_paging() -> None:
    memory = PagingSimulator(4)

    pages = memory.allocate("R001", 2)

    assert len(pages) == 2

    memory.allocate("R002", 2)

    try:
        memory.allocate("R003", 1)
    except MemoryError:
        pass
    else:
        raise AssertionError("Paging simulator over-allocated memory.")

    memory.release("R001")

    pages = memory.allocate("R003", 1)
    assert len(pages) == 1


def test_team_a_engine() -> None:
    engine = TeamAEngine()

    engine.add_resource("PC-01", "PC")
    engine.add_resource("PC-02", "PC")

    engine.submit_process(
        BookingProcess("R001", 0, 30, 2, "PC")
    )
    engine.submit_process(
        BookingProcess("R002", 1, 10, 1, "PC")
    )
    engine.submit_process(
        BookingProcess("R003", 2, 20, 3, "PC")
    )

    result = engine.schedule("PRIORITY")

    assert result.ordered_request_ids == [
        "R001",
        "R002",
        "R003",
    ]

    allocated = engine.start_process("R001")

    assert allocated is not None
    assert engine.get_process_state("R001") == "RUNNING"

    engine.terminate_process("R001")

    assert engine.get_process_state("R001") == "TERMINATED"


def run_all_tests() -> None:
    tests = [
        test_process_state_machine,
        test_schedulers,
        test_resource_concurrency,
        test_waiting_and_resume,
        test_deadlock_demo,
        test_deadlock_prevention,
        test_paging,
        test_team_a_engine,
    ]

    for test in tests:
        test()
        print(f"PASS: {test.__name__}")

    print("\nAll Team A tests passed.")


if __name__ == "__main__":
    run_all_tests()
