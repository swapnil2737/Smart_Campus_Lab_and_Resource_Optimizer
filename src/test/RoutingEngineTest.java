package test;

import algorithms.Dijkstra;
import graph.Graph;
import model.Node;
import model.RoutingMetrics;

public class RoutingEngineTest {

    static int totalTests = 0;
    static int passedTests = 0;

    public static void main(String[] args) {

        System.out.println("==========================================");
        System.out.println("      ROUTING ENGINE TEST RESULTS");
        System.out.println("==========================================");

        testGraphCreation();
        testDijkstraShortestPath();
        testRouteReconstruction();
        testInvalidDestination();
        testNoPath();

        System.out.println("\n==========================================");
        System.out.println("FINAL TEST SUMMARY");
        System.out.println("==========================================");
        System.out.println("Total Tests  : " + totalTests);
        System.out.println("Passed Tests : " + passedTests);
        System.out.println("Failed Tests : " + (totalTests - passedTests));

        if (passedTests == totalTests) {
            System.out.println("STATUS       : ALL TESTS PASSED");
        } else {
            System.out.println("STATUS       : SOME TESTS FAILED");
        }

        System.out.println("==========================================");
    }


    // ==================================================
    // TEST 1 - GRAPH CREATION
    // ==================================================

    static void testGraphCreation() {

        totalTests++;

        Graph graph = createTestGraph();

        if (graph.getNodes().size() == 4) {

            passedTests++;

            System.out.println(
                    "PASS - Test 1: Graph Creation"
            );

        } else {

            System.out.println(
                    "FAIL - Test 1: Graph Creation"
            );
        }
    }


    // ==================================================
    // TEST 2 - DIJKSTRA SHORTEST PATH
    // ==================================================

    static void testDijkstraShortestPath() {

        totalTests++;

        Graph graph = createTestGraph();

        Node source = new Node(1, "A");
        Node destination = new Node(4, "D");

        Dijkstra dijkstra = new Dijkstra();

        RoutingMetrics result =
                dijkstra.shortestPath(
                        graph,
                        source,
                        destination
                );

        if (result != null
                && result.getPathCost() == 10.0) {

            passedTests++;

            System.out.println(
                    "PASS - Test 2: Dijkstra Shortest Path"
            );

            System.out.println(
                    "      Route    : "
                            + result.getPath()
            );

            System.out.println(
                    "      Distance : "
                            + result.getPathCost()
            );

        } else {

            System.out.println(
                    "FAIL - Test 2: Dijkstra Shortest Path"
            );
        }
    }


    // ==================================================
    // TEST 3 - ROUTE RECONSTRUCTION
    // ==================================================

    static void testRouteReconstruction() {

        totalTests++;

        Graph graph = createTestGraph();

        Node source = new Node(1, "A");
        Node destination = new Node(4, "D");

        Dijkstra dijkstra = new Dijkstra();

        RoutingMetrics result =
                dijkstra.shortestPath(
                        graph,
                        source,
                        destination
                );

        if (result != null
                && result.getPath().size() == 4
                && result.getPath()
                .get(0)
                .getName()
                .equals("A")
                && result.getPath()
                .get(3)
                .getName()
                .equals("D")) {

            passedTests++;

            System.out.println(
                    "PASS - Test 3: Route Reconstruction"
            );

            System.out.println(
                    "      Reconstructed Route : "
                            + result.getPath()
            );

        } else {

            System.out.println(
                    "FAIL - Test 3: Route Reconstruction"
            );
        }
    }


    // ==================================================
    // TEST 4 - INVALID DESTINATION
    // ==================================================

    static void testInvalidDestination() {

        totalTests++;

        Graph graph = createTestGraph();

        Node source =
                new Node(1, "A");

        Node invalidDestination =
                new Node(99, "X");

        Dijkstra dijkstra = new Dijkstra();

        RoutingMetrics result =
                dijkstra.shortestPath(
                        graph,
                        source,
                        invalidDestination
                );

        if (result == null) {

            passedTests++;

            System.out.println(
                    "PASS - Test 4: Invalid Destination"
            );

        } else {

            System.out.println(
                    "FAIL - Test 4: Invalid Destination"
            );
        }
    }


    // ==================================================
    // TEST 5 - NO PATH CASE
    // ==================================================

    static void testNoPath() {

        totalTests++;

        Graph graph = new Graph();

        Node A = new Node(1, "A");
        Node B = new Node(2, "B");

        Node C = new Node(3, "C");
        Node D = new Node(4, "D");

        // First disconnected component
        graph.addEdge(A, B, 5);

        // Second disconnected component
        graph.addEdge(C, D, 2);

        Dijkstra dijkstra = new Dijkstra();

        RoutingMetrics result =
                dijkstra.shortestPath(
                        graph,
                        A,
                        D
                );

        if (result == null) {

            passedTests++;

            System.out.println(
                    "PASS - Test 5: No Path Case"
            );

        } else {

            System.out.println(
                    "FAIL - Test 5: No Path Case"
            );
        }
    }


    // ==================================================
    // TEST GRAPH
    // ==================================================

    static Graph createTestGraph() {

        Graph graph = new Graph();

        Node A = new Node(1, "A");
        Node B = new Node(2, "B");
        Node C = new Node(3, "C");
        Node D = new Node(4, "D");

        /*
             5          3          2

        A ------ B -------- C -------- D

        A -> B -> C -> D
        = 5 + 3 + 2
        = 10
        */

        graph.addEdge(A, B, 5);
        graph.addEdge(B, C, 3);
        graph.addEdge(C, D, 2);

        // Longer alternative routes
        graph.addEdge(A, C, 20);
        graph.addEdge(B, D, 20);

        return graph;
    }
}