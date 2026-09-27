package allocation;

import model.*;

public class ComputerAllocationService {

    public Allocation allocateComputer(Student student, Lab lab) {

        for (Computer computer : lab.getComputers()) {

            if (computer.isWorking() && !computer.isOccupied()) {

                computer.allocateStudent(student);

                student.setAllocatedLab(lab);
                student.setAllocatedComputer(computer);
                student.setStatus("ALLOCATED");

                return new Allocation(student, lab, computer);
            }

        }

        return null;
    }

}