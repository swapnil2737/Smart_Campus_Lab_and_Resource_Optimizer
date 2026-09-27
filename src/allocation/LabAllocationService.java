package allocation;

import manager.WaitingQueueManager;
import model.*;

import java.util.List;

public class LabAllocationService {

    private ComputerAllocationService computerService;
    private WaitingQueueManager waitingQueue;

    public LabAllocationService() {

        computerService = new ComputerAllocationService();
        waitingQueue = new WaitingQueueManager();

    }

    public Allocation allocateStudent(Student student,
                                      List<Lab> labs) {

        for (Lab lab : labs) {

            if (lab.getAvailableComputers() > 0) {

                return computerService.allocateComputer(student, lab);

            }

        }

        waitingQueue.addStudent(student);

        return null;

    }

    public WaitingQueueManager getWaitingQueue() {

        return waitingQueue;

    }

}