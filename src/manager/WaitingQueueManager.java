package manager;

import model.Student;

import java.util.LinkedList;
import java.util.Queue;

public class WaitingQueueManager {

    private Queue<Student> waitingQueue;

    public WaitingQueueManager() {
        waitingQueue = new LinkedList<>();
    }

    public void addStudent(Student student) {

        waitingQueue.offer(student);

        student.setStatus("WAITING");

        System.out.println(student.getName() + " added to Waiting Queue.");

    }

    public Student allocateNextStudent() {

        if (waitingQueue.isEmpty()) {
            return null;
        }

        return waitingQueue.poll();
    }

    public boolean isEmpty() {
        return waitingQueue.isEmpty();
    }

    public int getWaitingCount() {
        return waitingQueue.size();
    }

    public void displayQueue() {

        System.out.println("\n========= WAITING QUEUE =========");

        if (waitingQueue.isEmpty()) {
            System.out.println("No Students Waiting.");
            return;
        }

        for (Student student : waitingQueue) {

            System.out.println(student.getStudentId()
                    + " - "
                    + student.getName());

        }

    }
}
