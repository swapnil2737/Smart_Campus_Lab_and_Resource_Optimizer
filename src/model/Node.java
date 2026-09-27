package model;

public class Node {

    private int id;
    private String name;

    public Node(int id, String name) {

        this.id = id;
        this.name = name;
    }

    public int getId() {

        return id;
    }

    public String getName() {

        return name;
    }

    @Override
    public String toString() {

        return name;
    }

    @Override
    public boolean equals(Object obj) {

        if (this == obj) {
            return true;
        }

        if (!(obj instanceof Node)) {
            return false;
        }

        Node other = (Node) obj;

        return this.id == other.id;
    }

    @Override
    public int hashCode() {

        return Integer.hashCode(id);
    }
}