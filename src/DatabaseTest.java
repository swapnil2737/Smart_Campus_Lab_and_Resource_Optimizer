import graph.CampusGraph;
import graph.Graph;
import model.Node;
import model.Request;
import model.Response;
import model.RoutingMetrics;
import service.RoutingService;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.ArrayList;
import java.util.Scanner;

public class DatabaseTest {

    public static void main(String[] args) {

        String url = "jdbc:mysql://localhost:3306/smart_campus_lab";
        String username = "root";
        String password = "saniya28";

        Scanner scanner = new Scanner(System.in);

        System.out.println("================================================");
        System.out.println("       SMART CAMPUS LAB MANAGEMENT SYSTEM");
        System.out.println("================================================");

        System.out.print("Enter Student ID: ");
        String studentId = scanner.nextLine();

        String query =
                "SELECT " +
                        "u.employee_student_id AS student_id, " +
                        "u.full_name AS student_name, " +
                        "b.batch_name AS batch, " +
                        "bs.student_position AS student_position, " +
                        "ws.schedule_id, " +
                        "ws.subject_code, " +
                        "ws.subject_name, " +
                        "ws.day_of_week, " +
                        "ws.start_time, " +
                        "ws.end_time, " +
                        "l.lab_name " +
                        "FROM users u " +
                        "JOIN batch_students bs ON u.user_id = bs.user_id " +
                        "JOIN batches b ON bs.batch_id = b.batch_id " +
                        "JOIN weekly_schedules ws ON b.batch_id = ws.batch_id " +
                        "JOIN labs l ON ws.lab_id = l.lab_id " +
                        "WHERE u.employee_student_id = ? " +
                        "ORDER BY " +
                        "FIELD(ws.day_of_week, " +
                        "'MONDAY', 'TUESDAY', 'WEDNESDAY', " +
                        "'THURSDAY', 'FRIDAY', 'SATURDAY'), " +
                        "ws.start_time";

        try {

            Connection connection =
                    DriverManager.getConnection(url, username, password);

            PreparedStatement statement =
                    connection.prepareStatement(query);

            statement.setString(1, studentId);

            ResultSet resultSet = statement.executeQuery();

            boolean studentFound = false;

            String studentName = "";
            String batch = "";
            int studentPosition = 0;

            ArrayList<Long> scheduleIds = new ArrayList<>();

            while (resultSet.next()) {

                if (!studentFound) {

                    studentFound = true;

                    studentName =
                            resultSet.getString("student_name");

                    batch =
                            resultSet.getString("batch");

                    studentPosition =
                            resultSet.getInt("student_position");

                    System.out.println();
                    System.out.println("STUDENT INFORMATION");
                    System.out.println("-----------------------------------------------");

                    System.out.println("Student ID       : "
                            + resultSet.getString("student_id"));

                    System.out.println("Student Name     : "
                            + studentName);

                    System.out.println("Batch            : "
                            + batch);

                    System.out.println("Student Position : "
                            + studentPosition);

                    System.out.println();
                    System.out.println("CLASS INFORMATION");
                    System.out.println("-----------------------------------------------");
                }

                long scheduleId =
                        resultSet.getLong("schedule_id");

                scheduleIds.add(scheduleId);

                System.out.println(
                        scheduleIds.size() + ". "
                                + resultSet.getString("day_of_week")
                                + " | "
                                + resultSet.getString("subject_name")
                                + " | "
                                + resultSet.getTime("start_time")
                                + " - "
                                + resultSet.getTime("end_time")
                                + " | "
                                + resultSet.getString("lab_name")
                );
            }

            if (!studentFound) {

                System.out.println();
                System.out.println(
                        "Student ID '" + studentId + "' not found."
                );

                resultSet.close();
                statement.close();
                connection.close();
                scanner.close();
                return;
            }

            // -----------------------------------------------
            // CLASS SELECTION
            // -----------------------------------------------

            System.out.println();
            System.out.print("Select class number: ");

            int choice = scanner.nextInt();

            if (choice < 1 || choice > scheduleIds.size()) {

                System.out.println("Invalid class selection.");

                resultSet.close();
                statement.close();
                connection.close();
                scanner.close();
                return;
            }

            long selectedScheduleId =
                    scheduleIds.get(choice - 1);

            // -----------------------------------------------
// SELECTED CLASS INFORMATION
// -----------------------------------------------

            String selectedSubject = "";
            String selectedDay = "";
            String selectedStartTime = "";
            String selectedEndTime = "";
            String selectedLab = "";

            String classQuery =
                    "SELECT " +
                            "ws.subject_name, " +
                            "ws.day_of_week, " +
                            "ws.start_time, " +
                            "ws.end_time, " +
                            "l.lab_name " +
                            "FROM weekly_schedules ws " +
                            "JOIN labs l ON ws.lab_id = l.lab_id " +
                            "WHERE ws.schedule_id = ?";

            PreparedStatement classStatement =
                    connection.prepareStatement(classQuery);

            classStatement.setLong(1, selectedScheduleId);

            ResultSet classResult =
                    classStatement.executeQuery();

            if (classResult.next()) {

                selectedSubject =
                        classResult.getString("subject_name");

                selectedDay =
                        classResult.getString("day_of_week");

                selectedStartTime =
                        classResult.getTime("start_time").toString();

                selectedEndTime =
                        classResult.getTime("end_time").toString();

                selectedLab =
                        classResult.getString("lab_name");
            }

            classResult.close();
            classStatement.close();

            System.out.println();
            System.out.println("SELECTED CLASS INFORMATION");
            System.out.println("-----------------------------------------------");

            System.out.println("Subject          : "
                    + selectedSubject);

            System.out.println("Day              : "
                    + selectedDay);

            System.out.println("Time             : "
                    + selectedStartTime.substring(0, 5)
                    + " - "
                    + selectedEndTime.substring(0, 5));

            System.out.println("Assigned Lab     : "
                    + selectedLab);

            // -----------------------------------------------
// ROUTING INFORMATION
// -----------------------------------------------

            Graph campusGraph = CampusGraph.createGraph(connection);

            Node sourceNode = null;
            Node destinationNode = null;

// Source = Apple Lab
            for (Node node : campusGraph.getNodes()) {
                if (node.getName().equalsIgnoreCase("Apple Lab")) {
                    sourceNode = node;
                }

                if (node.getName().equalsIgnoreCase(selectedLab)) {
                    destinationNode = node;
                }
            }

// Check whether both nodes exist
            if (sourceNode == null || destinationNode == null) {

                System.out.println();
                System.out.println("ROUTING INFORMATION");
                System.out.println("-----------------------------------------------");
                System.out.println("Route            : NOT AVAILABLE");

            } else {

                Request routingRequest =
                        new Request(sourceNode, destinationNode);

                RoutingService routingService =
                        new RoutingService();

                Response routingResponse =
                        routingService.findRoute(
                                campusGraph,
                                routingRequest
                        );

                System.out.println();
                System.out.println("ROUTING INFORMATION");
                System.out.println("-----------------------------------------------");

                if (routingResponse.isSuccess()) {

                    RoutingMetrics metrics =
                            routingResponse.getMetrics();

                    StringBuilder route =
                            new StringBuilder();

                    for (int i = 0;
                         i < metrics.getPath().size();
                         i++) {

                        route.append(
                                metrics.getPath().get(i).getName()
                        );

                        if (i < metrics.getPath().size() - 1) {
                            route.append(" -> ");
                        }
                    }

                    System.out.println("Algorithm        : "
                            + metrics.getAlgorithm());

                    System.out.println("Route            : "
                            + route);

                    System.out.println("Distance         : "
                            + metrics.getPathCost()
                            + " meters");

                    System.out.println("Nodes Visited    : "
                            + metrics.getNodesVisited());

                    System.out.println("Computation Time : "
                            + metrics.getComputationTime()
                            + " ms");

                    System.out.println("Latency          : "
                            + metrics.getEstimatedLatency()
                            + " ms");

                } else {

                    System.out.println("Route            : NOT FOUND");
                }
            }

            // -----------------------------------------------
            // RESOURCE / PC ALLOCATION
            // -----------------------------------------------

            String resourceQuery =
                    "SELECT " +
                            "r.asset_code, " +
                            "r.resource_name, " +
                            "r.status " +
                            "FROM schedule_resources sr " +
                            "JOIN resources r " +
                            "ON sr.resource_id = r.resource_id " +
                            "WHERE sr.schedule_id = ? " +
                            "AND sr.student_position = ?";

            PreparedStatement resourceStatement =
                    connection.prepareStatement(resourceQuery);

            resourceStatement.setLong(1, selectedScheduleId);
            resourceStatement.setInt(2, studentPosition);

            ResultSet resourceResult =
                    resourceStatement.executeQuery();

            System.out.println();
            System.out.println("RESOURCE ALLOCATION");
            System.out.println("-----------------------------------------------");

            if (resourceResult.next()) {

                System.out.println("Computer         : "
                        + resourceResult.getString("asset_code"));

                System.out.println("Resource Name    : "
                        + resourceResult.getString("resource_name"));

                System.out.println("Status           : "
                        + resourceResult.getString("status"));

            } else {

                System.out.println(
                        "No computer assigned for this class."
                );
            }

            resourceResult.close();
            resourceStatement.close();
            resultSet.close();
            statement.close();
            connection.close();

        } catch (Exception e) {

            System.out.println();
            System.out.println("DATABASE READ FAILED");
            e.printStackTrace();
        }

        scanner.close();
    }
}