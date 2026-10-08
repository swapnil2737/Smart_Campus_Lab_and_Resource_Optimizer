# Team A — Memory & Process Scheduler (OS Engine)

This is the Team A implementation for the lab-booking OS-engine component.

## Scope

Team A owns:

- Booking/process model
- Process state machine
- FCFS
- SJF
- Priority Scheduling
- Round Robin
- Resource allocation
- Thread synchronization
- Conceptual multi-resource deadlock demonstration
- Deadlock prevention demonstration


## Files

```text
process.py              Process model + state machine
scheduler.py            FCFS, SJF, Priority, Round Robin
resource_manager.py     Resource allocation + threading.Lock
engine.py               Public Team A interface
deadlock.py             Deadlock demo + prevention
paging.py               Optional paging analogy
tests.py                Team A tests
main.py                 Demonstration program
```

## Requirements

Python 3.10+ is recommended.

No third-party package is required.

## Run

```bash
python tests.py
```

Then:

```bash
python main.py
```

## Coordination contract

Other teams should primarily interact with:

```python
from engine import TeamAEngine
```

Create a process:

```python
from process import BookingProcess

process = BookingProcess(
    request_id="R100",
    arrival_time=0,
    burst_time=20,
    priority=1,
    resource_type_needed="PC",
)
```

Submit it:

```python
engine.submit_process(process)
```

Request a schedule:

```python
result = engine.schedule("PRIORITY")
```

Start a process:

```python
resource = engine.start_process("R100")
```

Check its state:

```python
state = engine.get_process_state("R100")
```

Terminate it:

```python
engine.terminate_process("R100")
```

## Important design rule

Other teams should not directly modify:

```python
process._state
```

State changes are controlled by:

```python
process.transition_to(...)
```

This keeps the state machine authoritative.
