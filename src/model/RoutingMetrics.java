package model;

import java.util.List;

public class RoutingMetrics {

    private List<Node> path;
    private double pathCost;
    private double estimatedLatency;
    private long computationTime;
    private int nodesVisited;
    private String algorithm;

    public RoutingMetrics(
            List<Node> path,
            double pathCost,
            double estimatedLatency,
            long computationTime,
            int nodesVisited,
            String algorithm) {

        this.path = path;
        this.pathCost = pathCost;
        this.estimatedLatency = estimatedLatency;
        this.computationTime = computationTime;
        this.nodesVisited = nodesVisited;
        this.algorithm = algorithm;
    }

    public List<Node> getPath() {
        return path;
    }

    public double getPathCost() {
        return pathCost;
    }

    public double getEstimatedLatency() {
        return estimatedLatency;
    }

    public long getComputationTime() {
        return computationTime;
    }

    public int getNodesVisited() {
        return nodesVisited;
    }

    public String getAlgorithm() {
        return algorithm;
    }

    @Override
    public String toString() {

        StringBuilder route = new StringBuilder();

        for (int i = 0; i < path.size(); i++) {

            route.append(path.get(i).getName());

            if (i < path.size() - 1) {
                route.append(" -> ");
            }
        }

        return
                "\n========== ROUTING RESULT ==========\n" +
                        "Route              : " + route + "\n" +
                        "Path Cost          : " + pathCost + " meters\n" +
                        "Estimated Latency  : " + estimatedLatency + " ms\n" +
                        "Computation Time   : " + computationTime + " ms\n" +
                        "Nodes Visited      : " + nodesVisited + "\n" +
                        "Algorithm          : " + algorithm + "\n" +
                        "====================================";
    }
}