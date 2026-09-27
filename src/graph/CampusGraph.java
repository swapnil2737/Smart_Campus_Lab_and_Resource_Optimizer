package graph;

import model.Node;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

public class CampusGraph {

    public static Graph createGraph(Connection connection) throws SQLException {

        Graph graph = new Graph();

        // Store Node objects using their lab_id
        Map<Integer, Node> nodesById = new HashMap<>();

        // =====================================================
        // 1. LOAD LABS FROM DATABASE
        // =====================================================

        String labQuery =
                "SELECT lab_id, lab_name " +
                        "FROM labs " +
                        "WHERE status = 'ACTIVE' " +
                        "ORDER BY lab_id";

        try (PreparedStatement statement = connection.prepareStatement(labQuery);
             ResultSet resultSet = statement.executeQuery()) {

            while (resultSet.next()) {

                int labId = resultSet.getInt("lab_id");
                String labName = resultSet.getString("lab_name");

                Node labNode = new Node(labId, labName);

                nodesById.put(labId, labNode);
                graph.addNode(labNode);
            }
        }

        // =====================================================
        // 2. LOAD LAB CONNECTIONS FROM DATABASE
        // =====================================================

        /*
         * Team D's database contains both directions:
         *
         * Apple Lab -> L1
         * L1 -> Apple Lab
         *
         * But Graph.addEdge() already creates both directions.
         *
         * Therefore we load only one direction using:
         *
         * source_lab_id < destination_lab_id
         *
         * This prevents duplicate edges.
         */

        String connectionQuery =
                "SELECT source_lab_id, destination_lab_id, distance_meters " +
                        "FROM lab_connections " +
                        "WHERE status = 'ACTIVE' " +
                        "AND source_lab_id < destination_lab_id " +
                        "ORDER BY connection_id";

        try (PreparedStatement statement = connection.prepareStatement(connectionQuery);
             ResultSet resultSet = statement.executeQuery()) {

            while (resultSet.next()) {

                int sourceId = resultSet.getInt("source_lab_id");
                int destinationId = resultSet.getInt("destination_lab_id");
                int distance = resultSet.getInt("distance_meters");

                Node sourceNode = nodesById.get(sourceId);
                Node destinationNode = nodesById.get(destinationId);

                if (sourceNode != null && destinationNode != null) {

                    graph.addEdge(
                            sourceNode,
                            destinationNode,
                            distance
                    );
                }
            }
        }

        return graph;
    }
}