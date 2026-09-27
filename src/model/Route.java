package model;

import java.util.List;

public class Route {

    private List<Node> path;
    private double distance;
    private String algorithm;

    public Route(List<Node> path, double distance, String algorithm) {
        this.path = path;
        this.distance = distance;
        this.algorithm = algorithm;
    }

    public List<Node> getPath() {
        return path;
    }

    public double getDistance() {
        return distance;
    }

    public String getAlgorithm() {
        return algorithm;
    }

    @Override
    public String toString() {

        StringBuilder result = new StringBuilder();

        result.append("Route: ");

        for (int i = 0; i < path.size(); i++) {

            result.append(path.get(i).getName());

            if (i < path.size() - 1) {
                result.append(" -> ");
            }
        }

        result.append("\n");
        result.append("Distance: ").append(distance).append(" meters\n");
        result.append("Algorithm: ").append(algorithm);

        return result.toString();
    }
}