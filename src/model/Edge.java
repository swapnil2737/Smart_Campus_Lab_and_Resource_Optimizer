package model;

public class Edge {


    private Node destination;
    private int distance;

    public Edge( Node destination, int distance) {


        this.destination = destination;
        this.distance = distance;
    }

    public Node getDestination() {
        return destination;
    }

    public int getDistance() {
        return distance;
    }
}