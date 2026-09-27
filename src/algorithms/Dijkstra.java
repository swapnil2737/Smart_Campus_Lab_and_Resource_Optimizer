package algorithms;

import graph.Graph;
import model.Edge;
import model.Node;
import model.RoutingMetrics;

import java.util.*;

public class Dijkstra {

    public RoutingMetrics shortestPath(
            Graph graph,
            Node source,
            Node destination) {

        long startTime = System.currentTimeMillis();

        Map<Node, Integer> distance = new HashMap<>();
        Map<Node, Node> previous = new HashMap<>();

        Set<Node> visited = new HashSet<>();

        // ----------------------------------------
        // Initialize distances
        // ----------------------------------------

        for (Node node : graph.getNodes()) {
            distance.put(node, Integer.MAX_VALUE);
        }

        distance.put(source, 0);

        // ----------------------------------------
        // Priority Queue
        // ----------------------------------------

        PriorityQueue<Node> pq =
                new PriorityQueue<>(
                        Comparator.comparingInt(distance::get)
                );

        pq.offer(source);

        // ----------------------------------------
        // Dijkstra algorithm
        // ----------------------------------------

        while (!pq.isEmpty()) {

            Node current = pq.poll();

            if (visited.contains(current)) {
                continue;
            }

            visited.add(current);

            // Destination reached
            if (current.equals(destination)) {
                break;
            }

            for (Edge edge : graph.getNeighbors(current)) {

                Node neighbour = edge.getDestination();

                if (distance.get(current) == Integer.MAX_VALUE) {
                    continue;
                }

                int newDistance =
                        distance.get(current)
                                + edge.getDistance();

                if (newDistance < distance.get(neighbour)) {

                    distance.put(neighbour, newDistance);

                    previous.put(neighbour, current);

                    pq.offer(neighbour);
                }
            }
        }

        // ----------------------------------------
        // Check if destination is unreachable
        // ----------------------------------------

        if (!distance.containsKey(destination)
                || distance.get(destination) == Integer.MAX_VALUE) {

            return null;
        }

        // ----------------------------------------
        // Build path
        // ----------------------------------------

        List<Node> path = new ArrayList<>();

        Node current = destination;

        while (current != null) {

            path.add(current);

            current = previous.get(current);
        }

        Collections.reverse(path);

        // ----------------------------------------
        // Calculate metrics
        // ----------------------------------------

        long endTime = System.currentTimeMillis();

        double pathCost = distance.get(destination);

        double estimatedLatency = pathCost * 10.0;

        long computationTime =
                endTime - startTime;

        int nodesVisited =
                visited.size();

        // ----------------------------------------
        // Return result
        // ----------------------------------------

        return new RoutingMetrics(
                path,
                pathCost,
                estimatedLatency,
                computationTime,
                nodesVisited,
                "Dijkstra"
        );
    }
}