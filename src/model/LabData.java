package model;

import java.util.ArrayList;
import java.util.List;

public class LabData {

    public static List<Node> createLabs() {

        List<Node> labs = new ArrayList<>();

        // Lab information based on Team C database

        labs.add(new Node(1, "Apple Lab"));
        labs.add(new Node(2, "AIML Lab"));
        labs.add(new Node(3, "L1"));
        labs.add(new Node(4, "L2"));
        labs.add(new Node(5, "L4"));
        labs.add(new Node(6, "L5"));
        labs.add(new Node(7, "Project Lab"));
        labs.add(new Node(8, "PG Lab"));
        labs.add(new Node(9, "ARVR Lab"));
        labs.add(new Node(10, "Cloud Computing Lab"));
        labs.add(new Node(11, "IL7"));
        labs.add(new Node(12, "IL8"));
        labs.add(new Node(13, "AIML1"));
        labs.add(new Node(14, "AIML2"));

        return labs;
    }
}