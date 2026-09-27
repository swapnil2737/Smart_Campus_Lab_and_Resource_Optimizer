package model;

public class Computer {

    private int computerId;
    private boolean working;
    private boolean occupied;
    private Student allocatedStudent;

    public Computer(int computerId) {
        this.computerId = computerId;
        this.working = true;
        this.occupied = false;
        this.allocatedStudent = null;
    }

    public int getComputerId() {
        return computerId;
    }

    public boolean isWorking() {
        return working;
    }

    public void setWorking(boolean working) {
        this.working = working;
    }

    public boolean isOccupied() {
        return occupied;
    }

    public void setOccupied(boolean occupied) {
        this.occupied = occupied;
    }

    public Student getAllocatedStudent() {
        return allocatedStudent;
    }

    public void allocateStudent(Student student) {
        this.allocatedStudent = student;
        this.occupied = true;
    }

    public void freeComputer() {
        this.allocatedStudent = null;
        this.occupied = false;
    }

    @Override
    public String toString() {

        return "Computer ID : " + computerId +
                "\nWorking : " + working +
                "\nOccupied : " + occupied +
                "\nStudent : " +
                (allocatedStudent == null ? "None" : allocatedStudent.getName());
    }
}