package model;

import java.time.LocalDateTime;

public class Allocation {

    private Student student;
    private Lab lab;
    private Computer computer;
    private LocalDateTime allocationTime;

    public Allocation(Student student,
                      Lab lab,
                      Computer computer) {

        this.student = student;
        this.lab = lab;
        this.computer = computer;
        this.allocationTime = LocalDateTime.now();
    }

    public Student getStudent() {
        return student;
    }

    public Lab getLab() {
        return lab;
    }

    public Computer getComputer() {
        return computer;
    }

    @Override
    public String toString() {

        return "Allocation\n" +
                "Student : " + student.getName() +
                "\nLab : " + lab.getLabName() +
                "\nComputer : " + computer.getComputerId() +
                "\nAllocated At : " + allocationTime;
    }
}