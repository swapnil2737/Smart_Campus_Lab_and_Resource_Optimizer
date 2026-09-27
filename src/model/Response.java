package model;

public class Response {

    private boolean success;
    private String message;
    private RoutingMetrics metrics;

    public Response(
            boolean success,
            String message,
            RoutingMetrics metrics) {

        this.success = success;
        this.message = message;
        this.metrics = metrics;
    }

    public boolean isSuccess() {
        return success;
    }

    public String getMessage() {
        return message;
    }

    public RoutingMetrics getMetrics() {
        return metrics;
    }

    @Override
    public String toString() {

        String result =
                "\n========== ROUTING RESPONSE ==========\n" +
                        "Success : " + success + "\n" +
                        "Message : " + message + "\n";

        if (metrics != null) {
            result += metrics.toString();
        }

        result += "\n======================================";

        return result;
    }
}