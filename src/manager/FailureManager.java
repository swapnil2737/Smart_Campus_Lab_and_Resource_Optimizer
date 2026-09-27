package manager;

import model.Computer;
import model.Lab;
import model.Student;

public class FailureManager {

    public void handleFailure(Lab lab, int computerId) {

        for (Computer computer : lab.getComputers()) {

            if (computer.getComputerId() == computerId) {

                computer.setWorking(false);

                System.out.println("\n================================");
                System.out.println("PC FAILURE DETECTED");
                System.out.println("================================");
                System.out.println("Computer " + computerId + " is now OUT OF SERVICE.");

                Student student = computer.getAllocatedStudent();

                if (student != null) {

                    System.out.println("Student " + student.getName() + " needs reallocation.");

                    computer.freeComputer();

                    for (Computer newComputer : lab.getComputers()) {

                        if (newComputer.isWorking() && !newComputer.isOccupied()) {

                            newComputer.allocateStudent(student);

                            student.setAllocatedComputer(newComputer);

                            System.out.println("Student shifted to Computer "
                                    + newComputer.getComputerId());

                            return;
                        }
                    }

                    student.setStatus("WAITING");

                    System.out.println("No free computer available.");
                    System.out.println(student.getName() + " moved to Waiting Queue.");
                }

                return;
            }
        }

        System.out.println("Computer not found.");
    }
}
