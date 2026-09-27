package model;

public class Student {

    private int studentId;
    private String name;
    private String batch;
    private int priority;
    private int requiredTime;

    private Lab allocatedLab;
    private Computer allocatedComputer;

    private String status;

    public Student(int studentId,
                   String name,
                   String batch,
                   int priority,
                   int requiredTime) {

        this.studentId = studentId;
        this.name = name;
        this.batch = batch;
        this.priority = priority;
        this.requiredTime = requiredTime;

        this.status = "WAITING";
    }

    public int getStudentId() {
        return studentId;
    }

    public String getName() {
        return name;
    }

    public String getBatch() {
        return batch;
    }

    public int getPriority() {
        return priority;
    }

    public int getRequiredTime() {
        return requiredTime;
    }

    public Lab getAllocatedLab() {
        return allocatedLab;
    }

    public void setAllocatedLab(Lab allocatedLab) {
        this.allocatedLab = allocatedLab;
    }

    public Computer getAllocatedComputer() {
        return allocatedComputer;
    }

    public void setAllocatedComputer(Computer allocatedComputer) {
        this.allocatedComputer = allocatedComputer;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    @Override
    public String toString() {

        return "Student ID : " + studentId +
                "\nName : " + name +
                "\nBatch : " + batch +
                "\nPriority : " + priority +
                "\nRequired Time : " + requiredTime + " mins" +
                "\nAllocated Lab : " +
                (allocatedLab == null ? "Not Allocated" : allocatedLab.getLabName()) +
                "\nAllocated Computer : " +
                (allocatedComputer == null ? "Not Allocated" : allocatedComputer.getComputerId()) +
                "\nStatus : " + status;
    }
}