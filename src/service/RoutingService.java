package service;

import algorithms.Dijkstra;
import graph.Graph;
import model.Node;
import model.Request;
import model.Response;
import model.RoutingMetrics;

public class RoutingService {

    private Dijkstra dijkstra;

    public RoutingService() {
        dijkstra = new Dijkstra();
    }

    public Response findRoute(Graph graph, Request request) {

        // ----------------------------------------
        // 1. Validate request
        // ----------------------------------------

        if (request == null) {
            return new Response(
                    false,
                    "Route request is null",
                    null
            );
        }

        Node source = request.getSource();
        Node destination = request.getDestination();

        if (source == null || destination == null) {
            return new Response(
                    false,
                    "Source or destination is missing",
                    null
            );
        }

        // ----------------------------------------
        // 2. Calculate shortest path
        // ----------------------------------------

        RoutingMetrics metrics =
                dijkstra.shortestPath(
                        graph,
                        source,
                        destination
                );

        // ----------------------------------------
        // 3. Check result
        // ----------------------------------------

        if (metrics == null) {

            return new Response(
                    false,
                    "No route found between source and destination",
                    null
            );
        }

        // ----------------------------------------
        // 4. Return routing result
        // ----------------------------------------

        return new Response(
                true,
                "Shortest route calculated successfully",
                metrics
        );
    }
}