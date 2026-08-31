from deadlock import (
    demonstrate_deadlock,
    demonstrate_prevention_by_ordering,
)
from engine import TeamAEngine
from paging import PagingSimulator
from process import BookingProcess


def print_schedule(engine: TeamAEngine, algorithm: str, quantum=None):
    result = engine.schedule(
        algorithm,
        quantum=quantum,
    )

    print(f"\n{result.algorithm} scheduling:")

    if result.round_robin_slices is not None:
        print("Execution slices:")
        for request_id, duration in result.round_robin_slices:
            print(f"  {request_id} -> {duration}")
    else:
        print("Execution order:")
        print("  " + " -> ".join(result.ordered_request_ids))


def main() -> None:
    print("=" * 70)
    print("TEAM A - MEMORY & PROCESS SCHEDULER (OS ENGINE)")
    print("=" * 70)

    engine = TeamAEngine()

    # Lab resources
    engine.add_resource("PC-01", "PC")
    engine.add_resource("PC-02", "PC")

    # These are the same kinds of process attributes required by the
    # Team A specification.
    bookings = [
        BookingProcess(
            request_id="R001",
            arrival_time=0,
            burst_time=30,
            priority=2,
            resource_type_needed="PC",
        ),
        BookingProcess(
            request_id="R002",
            arrival_time=1,
            burst_time=10,
            priority=1,
            resource_type_needed="PC",
        ),
        BookingProcess(
            request_id="R003",
            arrival_time=2,
            burst_time=20,
            priority=3,
            resource_type_needed="PC",
        ),
    ]

    for process in bookings:
        engine.submit_process(process)

    print("\nSubmitted processes:")
    for process in engine.all_processes():
        print(f"  {process}")

    print_schedule(engine, "FCFS")
    print_schedule(engine, "SJF")
    print_schedule(engine, "PRIORITY")
    print_schedule(engine, "ROUND_ROBIN", quantum=10)

    print("\nStarting R001...")
    resource = engine.start_process("R001")

    if resource:
        print(
            f"R001 -> RUNNING using {resource.resource_id}"
        )

    print("\nCurrent engine snapshot:")
    for row in engine.snapshot():
        print(f"  {row}")

    print("\nTerminating R001...")
    engine.terminate_process("R001")
    print(
        f"R001 state = "
        f"{engine.get_process_state('R001')}"
    )

    print("\n" + "=" * 70)
    print("DEADLOCK DEMONSTRATION")
    print("=" * 70)

    deadlock = demonstrate_deadlock()

    print("Wait-for graph:")
    for process_id, waits_for in deadlock["wait_for_graph"].items():
        print(f"  {process_id} -> {sorted(waits_for)}")

    print(f"Cycle: {deadlock['cycle']}")
    print(f"Deadlocked: {deadlock['deadlocked']}")

    print("\nDeadlock prevention using resource ordering:")

    prevention = demonstrate_prevention_by_ordering()

    print(f"Resource order: {prevention['resource_order']}")
    print(
        f"Ordering violations: "
        f"{prevention['ordering_violations']}"
    )
    print(
        f"Deadlock prevented: "
        f"{prevention['deadlock_prevented']}"
    )

    print("\n" + "=" * 70)
    print("OPTIONAL MEMORY PAGING ANALOGY")
    print("=" * 70)

    memory = PagingSimulator(4)

    print("R001 allocated slots:", memory.allocate("R001", 2))
    print("R002 allocated slots:", memory.allocate("R002", 2))
    print("Memory:", memory.snapshot())

    memory.release("R001")
    print("After releasing R001:", memory.snapshot())

    print("\nTeam A demonstration complete.")


if __name__ == "__main__":
    main()
