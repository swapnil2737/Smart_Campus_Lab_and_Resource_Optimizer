package main;

import graph.CampusGraph;
import graph.Graph;
import model.Node;

import java.sql.Connection;
import java.sql.DriverManager;

public class Main {

    public static void main(String[] args) {

        System.out.println("=================================");
        System.out.println("SMART CAMPUS LAB SYSTEM");
        System.out.println("=================================");

        // -----------------------------------------
        // 1. DATABASE CONNECTION
        // -----------------------------------------

        String url = "jdbc:mysql://localhost:3306/smart_campus_lab";
        String username = "root";
        String password = "saniya28";

        try {

            Connection connection =
                    DriverManager.getConnection(
                            url,
                            username,
                            password
                    );

            System.out.println("\nDatabase connected successfully.");

            // -----------------------------------------
            // 2. CREATE CAMPUS GRAPH FROM DATABASE
            // -----------------------------------------

            Graph campusGraph =
                    CampusGraph.createGraph(connection);

            System.out.println("\n=================================");
            System.out.println("CAMPUS GRAPH");
            System.out.println("=================================");

            System.out.println(
                    "Total Nodes in Graph: "
                            + campusGraph.getNodes().size()
            );

            // -----------------------------------------
            // 3. DISPLAY LAB CONNECTIONS
            // -----------------------------------------

            System.out.println("\nLab Connections:");

            for (Node lab : campusGraph.getNodes()) {

                System.out.println(
                        "\n" + lab.getName()
                                + " is connected to:"
                );

                campusGraph.getNeighbors(lab).forEach(edge -> {

                    System.out.println(
                            "   -> "
                                    + edge.getDestination().getName()
                                    + " ("
                                    + edge.getDistance()
                                    + " meters)"
                    );

                });
            }

            // -----------------------------------------
            // 4. FINAL STATUS
            // -----------------------------------------

            System.out.println("\n=================================");
            System.out.println("GRAPH CREATED SUCCESSFULLY");
            System.out.println("=================================");

            connection.close();

        } catch (Exception e) {

            System.out.println();
            System.out.println("DATABASE / GRAPH CREATION FAILED");

            e.printStackTrace();
        }
    }
}