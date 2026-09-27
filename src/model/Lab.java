package model;

import java.util.ArrayList;
import java.util.List;

public class Lab {

    private int labId;
    private String labName;
    private List<Computer> computers;

    public Lab(int labId, String labName, int totalComputers) {

        this.labId = labId;
        this.labName = labName;

        computers = new ArrayList<>();

        for (int i = 1; i <= totalComputers; i++) {
            computers.add(new Computer(i));
        }
    }

    public int getLabId() {
        return labId;
    }

    public String getLabName() {
        return labName;
    }

    public List<Computer> getComputers() {
        return computers;
    }

    public int getAvailableComputers() {

        int count = 0;

        for (Computer computer : computers) {

            if (computer.isWorking() && !computer.isOccupied()) {
                count++;
            }

        }

        return count;
    }

    @Override
    public String toString() {

        return "\nLab ID : " + labId +
                "\nLab Name : " + labName +
                "\nTotal Computers : " + computers.size() +
                "\nAvailable Computers : " + getAvailableComputers();
    }
}
