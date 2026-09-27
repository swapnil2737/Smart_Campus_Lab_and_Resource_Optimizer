package model;

public class Request {

    private Node source;
    private Node destination;

    public Request(Node source, Node destination) {
        this.source = source;
        this.destination = destination;
    }

    public Node getSource() {
        return source;
    }

    public Node getDestination() {
        return destination;
    }
}