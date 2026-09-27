package model;

import java.time.LocalDateTime;

public class GraphVersion {

    private int version;
    private LocalDateTime updatedTime;

    public GraphVersion(int version) {
        this.version = version;
        this.updatedTime = LocalDateTime.now();
    }

    public int getVersion() {
        return version;
    }

    public LocalDateTime getUpdatedTime() {
        return updatedTime;
    }

    @Override
    public String toString() {
        return "Graph Version : " + version +
                "\nUpdated : " + updatedTime;
    }
}