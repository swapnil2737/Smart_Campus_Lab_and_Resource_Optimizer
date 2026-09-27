package graph;

import model.Edge;
import model.Node;

import java.util.*;

public class Graph {

    private Map<Node, List<Edge>> adjacencyList;

    public Graph() {
        adjacencyList = new HashMap<>();
    }

    public void addNode(Node node) {

        adjacencyList.putIfAbsent(
                node,
                new ArrayList<>()
        );
    }

    public void addEdge(
            Node source,
            Node destination,
            int distance) {

        addNode(source);
        addNode(destination);

        adjacencyList
                .get(source)
                .add(new Edge(destination, distance));

        adjacencyList
                .get(destination)
                .add(new Edge(source, distance));
    }

    public List<Edge> getNeighbors(Node node) {

        return adjacencyList.getOrDefault(
                node,
                new ArrayList<>()
        );
    }

    public Set<Node> getNodes() {

        return adjacencyList.keySet();
    }

    public Map<Node, List<Edge>> getAdjacencyList() {

        return adjacencyList;
    }
}