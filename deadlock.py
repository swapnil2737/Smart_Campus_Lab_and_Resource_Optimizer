from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class DeadlockProcess:
    process_id: str
    holds: set[str] = field(default_factory=set)
    waiting_for: set[str] = field(default_factory=set)


class DeadlockDetector:
    """
    Small conceptual multi-resource deadlock detector.

    A deadlock exists when the wait-for graph contains a cycle.
    """

    def __init__(self) -> None:
        self.resources: dict[str, str | None] = {}
        self.processes: dict[str, DeadlockProcess] = {}

    def add_resource(self, resource_id: str) -> None:
        self.resources.setdefault(resource_id, None)

    def add_process(self, process_id: str) -> None:
        self.processes.setdefault(
            process_id,
            DeadlockProcess(process_id),
        )

    def assign(self, process_id: str, resource_id: str) -> None:
        self.add_process(process_id)
        self.add_resource(resource_id)

        owner = self.resources[resource_id]

        if owner is not None and owner != process_id:
            raise ValueError(
                f"{resource_id} is already held by {owner}."
            )

        self.resources[resource_id] = process_id
        self.processes[process_id].holds.add(resource_id)
        self.processes[process_id].waiting_for.discard(resource_id)

    def request(self, process_id: str, resource_id: str) -> bool:
        self.add_process(process_id)
        self.add_resource(resource_id)

        owner = self.resources[resource_id]

        if owner is None or owner == process_id:
            self.assign(process_id, resource_id)
            return True

        self.processes[process_id].waiting_for.add(resource_id)
        return False

    def build_wait_for_graph(self) -> dict[str, set[str]]:
        graph = {
            process_id: set()
            for process_id in self.processes
        }

        for process in self.processes.values():
            for resource_id in process.waiting_for:
                owner = self.resources.get(resource_id)

                if owner is not None and owner != process.process_id:
                    graph[process.process_id].add(owner)

        return graph

    def detect_cycle(self) -> list[str] | None:
        graph = self.build_wait_for_graph()

        visited: set[str] = set()
        active: set[str] = set()
        path: list[str] = []

        def dfs(node: str) -> list[str] | None:
            visited.add(node)
            active.add(node)
            path.append(node)

            for neighbour in graph[node]:
                if neighbour not in visited:
                    cycle = dfs(neighbour)
                    if cycle:
                        return cycle
                elif neighbour in active:
                    start = path.index(neighbour)
                    return path[start:] + [neighbour]

            path.pop()
            active.remove(node)
            return None

        for node in graph:
            if node not in visited:
                cycle = dfs(node)
                if cycle:
                    return cycle

        return None

    def is_deadlocked(self) -> bool:
        return self.detect_cycle() is not None


def demonstrate_deadlock() -> dict:
    """
    Demonstrates the classic circular-wait case:

        P1 holds PC-01 and waits for LICENSE-01
        P2 holds LICENSE-01 and waits for PC-01

    Result: P1 -> P2 -> P1 cycle.
    """
    detector = DeadlockDetector()

    detector.assign("P1", "PC-01")
    detector.assign("P2", "LICENSE-01")

    detector.request("P1", "LICENSE-01")
    detector.request("P2", "PC-01")

    return {
        "wait_for_graph": detector.build_wait_for_graph(),
        "cycle": detector.detect_cycle(),
        "deadlocked": detector.is_deadlocked(),
    }


def demonstrate_prevention_by_ordering() -> dict:
    """
    Demonstrates lock/resource ordering.

    Rule:
        Resources must always be requested in lexical order.

    If PC-01 < LICENSE-01, both processes must request:
        PC-01 -> LICENSE-01

    P2 therefore cannot hold LICENSE-01 while waiting for PC-01,
    removing the circular-wait condition.
    """
    resource_order = {
        "PC-01": 1,
        "LICENSE-01": 2,
    }

    requests = {
        "P1": ["PC-01", "LICENSE-01"],
        "P2": ["LICENSE-01", "PC-01"],
    }

    violations = []

    for process_id, requested in requests.items():
        ranks = [resource_order[r] for r in requested]

        if ranks != sorted(ranks):
            violations.append(process_id)

    return {
        "resource_order": resource_order,
        "requests": requests,
        "ordering_violations": violations,
        "deadlock_prevented": bool(violations),
    }
